import { supabase } from '../lib/supabaseClient';
import {
  emptyResume,
  emptyPersonalInfo,
  emptyCareerObjective,
  emptySkills,
  emptyProfessionalSummary,
  emptySummary,
} from '../constants/resumeFields';

// ────────────────────────────────────────────────────────────────────────────
// Phase 3: dual-read.
//
// Reads prefer normalized child tables (added in migrations 003/004).
// For each section, if ZERO rows exist in the normalized table, we fall back
// to the corresponding piece of `resumes.data` JSONB. Fallback is per-section,
// so partial migration states (e.g., normalized education + JSONB skills) work.
//
// Writes are NOT changed in this phase — they still write to `resumes.data`
// JSONB only. Phase 4 will add dual-write.
//
// Public API of this module is unchanged: same function names, same signatures,
// same return shapes. `rowToResume` is retained as the JSONB-only path used
// inside the assembler when a section has no normalized rows.
// ────────────────────────────────────────────────────────────────────────────

const RESUME_SELECT =
  'id, name, created_at, updated_at, data, template_id, ats_score, status, current_step, last_exported_at, ' +
  'target_job_title, target_industry, seniority_level, job_description_text, job_description_url, ' +
  'resume_format, resume_length';

/**
 * Flatten a Supabase row into the resume shape the app expects.
 * Top-level metadata columns are merged alongside the JSONB data blob.
 *
 * Used directly when no normalized rows exist (full JSONB fallback) and as
 * the per-section fallback source inside `assembleResumeFromNormalized`.
 */
function rowToResume(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Metadata columns (top-level on the resumes table)
    templateId: row.template_id ?? 'modern',
    atsScore: row.ats_score ?? null,
    status: row.status ?? 'draft',
    currentStep: row.current_step ?? 1,
    lastExportedAt: row.last_exported_at ?? null,
    // Resume content (JSONB data column)
    ...row.data,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Per-section mappers — pure functions converting normalized rows to the
// in-app shape (inverse of scripts/db/backfill.js).
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
  // The metadata cols only carry careerObjective fields; if all are null/empty
  // we treat the section as "absent" so JSONB fallback can kick in.
  // TODO(phase-4): once dual-write keeps cols and JSONB in sync, this fallback
  // can be removed — empty cols will reliably mean the user cleared the section.
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
    // Backfill prepends `[institution] ` to the description; reverse it.
    // Known limitation: any project whose description legitimately starts
    // with `[Word]` (e.g. `[Note]`) will be misread. The schema has no
    // dedicated column for institution; users may need manual cleanup.
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
// child rows and produces the in-app resume shape. Per-section fallback to
// the JSONB `data` blob when a section has no normalized rows.
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
  // Start with the JSONB-flattened version — this is the fallback baseline.
  const base = rowToResume(resumeRow);
  const data = resumeRow.data || {};

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
  const piMapped = mapPersonalInfoRow(piRow);
  if (piMapped) {
    base.personalInfo = piMapped;
  } else if (data.personalInfo) {
    base.personalInfo = data.personalInfo;
  } else {
    base.personalInfo = { ...emptyPersonalInfo };
  }

  // ── careerObjective (lives on resumes metadata cols) ──
  const coMapped = mapCareerObjectiveFromResumeRow(resumeRow);
  if (coMapped) {
    base.careerObjective = coMapped;
  } else if (data.careerObjective) {
    base.careerObjective = data.careerObjective;
  } else {
    base.careerObjective = { ...emptyCareerObjective };
  }

  // ── summary settings (resume_format / resume_length on resumes) ──
  const summarySettings = mapSummarySettingsFromResumeRow(resumeRow);
  if (summarySettings) {
    base.summary = { ...emptySummary, ...(data.summary || {}), ...summarySettings };
  } else if (data.summary) {
    base.summary = data.summary;
  } else {
    base.summary = { ...emptySummary };
  }

  // ── education (repeatable) ──
  if (education.length > 0) {
    base.education = mapEducationRows(education);
  } else if (Array.isArray(data.education)) {
    base.education = data.education;
  } else {
    base.education = [];
  }

  // ── workExperience + bullet_points ──
  if (workExperience.length > 0) {
    base.workExperience = mapWorkExperienceRows(workExperience, bulletsByExperienceId);
  } else if (Array.isArray(data.workExperience)) {
    base.workExperience = data.workExperience;
  } else {
    base.workExperience = [];
  }

  // ── skills (repeatable, grouped by category) ──
  if (skills.length > 0) {
    base.skills = mapSkillsRows(skills);
  } else if (data.skills) {
    base.skills = data.skills;
  } else {
    base.skills = { ...emptySkills };
  }

  // ── projects ──
  if (projects.length > 0) {
    base.projects = mapProjectRows(projects);
  } else if (Array.isArray(data.projects)) {
    base.projects = data.projects;
  } else {
    base.projects = [];
  }

  // ── certifications ──
  if (certifications.length > 0) {
    base.certifications = mapCertificationRows(certifications);
  } else if (Array.isArray(data.certifications)) {
    base.certifications = data.certifications;
  } else {
    base.certifications = [];
  }

  // ── volunteerExperience ──
  if (volunteerExperience.length > 0) {
    base.volunteerExperience = mapVolunteerRows(volunteerExperience);
  } else if (Array.isArray(data.volunteerExperience)) {
    base.volunteerExperience = data.volunteerExperience;
  } else if (Array.isArray(data.additionalInfo?.volunteerExperience)) {
    base.volunteerExperience = data.additionalInfo.volunteerExperience;
  } else {
    base.volunteerExperience = [];
  }

  // ── publications ──
  if (publications.length > 0) {
    base.publications = mapPublicationRows(publications);
  } else if (Array.isArray(data.publications)) {
    base.publications = data.publications;
  } else if (Array.isArray(data.additionalInfo?.publications)) {
    base.publications = data.additionalInfo.publications;
  } else {
    base.publications = [];
  }

  // ── awards ──
  if (awards.length > 0) {
    base.awards = mapAwardRows(awards);
  } else if (Array.isArray(data.awards)) {
    base.awards = data.awards;
  } else if (Array.isArray(data.additionalInfo?.awards)) {
    base.awards = data.additionalInfo.awards;
  } else {
    base.awards = [];
  }

  // ── professionalSummary (1:1) ──
  const psMapped = mapProfessionalSummaryRow(psRow);
  if (psMapped) {
    base.professionalSummary = psMapped;
  } else if (data.professionalSummary) {
    base.professionalSummary = data.professionalSummary;
  } else {
    base.professionalSummary = { ...emptyProfessionalSummary };
  }

  return base;
}

// ────────────────────────────────────────────────────────────────────────────
// Supabase fetch helpers — one per child table. Each returns [] on error so
// a failed read of one section does not blow away the whole resume; the
// per-section fallback to JSONB will kick in instead.
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
    // TODO(perf, phase-5): collapse N×10 round-trips by fetching all child rows
    // for all resume IDs in 10 .in('resume_id', ids) queries and grouping in
    // memory — or use PostgREST embedded resources (select=*,personal_info(*),...)
    // to fetch everything in one round trip.
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

    // Strip top-level metadata from emptyResume — stored as separate columns
    const { id: _id, name: _n, createdAt: _c, updatedAt: _u,
            templateId: _tid, atsScore: _as, status: _st,
            currentStep: _cs, lastExportedAt: _le, ...resumeData } = emptyResume;

    const { data, error } = await supabase
      .from('resumes')
      .insert({
        user_id: user.id,
        name,
        data: resumeData,
        template_id: 'modern',
        status: 'draft',
        current_step: 1,
      })
      .select(RESUME_SELECT)
      .single();

    if (error) throw new Error(error.message);
    // Newly created resume has no normalized child rows yet, so JSONB fallback
    // is exercised end-to-end. Still go through the assembler for consistency.
    return assembleResumeFromNormalized(data, {});
  },

  async updateResume(id, updates) {
    // Pull out top-level metadata from updates — they go into dedicated columns
    const {
      id: _id, name, createdAt: _c, updatedAt: _u,
      templateId, atsScore, status, currentStep, lastExportedAt,
      ...resumeData
    } = updates;

    const patch = { data: resumeData };
    if (name !== undefined)           patch.name = name;
    if (templateId !== undefined)     patch.template_id = templateId;
    if (atsScore !== undefined)       patch.ats_score = atsScore;
    if (status !== undefined)         patch.status = status;
    if (currentStep !== undefined)    patch.current_step = currentStep;
    if (lastExportedAt !== undefined) patch.last_exported_at = lastExportedAt;

    const { data, error } = await supabase
      .from('resumes')
      .update(patch)
      .eq('id', id)
      .select(RESUME_SELECT)
      .single();

    if (error) throw new Error(error.message);
    // Phase 3: writes are JSONB-only, but reads still prefer normalized. After
    // a write we must re-fetch normalized rows so the returned object reflects
    // the latest state per-section (the in-app shape is unchanged).
    const children = await fetchChildRowsForResume(data.id);
    return assembleResumeFromNormalized(data, children);
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
        data: resumeData,
        template_id: templateId ?? 'modern',
        status: 'draft',
        current_step: 1,
      })
      .select(RESUME_SELECT)
      .single();

    if (error) throw new Error(error.message);
    // Duplicate has no child rows yet — JSONB fallback covers everything.
    return assembleResumeFromNormalized(data, {});
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
