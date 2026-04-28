import { supabase } from '../lib/supabaseClient';
import {
  emptyPersonalInfo,
  emptyCareerObjective,
  emptySkills,
  emptyProfessionalSummary,
  emptySummary,
} from '../constants/resumeFields';

// ────────────────────────────────────────────────────────────────────────────
// Phase 5: normalized-only.
//
// The `resumes.data` JSONB column has been retired. All resume content lives in
// 11 normalized child tables (personal_info, education, work_experience,
// bullet_points, skills, projects, certifications, volunteer_experience,
// publications, awards, professional_summary) plus the metadata cols on the
// parent `resumes` row (target_*, seniority_level, resume_format, ...).
//
// Reads: assemble from normalized rows; sections with no rows return empty
// defaults. There is no JSONB fallback.
//
// Writes: createResume INSERTs the parent + seeds 1:1 child rows; updateResume
// UPDATEs the parent metadata cols and per-section helpers handle the children.
// A normalized write failure aggregates and re-throws so the caller surfaces a
// save error. There is no JSONB rollback because there is no JSONB to roll
// back to.
//
// Public API of this module is unchanged: same function names, same signatures,
// same return shapes.
// ────────────────────────────────────────────────────────────────────────────

const RESUME_SELECT =
  'id, name, created_at, updated_at, template_id, ats_score, status, current_step, last_exported_at, ' +
  'target_job_title, target_industry, seniority_level, job_description_text, job_description_url, ' +
  'resume_format, resume_length';

// ────────────────────────────────────────────────────────────────────────────
// Per-resume write serialization — prevents auto-save races where two
// concurrent updateResume calls for the same resume id interleave their
// DELETE-then-INSERT sequences and lose rows. We chain promises per id so
// only one write at a time can run for any given resume.
// ────────────────────────────────────────────────────────────────────────────
const writeChainByResumeId = new Map();
function serializeResumeWrite(resumeId, fn) {
  const prev = writeChainByResumeId.get(resumeId) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  writeChainByResumeId.set(resumeId, next);
  // Cleanup when this is the last in chain. We attach cleanup via a swallowed
  // catch chain so that if `next` rejects, the cleanup branch does not raise
  // an unhandled rejection — the original `next` is still returned to the
  // caller, who will await/catch it normally.
  const cleanup = () => {
    if (writeChainByResumeId.get(resumeId) === next) {
      writeChainByResumeId.delete(resumeId);
    }
  };
  next.then(cleanup, cleanup);
  return next;
}

// ────────────────────────────────────────────────────────────────────────────
// Per-section mappers — pure functions converting normalized rows to the
// in-app shape (inverse of the normalized writes below).
// ────────────────────────────────────────────────────────────────────────────

function mapPersonalInfoRow(row) {
  if (!row) return null;
  return {
    fullName: row.full_name ?? '',
    email: row.professional_email ?? '',
    phone: row.phone_number ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    targetCountry: row.target_country_region ?? '',
    linkedinUrl: row.linkedin_url ?? '',
    portfolioUrl: row.portfolio_url ?? '',
  };
}

function mapCareerObjectiveFromResumeRow(row) {
  if (!row) return null;
  // The careerObjective fields live on the parent resumes row as dedicated
  // metadata columns. After Phase 5 these are the source of truth — if every
  // field is empty, the user has cleared the section.
  const co = {
    targetJobTitle: row.target_job_title ?? '',
    targetIndustry: row.target_industry ?? '',
    seniorityLevel: row.seniority_level ?? '',
    jobDescriptionText: row.job_description_text ?? '',
    jobDescriptionUrl: row.job_description_url ?? '',
  };
  const hasAny = Object.values(co).some((v) => v !== '' && v !== null && v !== undefined);
  return hasAny ? co : null;
}

function mapSummarySettingsFromResumeRow(row) {
  if (!row) return null;
  const fmt = row.resume_format;
  const len = row.resume_length;
  if (!fmt && !len) return null;
  return {
    resumeFormatType: fmt ?? 'chronological',
    resumeLength: len ?? 'one_page',
  };
}

function sortByDisplayOrder(rows) {
  return [...(rows || [])].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );
}

function mapEducationRows(rows) {
  return sortByDisplayOrder(rows).map((e) => ({
    institutionName: e.institution_name ?? '',
    degreeType: e.degree_type ?? '',
    fieldOfStudy: e.field_of_study ?? '',
    graduationMonth: e.graduation_month != null ? String(e.graduation_month) : '',
    graduationYear: e.graduation_year != null ? String(e.graduation_year) : '',
    currentlyEnrolled: !!e.currently_enrolled,
    gpa: e.gpa != null ? String(e.gpa) : '',
    honorsAwards: e.honors_awards ?? '',
    relevantCoursework: e.relevant_coursework ?? '',
    thesisTitle: e.thesis_title ?? '',
    displayOrder: e.display_order ?? 0,
  }));
}

function mapWorkExperienceRows(rows, bulletsByExperienceId) {
  return sortByDisplayOrder(rows).map((w) => {
    const bullets = sortByDisplayOrder(bulletsByExperienceId[w.id] || []);
    const bulletPoints = bullets.map((b) => {
      // If AI text is being used and present, surface it; otherwise use raw_text.
      // The current in-app shape is a flat string array.
      if (b.is_using_ai && b.ai_text) return b.ai_text;
      return b.raw_text ?? '';
    });
    return {
      companyName: w.company_name ?? '',
      jobTitle: w.job_title ?? '',
      location: w.location ?? '',
      isRemote: !!w.is_remote,
      startMonth: w.start_month != null ? String(w.start_month) : '',
      startYear: w.start_year != null ? String(w.start_year) : '',
      endMonth: w.end_month != null ? String(w.end_month) : '',
      endYear: w.end_year != null ? String(w.end_year) : '',
      isCurrentRole: !!w.is_current_role,
      jobDescriptionRaw: w.job_description_raw ?? '',
      bulletPoints,
      employmentGapExplanation: '',
    };
  });
}

function mapSkillsRows(rows) {
  // Group rows by category back into the object shape the app expects.
  const out = {
    technicalSkills: [],
    programmingLanguages: [],
    toolsSoftware: [],
    languageSkills: [],
    domainSpecificSkills: [],
  };
  const categoryToKey = {
    technical: 'technicalSkills',
    programming: 'programmingLanguages',
    tools: 'toolsSoftware',
    domain: 'domainSpecificSkills',
    // 'language' is special-cased below
  };
  const sorted = sortByDisplayOrder(rows);
  for (const row of sorted) {
    if (row.category === 'language') {
      out.languageSkills.push({
        name: row.skill_name ?? '',
        proficiency: row.proficiency_level ?? '',
      });
      continue;
    }
    const key = categoryToKey[row.category];
    if (!key) continue;
    if (row.skill_name) out[key].push(row.skill_name);
  }
  return out;
}

function mapProjectRows(rows) {
  return sortByDisplayOrder(rows).map((p) => {
    let description = p.description ?? '';
    let associatedInstitution = '';
    // The normalized `description` column may carry a `[institution] ` prefix
    // because the schema has no dedicated column for institution. Reverse it.
    // Known limitation: any project whose description legitimately starts
    // with `[Word]` (e.g. `[Note]`) will be misread; users may need manual cleanup.
    const match = /^\[([^\]]+)\](?:\s+(.*))?$/s.exec(description);
    if (match) {
      associatedInstitution = match[1];
      description = match[2] ?? '';
    }
    let technologiesUsed = [];
    if (Array.isArray(p.technologies_used)) {
      technologiesUsed = p.technologies_used;
    } else if (typeof p.technologies_used === 'string') {
      try {
        const parsed = JSON.parse(p.technologies_used);
        if (Array.isArray(parsed)) technologiesUsed = parsed;
      } catch (_) {
        /* ignore */
      }
    }
    return {
      projectTitle: p.project_title ?? '',
      associatedInstitution,
      projectDescription: description,
      technologiesUsed,
      methodologiesUsed: [],
      projectOutcome: p.outcome ?? '',
      projectUrl: p.project_url ?? '',
    };
  });
}

function mapCertificationRows(rows) {
  return sortByDisplayOrder(rows).map((c) => ({
    certificationName: c.certification_name ?? '',
    issuingBody: c.issuing_body ?? '',
    dateObtained: c.date_obtained ?? '',
    credentialId: c.credential_id ?? '',
  }));
}

function mapVolunteerRows(rows) {
  return sortByDisplayOrder(rows).map((v) => ({
    organizationName: v.organization_name ?? '',
    role: v.role ?? '',
    startDate: v.start_date ?? '',
    endDate: v.end_date ?? '',
    description: v.description ?? '',
  }));
}

function mapPublicationRows(rows) {
  return sortByDisplayOrder(rows).map((p) => {
    let authors = [];
    if (Array.isArray(p.authors)) {
      authors = p.authors;
    } else if (typeof p.authors === 'string') {
      try {
        const parsed = JSON.parse(p.authors);
        if (Array.isArray(parsed)) authors = parsed;
      } catch (_) {
        /* ignore */
      }
    }
    return {
      publicationTitle: p.publication_title ?? '',
      authors,
      publicationName: p.publication_name ?? '',
      year: p.year != null ? String(p.year) : '',
      doiUrl: p.doi_url ?? '',
    };
  });
}

function mapAwardRows(rows) {
  return sortByDisplayOrder(rows).map((a) => ({
    awardName: a.award_name ?? '',
    awardingBody: a.awarding_body ?? '',
    dateReceived: a.date_received ?? '',
    description: a.description ?? '',
  }));
}

function mapProfessionalSummaryRow(row) {
  if (!row) return null;
  return {
    summaryText: row.summary_text ?? '',
    isAiGenerated: !!row.is_ai_generated,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Pure assembler — takes the parent resume row + an object of normalized
// child rows and produces the in-app resume shape. After Phase 5 there is no
// JSONB fallback — sections with no rows return empty defaults.
//
// `childRowsBySection` shape:
//   {
//     personalInfo: row | null,
//     education:    [...],
//     workExperience: [...],
//     bulletsByExperienceId: { [experienceId]: [...] },
//     skills:       [...],
//     projects:     [...],
//     certifications: [...],
//     volunteerExperience: [...],
//     publications: [...],
//     awards:       [...],
//     professionalSummary: row | null,
//   }
// ────────────────────────────────────────────────────────────────────────────

export function assembleResumeFromNormalized(resumeRow, childRowsBySection = {}) {
  // Top-level metadata columns flatten onto the resume shape directly.
  const base = {
    id: resumeRow.id,
    name: resumeRow.name,
    createdAt: resumeRow.created_at,
    updatedAt: resumeRow.updated_at,
    templateId: resumeRow.template_id ?? 'modern',
    atsScore: resumeRow.ats_score ?? null,
    status: resumeRow.status ?? 'draft',
    currentStep: resumeRow.current_step ?? 1,
    lastExportedAt: resumeRow.last_exported_at ?? null,
  };

  const {
    personalInfo: piRow,
    education = [],
    workExperience = [],
    bulletsByExperienceId = {},
    skills = [],
    projects = [],
    certifications = [],
    volunteerExperience = [],
    publications = [],
    awards = [],
    professionalSummary: psRow,
  } = childRowsBySection;

  // ── personalInfo (1:1) ──
  base.personalInfo = mapPersonalInfoRow(piRow) ?? { ...emptyPersonalInfo };

  // ── careerObjective (lives on resumes metadata cols) ──
  base.careerObjective =
    mapCareerObjectiveFromResumeRow(resumeRow) ?? { ...emptyCareerObjective };

  // ── summary settings (resume_format / resume_length on resumes) ──
  const summarySettings = mapSummarySettingsFromResumeRow(resumeRow);
  base.summary = summarySettings
    ? { ...emptySummary, ...summarySettings }
    : { ...emptySummary };

  // ── education (repeatable) ──
  base.education = education.length > 0 ? mapEducationRows(education) : [];

  // ── workExperience + bullet_points ──
  base.workExperience =
    workExperience.length > 0
      ? mapWorkExperienceRows(workExperience, bulletsByExperienceId)
      : [];

  // ── skills (repeatable, grouped by category) ──
  base.skills = skills.length > 0 ? mapSkillsRows(skills) : { ...emptySkills };

  // ── projects ──
  base.projects = projects.length > 0 ? mapProjectRows(projects) : [];

  // ── certifications ──
  base.certifications =
    certifications.length > 0 ? mapCertificationRows(certifications) : [];

  // ── volunteerExperience ──
  base.volunteerExperience =
    volunteerExperience.length > 0 ? mapVolunteerRows(volunteerExperience) : [];

  // ── publications ──
  base.publications =
    publications.length > 0 ? mapPublicationRows(publications) : [];

  // ── awards ──
  base.awards = awards.length > 0 ? mapAwardRows(awards) : [];

  // ── professionalSummary (1:1) ──
  base.professionalSummary =
    mapProfessionalSummaryRow(psRow) ?? { ...emptyProfessionalSummary };

  return base;
}

// ────────────────────────────────────────────────────────────────────────────
// Supabase fetch helpers — one per child table. Each returns [] on error so
// a failed read of one section does not blow away the whole resume; the
// section will fall through to the empty default in the assembler.
// ────────────────────────────────────────────────────────────────────────────

async function fetchChildRowsForResume(resumeId) {
  const safeRows = (promise) =>
    promise.then(({ data, error }) => (error ? [] : data || []));
  const safeRow = (promise) =>
    promise.then(({ data, error }) => (error ? null : data || null));

  const [
    personalInfo,
    education,
    workExperience,
    skills,
    projects,
    certifications,
    volunteerExperience,
    publications,
    awards,
    professionalSummary,
  ] = await Promise.all([
    safeRow(
      supabase
        .from('personal_info')
        .select('*')
        .eq('resume_id', resumeId)
        .maybeSingle()
    ),
    safeRows(supabase.from('education').select('*').eq('resume_id', resumeId)),
    safeRows(
      supabase.from('work_experience').select('*').eq('resume_id', resumeId)
    ),
    safeRows(supabase.from('skills').select('*').eq('resume_id', resumeId)),
    safeRows(supabase.from('projects').select('*').eq('resume_id', resumeId)),
    safeRows(
      supabase.from('certifications').select('*').eq('resume_id', resumeId)
    ),
    safeRows(
      supabase
        .from('volunteer_experience')
        .select('*')
        .eq('resume_id', resumeId)
    ),
    safeRows(
      supabase.from('publications').select('*').eq('resume_id', resumeId)
    ),
    safeRows(supabase.from('awards').select('*').eq('resume_id', resumeId)),
    safeRow(
      supabase
        .from('professional_summary')
        .select('*')
        .eq('resume_id', resumeId)
        .maybeSingle()
    ),
  ]);

  // Bullet points need a second fetch keyed off the work_experience IDs.
  let bulletsByExperienceId = {};
  if (workExperience.length > 0) {
    const expIds = workExperience.map((w) => w.id);
    const { data: bullets, error: bulletsErr } = await supabase
      .from('bullet_points')
      .select('*')
      .in('experience_id', expIds);
    if (!bulletsErr && bullets) {
      for (const b of bullets) {
        if (!bulletsByExperienceId[b.experience_id]) {
          bulletsByExperienceId[b.experience_id] = [];
        }
        bulletsByExperienceId[b.experience_id].push(b);
      }
    }
  }

  return {
    personalInfo,
    education,
    workExperience,
    bulletsByExperienceId,
    skills,
    projects,
    certifications,
    volunteerExperience,
    publications,
    awards,
    professionalSummary,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Per-section normalized writers.
//
//   - 1:1 sections (personal_info, professional_summary) → UPSERT on resume_id
//   - Repeatable sections → DELETE-then-INSERT
//
// All helpers RETURN nothing on success and THROW on any DB error. The orchestrator
// (runDualWriteSections) catches per-section throws, accumulates them, and re-raises
// a single aggregated error so updateResume's caller sees a save failure.
//
// IMPORTANT: callers MUST check whether the section is present in `updates`
// BEFORE invoking these — never call them with `undefined` because that would
// be interpreted as "user cleared the section" and trigger a DELETE.
// ────────────────────────────────────────────────────────────────────────────

const ALLOWED_SENIORITY = ['entry', 'mid', 'senior', 'executive'];
const ALLOWED_RESUME_FORMATS = ['chronological', 'functional', 'hybrid'];
const ALLOWED_RESUME_LENGTHS = ['one_page', 'two_page'];
const ALLOWED_DEGREES = ['ba', 'bs', 'ma', 'ms', 'mba', 'phd', 'certificate', 'other'];

// JSONB-key → spec category mapping for non-language skill rows
const SKILL_CATEGORY_MAP = [
  ['technicalSkills', 'technical'],
  ['programmingLanguages', 'programming'],
  ['toolsSoftware', 'tools'],
  ['domainSpecificSkills', 'domain'],
];

// Value coercion helpers. Form inputs can be '', null, or undefined.
// The DB expects NULL for missing values and proper types.
function cleanString(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}
function cleanInt(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
function cleanFloat(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
function cleanBool(v) {
  if (v === undefined || v === null) return false;
  return Boolean(v);
}
function cleanDate(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}
function cleanJsonArray(v) {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x !== undefined && x !== null);
}

function throwOnError(result, label) {
  if (result && result.error) {
    throw new Error(`[normalized:${label}] ${result.error.message}`);
  }
  return result;
}

async function writeNormalizedPersonalInfo(resumeId, pi) {
  // Caller only invokes us when `personalInfo` was present in `updates`, so we
  // upsert even when the value is null / non-object — that's the "user cleared
  // every field" path. Empty strings collapse to NULL via cleanString().
  const safe = pi && typeof pi === 'object' ? pi : {};
  const row = {
    resume_id: resumeId,
    full_name: cleanString(safe.fullName),
    professional_email: cleanString(safe.email),
    phone_number: cleanString(safe.phone),
    city: cleanString(safe.city),
    state: cleanString(safe.state),
    target_country_region: cleanString(safe.targetCountry),
    linkedin_url: cleanString(safe.linkedinUrl),
    portfolio_url: cleanString(safe.portfolioUrl),
  };
  throwOnError(
    await supabase
      .from('personal_info')
      .upsert(row, { onConflict: 'resume_id' }),
    'personal_info'
  );
}

async function writeNormalizedEducation(resumeId, education) {
  // Always DELETE first — empty array means "user cleared".
  throwOnError(
    await supabase.from('education').delete().eq('resume_id', resumeId),
    'education_delete'
  );
  if (!Array.isArray(education) || education.length === 0) return;

  const rows = education.map((e, i) => {
    const safe = e || {};
    const degree = cleanString(safe.degreeType);
    const validDegree = degree && ALLOWED_DEGREES.includes(degree) ? degree : null;
    const gradMonth = cleanInt(safe.graduationMonth);
    const validGradMonth =
      gradMonth !== null && gradMonth >= 1 && gradMonth <= 12 ? gradMonth : null;
    const gpa = cleanFloat(safe.gpa);
    const validGpa = gpa !== null && gpa >= 0 && gpa <= 4.0 ? gpa : null;
    return {
      resume_id: resumeId,
      institution_name: cleanString(safe.institutionName),
      degree_type: validDegree,
      field_of_study: cleanString(safe.fieldOfStudy),
      graduation_month: validGradMonth,
      graduation_year: cleanInt(safe.graduationYear),
      currently_enrolled: cleanBool(safe.currentlyEnrolled),
      gpa: validGpa,
      honors_awards: cleanString(safe.honorsAwards),
      relevant_coursework: cleanString(safe.relevantCoursework),
      thesis_title: cleanString(safe.thesisTitle),
      display_order: cleanInt(safe.displayOrder) ?? i,
    };
  });
  throwOnError(
    await supabase.from('education').insert(rows),
    'education_insert'
  );
}

async function writeNormalizedWorkExperience(resumeId, work) {
  // CASCADE on work_experience deletes child bullet_points automatically.
  throwOnError(
    await supabase.from('work_experience').delete().eq('resume_id', resumeId),
    'work_experience_delete'
  );
  if (!Array.isArray(work) || work.length === 0) return;

  const expRows = work.map((w, i) => {
    const safe = w || {};
    const startMonth = cleanInt(safe.startMonth);
    const validStart =
      startMonth !== null && startMonth >= 1 && startMonth <= 12 ? startMonth : null;
    const endMonth = cleanInt(safe.endMonth);
    const validEnd =
      endMonth !== null && endMonth >= 1 && endMonth <= 12 ? endMonth : null;
    return {
      resume_id: resumeId,
      company_name: cleanString(safe.companyName),
      job_title: cleanString(safe.jobTitle),
      location: cleanString(safe.location),
      is_remote: cleanBool(safe.isRemote),
      start_month: validStart,
      start_year: cleanInt(safe.startYear),
      end_month: validEnd,
      end_year: cleanInt(safe.endYear),
      is_current_role: cleanBool(safe.isCurrentRole),
      job_description_raw: cleanString(safe.jobDescriptionRaw),
      display_order: cleanInt(safe.displayOrder) ?? i,
    };
  });

  // INSERT...RETURNING so we can map bullets to the new IDs.
  const insertRes = throwOnError(
    await supabase.from('work_experience').insert(expRows).select('id'),
    'work_experience_insert'
  );
  const newIds = (insertRes.data || []).map((r) => r.id);

  const bulletRows = [];
  for (let i = 0; i < work.length; i++) {
    const expId = newIds[i];
    if (!expId) continue;
    const bps = Array.isArray(work[i]?.bulletPoints) ? work[i].bulletPoints : [];
    for (let j = 0; j < bps.length; j++) {
      const b = bps[j];
      let raw, ai, isUsingAi;
      if (typeof b === 'string') {
        raw = b;
        ai = null;
        isUsingAi = false;
      } else if (b && typeof b === 'object') {
        raw = cleanString(b.raw ?? b.rawText) ?? '';
        ai = cleanString(b.ai ?? b.aiText);
        isUsingAi = cleanBool(b.isUsingAi);
      } else {
        continue;
      }
      if (!raw && !ai) continue;
      bulletRows.push({
        experience_id: expId,
        raw_text: raw ?? '',
        ai_text: ai,
        is_using_ai: isUsingAi,
        display_order: j,
      });
    }
  }
  if (bulletRows.length > 0) {
    throwOnError(
      await supabase.from('bullet_points').insert(bulletRows),
      'bullet_points_insert'
    );
  }
}

async function writeNormalizedSkills(resumeId, skills) {
  throwOnError(
    await supabase.from('skills').delete().eq('resume_id', resumeId),
    'skills_delete'
  );
  if (!skills || typeof skills !== 'object') return;

  const rows = [];
  let order = 0;
  for (const [jsonKey, category] of SKILL_CATEGORY_MAP) {
    const arr = skills[jsonKey];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const name = cleanString(item);
      if (!name) continue;
      rows.push({
        resume_id: resumeId,
        category,
        skill_name: name,
        proficiency_level: null,
        display_order: order++,
      });
    }
  }
  const langs = Array.isArray(skills.languageSkills) ? skills.languageSkills : [];
  for (const item of langs) {
    let name = null;
    let proficiency = null;
    if (typeof item === 'string') {
      name = cleanString(item);
    } else if (item && typeof item === 'object') {
      name = cleanString(item.name);
      proficiency = cleanString(item.proficiency);
    }
    if (!name) continue;
    rows.push({
      resume_id: resumeId,
      category: 'language',
      skill_name: name,
      proficiency_level: proficiency,
      display_order: order++,
    });
  }
  if (rows.length > 0) {
    throwOnError(
      await supabase.from('skills').insert(rows),
      'skills_insert'
    );
  }
}

async function writeNormalizedProjects(resumeId, projects) {
  throwOnError(
    await supabase.from('projects').delete().eq('resume_id', resumeId),
    'projects_delete'
  );
  if (!Array.isArray(projects) || projects.length === 0) return;
  const rows = projects.map((p, i) => {
    const safe = p || {};
    let description = cleanString(safe.projectDescription);
    const inst = cleanString(safe.associatedInstitution);
    if (inst) {
      description = description ? `[${inst}] ${description}` : `[${inst}]`;
    }
    return {
      resume_id: resumeId,
      project_title: cleanString(safe.projectTitle),
      description,
      technologies_used: cleanJsonArray(safe.technologiesUsed),
      outcome: cleanString(safe.projectOutcome),
      project_url: cleanString(safe.projectUrl),
      display_order: i,
    };
  });
  throwOnError(
    await supabase.from('projects').insert(rows),
    'projects_insert'
  );
}

async function writeNormalizedCertifications(resumeId, certs) {
  throwOnError(
    await supabase.from('certifications').delete().eq('resume_id', resumeId),
    'certifications_delete'
  );
  if (!Array.isArray(certs) || certs.length === 0) return;
  const rows = certs.map((c, i) => {
    const safe = c || {};
    return {
      resume_id: resumeId,
      certification_name: cleanString(safe.certificationName),
      issuing_body: cleanString(safe.issuingBody),
      date_obtained: cleanDate(safe.dateObtained),
      credential_id: cleanString(safe.credentialId),
      display_order: i,
    };
  });
  throwOnError(
    await supabase.from('certifications').insert(rows),
    'certifications_insert'
  );
}

async function writeNormalizedVolunteer(resumeId, vols) {
  throwOnError(
    await supabase.from('volunteer_experience').delete().eq('resume_id', resumeId),
    'volunteer_experience_delete'
  );
  if (!Array.isArray(vols) || vols.length === 0) return;
  const rows = vols.map((v, i) => {
    const safe = v || {};
    return {
      resume_id: resumeId,
      organization_name: cleanString(safe.organizationName),
      role: cleanString(safe.role),
      start_date: cleanDate(safe.startDate),
      end_date: cleanDate(safe.endDate),
      description: cleanString(safe.description),
      display_order: i,
    };
  });
  throwOnError(
    await supabase.from('volunteer_experience').insert(rows),
    'volunteer_experience_insert'
  );
}

async function writeNormalizedPublications(resumeId, pubs) {
  throwOnError(
    await supabase.from('publications').delete().eq('resume_id', resumeId),
    'publications_delete'
  );
  if (!Array.isArray(pubs) || pubs.length === 0) return;
  const rows = pubs.map((p, i) => {
    const safe = p || {};
    return {
      resume_id: resumeId,
      publication_title: cleanString(safe.publicationTitle),
      authors: cleanJsonArray(safe.authors),
      publication_name: cleanString(safe.publicationName),
      year: cleanInt(safe.year),
      doi_url: cleanString(safe.doiUrl),
      display_order: i,
    };
  });
  throwOnError(
    await supabase.from('publications').insert(rows),
    'publications_insert'
  );
}

async function writeNormalizedAwards(resumeId, awards) {
  throwOnError(
    await supabase.from('awards').delete().eq('resume_id', resumeId),
    'awards_delete'
  );
  if (!Array.isArray(awards) || awards.length === 0) return;
  const rows = awards.map((a, i) => {
    const safe = a || {};
    return {
      resume_id: resumeId,
      award_name: cleanString(safe.awardName),
      awarding_body: cleanString(safe.awardingBody),
      date_received: cleanDate(safe.dateReceived),
      description: cleanString(safe.description),
      display_order: i,
    };
  });
  throwOnError(
    await supabase.from('awards').insert(rows),
    'awards_insert'
  );
}

async function writeNormalizedProfessionalSummary(resumeId, ps) {
  // Caller only invokes us when `professionalSummary` was explicitly present in
  // `updates`, so we always upsert — even when summaryText is empty/null. This
  // is the "user cleared the summary" path; refusing to write here would leave
  // a stale row on disk after the JSONB column was dropped.
  const safe = ps && typeof ps === 'object' ? ps : {};
  const text = cleanString(safe.summaryText);
  throwOnError(
    await supabase
      .from('professional_summary')
      .upsert(
        {
          resume_id: resumeId,
          summary_text: text,
          is_ai_generated: cleanBool(safe.isAiGenerated),
        },
        { onConflict: 'resume_id' }
      ),
    'professional_summary'
  );
}

// Resolve the "actual" section payload from `updates`, supporting both the
// flat top-level shape (e.g. updates.volunteerExperience) and the wizard's
// nested shape (e.g. updates.additionalInfo.volunteerExperience). Returns
// `undefined` when the section is genuinely absent so callers can skip writes.
function pickSection(updates, ...paths) {
  for (const path of paths) {
    const parts = path.split('.');
    let cur = updates;
    let found = true;
    for (const part of parts) {
      if (cur && typeof cur === 'object' && part in cur) {
        cur = cur[part];
      } else {
        found = false;
        break;
      }
    }
    if (found) return cur;
  }
  return undefined;
}

// Run all per-section normalized writes for a single update. Sequential to
// keep concurrency simple — Supabase requests are on the order of ~50ms each
// and 10 sections × ~50ms is well under the 1s auto-save debounce.
//
// Per-section failures are caught and accumulated. After all sections have run,
// if ANY section failed we throw a single aggregated error so the caller's
// outer try/catch surfaces a save error to the user. With JSONB gone there is
// no fallback store, so a silent failure here would mean permanent data loss.
//
// Note: resume_metadata cols (target_job_title, seniority_level, resume_format,
// resume_length, …) are written by the parent UPDATE in updateResume itself,
// not here. This function only handles the 11 child tables.
async function runDualWriteSections(resumeId, updates) {
  const sections = [
    // 1:1 sections first (cheap, single upserts)
    [
      'personal_info',
      pickSection(updates, 'personalInfo'),
      (s) => writeNormalizedPersonalInfo(resumeId, s),
    ],
    [
      'professional_summary',
      pickSection(
        updates,
        'professionalSummary',
        'reviewOptimize.professionalSummary'
      ),
      (s) => writeNormalizedProfessionalSummary(resumeId, s),
    ],
    // Repeatables — only run when section is explicitly present so we don't
    // accidentally DELETE everything when the wizard sends a partial update.
    [
      'education',
      pickSection(updates, 'education'),
      (s) => writeNormalizedEducation(resumeId, s),
    ],
    [
      'work_experience',
      pickSection(updates, 'workExperience'),
      (s) => writeNormalizedWorkExperience(resumeId, s),
    ],
    [
      'skills',
      pickSection(updates, 'skills'),
      (s) => writeNormalizedSkills(resumeId, s),
    ],
    [
      'projects',
      pickSection(updates, 'projects'),
      (s) => writeNormalizedProjects(resumeId, s),
    ],
    [
      'certifications',
      pickSection(updates, 'certifications'),
      (s) => writeNormalizedCertifications(resumeId, s),
    ],
    [
      'volunteer_experience',
      pickSection(
        updates,
        'volunteerExperience',
        'additionalInfo.volunteerExperience'
      ),
      (s) => writeNormalizedVolunteer(resumeId, s),
    ],
    [
      'publications',
      pickSection(updates, 'publications', 'additionalInfo.publications'),
      (s) => writeNormalizedPublications(resumeId, s),
    ],
    [
      'awards',
      pickSection(updates, 'awards', 'additionalInfo.awards'),
      (s) => writeNormalizedAwards(resumeId, s),
    ],
  ];

  const errors = [];
  for (const entry of sections) {
    const [label, value, fn] = entry;
    if (value === undefined) continue;
    try {
      await fn(value);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[resumeService] normalized write failed (${label}):`, err.message || err);
      errors.push({ label, message: err && err.message ? err.message : String(err) });
    }
  }
  if (errors.length > 0) {
    throw new Error(
      'Normalized writes failed: ' +
        errors.map((e) => `${e.label}: ${e.message}`).join('; ')
    );
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Public service
// ────────────────────────────────────────────────────────────────────────────

const resumeService = {
  async getResumes() {
    const { data, error } = await supabase
      .from('resumes')
      .select(RESUME_SELECT)
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    const rows = data || [];

    // Parallelize the per-resume child fetches so the dashboard stays snappy.
    // TODO(perf): collapse N×10 round-trips by fetching all child rows for
    // all resume IDs in 10 .in('resume_id', ids) queries and grouping in
    // memory — or use PostgREST embedded resources
    // (select=*,personal_info(*),...) to fetch everything in one round trip.
    const assembled = await Promise.all(
      rows.map(async (row) => {
        const children = await fetchChildRowsForResume(row.id);
        return assembleResumeFromNormalized(row, children);
      })
    );
    return assembled;
  },

  async getResumeById(id) {
    const { data, error } = await supabase
      .from('resumes')
      .select(RESUME_SELECT)
      .eq('id', id)
      .single();

    if (error) return null;
    const children = await fetchChildRowsForResume(data.id);
    return assembleResumeFromNormalized(data, children);
  },

  async createResume(name = 'Untitled Resume') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Phase 5: only metadata cols are written on the parent INSERT — child
    // sections live in the normalized tables and the seed step below adds the
    // 1:1 rows.
    const { data, error } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        name,
        template_id: 'modern',
        status: 'draft',
        current_step: 1,
      })
      .select(RESUME_SELECT)
      .single();

    if (error) throw new Error(error.message);

    // Serialize the seed inserts behind the per-resume write chain so any
    // immediately-following updateResume() lands strictly after the seeds.
    return serializeResumeWrite(data.id, async () => {
      // Seed empty 1:1 starter rows so subsequent normalized reads find a
      // row (rather than nothing). Repeatable tables stay empty until the
      // user adds content.
      //
      // We use UPSERT (onConflict resume_id) so re-runs are safe — if the
      // unique constraint is hit we simply no-op rather than fail.
      //
      // If the seeds DO fail (RLS, schema drift), we delete the parent resume
      // row to roll back to a clean "as-if-never-created" state and rethrow.
      // Without JSONB as a safety net, a parent row with no normalized seeds
      // would corrupt the read path.
      try {
        throwOnError(
          await supabase
            .from('personal_info')
            .upsert({ resume_id: data.id }, { onConflict: 'resume_id' }),
          'personal_info_seed'
        );
        throwOnError(
          await supabase
            .from('professional_summary')
            .upsert({ resume_id: data.id }, { onConflict: 'resume_id' }),
          'professional_summary_seed'
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          '[resumeService] createResume seeds failed; rolling back resume row:',
          err.message || err
        );
        try {
          await supabase.from('resumes').delete().eq('id', data.id);
        } catch (rollbackErr) {
          // eslint-disable-next-line no-console
          console.error(
            '[resumeService] createResume rollback failed:',
            rollbackErr.message || rollbackErr
          );
        }
        throw err;
      }

      return assembleResumeFromNormalized(data, {});
    });
  },

  async updateResume(id, updates) {
    // Serialize per-resume so two concurrent auto-saves don't interleave
    // their DELETE-then-INSERT sequences and lose rows.
    return serializeResumeWrite(id, async () => {
      // Pull out top-level metadata from updates — they go into dedicated columns
      const {
        name,
        templateId,
        atsScore,
        status,
        currentStep,
        lastExportedAt,
      } = updates;

      // ── Step 1: write metadata cols on the resumes row (parent). ──
      // careerObjective / summary metadata is folded into `patch` so the
      // parent UPDATE is atomic across all top-level columns.
      const patch = {};
      if (name !== undefined)           patch.name = name;
      if (templateId !== undefined)     patch.template_id = templateId;
      if (atsScore !== undefined)       patch.ats_score = atsScore;
      if (status !== undefined)         patch.status = status;
      if (currentStep !== undefined)    patch.current_step = currentStep;
      if (lastExportedAt !== undefined) patch.last_exported_at = lastExportedAt;

      const co = pickSection(updates, 'careerObjective') || {};
      if ('careerObjective' in updates) {
        patch.target_job_title = cleanString(co.targetJobTitle);
        patch.target_industry = cleanString(co.targetIndustry);
        const seniority = cleanString(co.seniorityLevel);
        patch.seniority_level =
          seniority && ALLOWED_SENIORITY.includes(seniority) ? seniority : null;
        patch.job_description_text = cleanString(co.jobDescriptionText);
        patch.job_description_url = cleanString(co.jobDescriptionUrl);
      }
      const sm = pickSection(updates, 'summary') || {};
      if ('summary' in updates) {
        const fmt = cleanString(sm.resumeFormatType);
        if (fmt && ALLOWED_RESUME_FORMATS.includes(fmt)) patch.resume_format = fmt;
        const len = cleanString(sm.resumeLength);
        if (len && ALLOWED_RESUME_LENGTHS.includes(len)) patch.resume_length = len;
      }

      // Postgres rejects an UPDATE with no SET clauses; if the patch is empty
      // (caller passed only child sections and no metadata), skip the parent
      // UPDATE and re-fetch the row at the end. The trigger that bumps
      // updated_at is on UPDATE so we still want a dummy bump — but for now
      // an empty patch is rare and harmless to skip.
      let parentRow;
      if (Object.keys(patch).length > 0) {
        const { data, error } = await supabase
          .from('resumes')
          .update(patch)
          .eq('id', id)
          .select(RESUME_SELECT)
          .single();
        if (error) throw new Error(error.message);
        parentRow = data;
      } else {
        const { data, error } = await supabase
          .from('resumes')
          .select(RESUME_SELECT)
          .eq('id', id)
          .single();
        if (error) throw new Error(error.message);
        parentRow = data;
      }

      // ── Step 2: write per-section normalized tables. ──
      // 1:1 sections first (cheap upserts), then repeatables (DELETE-then-INSERT).
      // If ANY section fails, runDualWriteSections aggregates errors and throws
      // — we let it propagate so the caller (auto-save / wizard) surfaces a
      // save error to the user. There is no JSONB rollback because there is no
      // JSONB to roll back to.
      await runDualWriteSections(id, updates);

      // ── Step 3: re-fetch normalized rows so the returned shape reflects state. ──
      const children = await fetchChildRowsForResume(parentRow.id);
      return assembleResumeFromNormalized(parentRow, children);
    });
  },

  async deleteResume(id) {
    const { error } = await supabase.from('resumes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async duplicateResume(id) {
    const original = await this.getResumeById(id);
    if (!original) throw new Error('Resume not found');

    const { id: _id, name, createdAt: _c, updatedAt: _u,
            templateId, atsScore: _as, status: _st,
            currentStep: _cs, lastExportedAt: _le, ...resumeData } = original;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        name: `${name} (Copy)`,
        template_id: templateId ?? 'modern',
        status: 'draft',
        current_step: 1,
      })
      .select(RESUME_SELECT)
      .single();

    if (error) throw new Error(error.message);

    // Route through updateResume so the full normalized-write path runs and
    // the new resume gets its own normalized child rows. We pass the assembled
    // original (minus identity fields) as the update payload so every section
    // is flagged as "present" and gets copied.
    //
    // updateResume serializes per-resume id and throws on any normalized
    // failure. If it throws, we delete the orphan parent INSERT to roll back —
    // a parent without normalized children would corrupt subsequent reads.
    try {
      return await this.updateResume(data.id, resumeData);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        '[resumeService] duplicateResume normalized copy failed; rolling back parent:',
        err
      );
      try {
        await supabase.from('resumes').delete().eq('id', data.id);
      } catch (rollbackErr) {
        // eslint-disable-next-line no-console
        console.error(
          '[resumeService] duplicateResume parent rollback failed:',
          rollbackErr
        );
      }
      throw err;
    }
  },

  // ─── ATS Scores ───────────────────────────────────────────

  async saveATSScore(resumeId, scoreData) {
    const { data, error } = await supabase
      .from('ats_scores')
      .insert({
        resume_id: resumeId,
        job_description_hash: scoreData.jdHash,
        overall_score: scoreData.overall,
        keyword_score: scoreData.keyword,
        format_score: scoreData.format,
        impact_score: scoreData.impact,
        completeness_score: scoreData.completeness,
        missing_keywords: scoreData.missingKeywords ?? [],
        suggestions: scoreData.suggestions ?? [],
      });
    if (error) throw new Error(error.message);

    // Mirror the score onto the resume row for quick dashboard display
    await supabase
      .from('resumes')
      .update({ ats_score: scoreData.overall })
      .eq('id', resumeId);

    return data;
  },

  async getLatestATSScore(resumeId) {
    const { data, error } = await supabase
      .from('ats_scores')
      .select('*')
      .eq('resume_id', resumeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  // ─── Export History ───────────────────────────────────────

  async saveExportRecord(resumeId, { format, templateId = 'modern', language = 'en', fileSizeBytes }) {
    const { data, error } = await supabase
      .from('export_history')
      .insert({
        resume_id: resumeId,
        format,
        template_id: templateId,
        language,
        file_size_bytes: fileSizeBytes ?? null,
      });
    if (error) throw new Error(error.message);

    // Update last_exported_at on the resume row
    await supabase
      .from('resumes')
      .update({ last_exported_at: new Date().toISOString() })
      .eq('id', resumeId);

    return data;
  },

  async getExportHistory(resumeId) {
    const { data, error } = await supabase
      .from('export_history')
      .select('*')
      .eq('resume_id', resumeId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  // ─── Job Analyses ─────────────────────────────────────────

  async saveJobAnalysis(resumeId, analysisData) {
    const { data, error } = await supabase
      .from('job_analyses')
      .insert({
        resume_id: resumeId,
        job_description_text: analysisData.jobDescriptionText,
        job_title: analysisData.jobTitle,
        seniority_level: analysisData.seniorityLevel,
        required_skills: analysisData.requiredSkills ?? [],
        preferred_skills: analysisData.preferredSkills ?? [],
        keywords: analysisData.keywords ?? [],
        culture_signals: analysisData.cultureSignals ?? [],
      });
    if (error) throw new Error(error.message);
    return data;
  },

  async getJobAnalyses(resumeId) {
    const { data, error } = await supabase
      .from('job_analyses')
      .select('*')
      .eq('resume_id', resumeId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

export default resumeService;
