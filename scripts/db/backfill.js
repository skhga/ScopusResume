#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * One-time (and idempotent) backfill for ScopusResume database normalization.
 *
 * Reads every row in the `resumes` table, decomposes the `data` JSONB into
 * the 11 normalized child tables introduced in Phase 1, and writes the rows.
 * Also updates the new metadata columns on the `resumes` row itself.
 *
 * IDEMPOTENCY:
 *   - 1:1 sections (personal_info, professional_summary) use INSERT ... ON
 *     CONFLICT (resume_id) DO UPDATE.
 *   - Repeatable sections (education, work_experience+bullets, skills,
 *     projects, certifications, volunteer_experience, publications, awards)
 *     use DELETE-then-INSERT inside the same transaction.
 *   - The `data` JSONB column is NEVER modified.
 *
 * Each resume is processed in its own BEGIN/COMMIT so a partial failure on
 * one resume does not corrupt others.
 *
 * Usage:
 *   node scripts/db/backfill.js              # apply backfill
 *   node scripts/db/backfill.js --dry-run    # log what would be written, write nothing
 */

const path = require('path');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
} catch (_) {
  /* optional */
}

let Client;
try {
  ({ Client } = require('pg'));
} catch (err) {
  console.error('[backfill] Missing dependency: `pg`. Run `npm install` first.');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');

// ────────────────────────────────────────────────────────────
// Value coercion helpers — JSONB fields can be '', null, or undefined.
// Database expects NULL for missing values and proper types for dates/ints.
// ────────────────────────────────────────────────────────────

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
  // Accept '', null, or a string. Postgres DATE accepts ISO 'YYYY-MM-DD'
  // and most other parseable formats; we just pass through as-is unless empty.
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function cleanJsonArray(v) {
  // Postgres JSONB columns expect a JS value that pg will JSON-encode.
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x !== undefined && x !== null);
}

// ────────────────────────────────────────────────────────────
// Per-section backfill functions. Each takes (client, resumeId, sectionData)
// and writes to the appropriate table(s). All return a count of rows written
// for the summary log.
// ────────────────────────────────────────────────────────────

async function backfillPersonalInfo(client, resumeId, pi) {
  if (!pi || typeof pi !== 'object') return 0;
  const sql = `
    INSERT INTO personal_info
      (resume_id, full_name, professional_email, phone_number, city, state,
       target_country_region, linkedin_url, portfolio_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (resume_id) DO UPDATE SET
      full_name             = EXCLUDED.full_name,
      professional_email    = EXCLUDED.professional_email,
      phone_number          = EXCLUDED.phone_number,
      city                  = EXCLUDED.city,
      state                 = EXCLUDED.state,
      target_country_region = EXCLUDED.target_country_region,
      linkedin_url          = EXCLUDED.linkedin_url,
      portfolio_url         = EXCLUDED.portfolio_url
  `;
  const params = [
    resumeId,
    cleanString(pi.fullName),
    cleanString(pi.email),
    cleanString(pi.phone),
    cleanString(pi.city),
    cleanString(pi.state),
    cleanString(pi.targetCountry),
    cleanString(pi.linkedinUrl),
    cleanString(pi.portfolioUrl),
  ];
  if (!DRY_RUN) await client.query(sql, params);
  return 1;
}

async function backfillResumeMetadata(client, resumeId, co, summary) {
  // careerObjective + summary settings → resumes table columns
  if (!co && !summary) return 0;
  const safeCo = co || {};
  const safeSummary = summary || {};
  const sql = `
    UPDATE resumes SET
      target_job_title       = $2,
      target_industry        = $3,
      seniority_level        = $4,
      job_description_text   = $5,
      job_description_url    = $6,
      resume_format          = COALESCE($7, resume_format),
      resume_length          = COALESCE($8, resume_length)
    WHERE id = $1
  `;
  const seniority = cleanString(safeCo.seniorityLevel);
  const allowedSeniority = ['entry', 'mid', 'senior', 'executive'];
  const validSeniority = seniority && allowedSeniority.includes(seniority) ? seniority : null;

  const fmt = cleanString(safeSummary.resumeFormatType);
  const allowedFmt = ['chronological', 'functional', 'hybrid'];
  const validFmt = fmt && allowedFmt.includes(fmt) ? fmt : null;

  const len = cleanString(safeSummary.resumeLength);
  const allowedLen = ['one_page', 'two_page'];
  const validLen = len && allowedLen.includes(len) ? len : null;

  const params = [
    resumeId,
    cleanString(safeCo.targetJobTitle),
    cleanString(safeCo.targetIndustry),
    validSeniority,
    cleanString(safeCo.jobDescriptionText),
    cleanString(safeCo.jobDescriptionUrl),
    validFmt,
    validLen,
  ];
  if (!DRY_RUN) await client.query(sql, params);
  return 1;
}

async function backfillEducation(client, resumeId, education) {
  if (!Array.isArray(education) || education.length === 0) {
    if (!DRY_RUN) await client.query('DELETE FROM education WHERE resume_id = $1', [resumeId]);
    return 0;
  }
  if (!DRY_RUN) await client.query('DELETE FROM education WHERE resume_id = $1', [resumeId]);

  let written = 0;
  for (let i = 0; i < education.length; i++) {
    const e = education[i] || {};
    const allowedDegrees = ['ba', 'bs', 'ma', 'ms', 'mba', 'phd', 'certificate', 'other'];
    const degree = cleanString(e.degreeType);
    const validDegree = degree && allowedDegrees.includes(degree) ? degree : null;
    const gradMonth = cleanInt(e.graduationMonth);
    const validGradMonth = gradMonth !== null && gradMonth >= 1 && gradMonth <= 12 ? gradMonth : null;
    const gpa = cleanFloat(e.gpa);
    const validGpa = gpa !== null && gpa >= 0 && gpa <= 4.0 ? gpa : null;

    const params = [
      resumeId,
      cleanString(e.institutionName),
      validDegree,
      cleanString(e.fieldOfStudy),
      validGradMonth,
      cleanInt(e.graduationYear),
      cleanBool(e.currentlyEnrolled),
      validGpa,
      cleanString(e.honorsAwards),
      cleanString(e.relevantCoursework),
      cleanString(e.thesisTitle),
      cleanInt(e.displayOrder) ?? i,
    ];
    if (!DRY_RUN) {
      await client.query(
        `INSERT INTO education
          (resume_id, institution_name, degree_type, field_of_study,
           graduation_month, graduation_year, currently_enrolled, gpa,
           honors_awards, relevant_coursework, thesis_title, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        params
      );
    }
    written++;
  }
  return written;
}

async function backfillWorkExperience(client, resumeId, work) {
  if (!Array.isArray(work) || work.length === 0) {
    if (!DRY_RUN) await client.query('DELETE FROM work_experience WHERE resume_id = $1', [resumeId]);
    return { jobs: 0, bullets: 0 };
  }
  // CASCADE on work_experience deletes child bullet_points automatically
  if (!DRY_RUN) await client.query('DELETE FROM work_experience WHERE resume_id = $1', [resumeId]);

  let jobs = 0;
  let bullets = 0;
  for (let i = 0; i < work.length; i++) {
    const w = work[i] || {};
    const startMonth = cleanInt(w.startMonth);
    const validStart = startMonth !== null && startMonth >= 1 && startMonth <= 12 ? startMonth : null;
    const endMonth = cleanInt(w.endMonth);
    const validEnd = endMonth !== null && endMonth >= 1 && endMonth <= 12 ? endMonth : null;

    const params = [
      resumeId,
      cleanString(w.companyName),
      cleanString(w.jobTitle),
      cleanString(w.location),
      cleanBool(w.isRemote),
      validStart,
      cleanInt(w.startYear),
      validEnd,
      cleanInt(w.endYear),
      cleanBool(w.isCurrentRole),
      cleanString(w.jobDescriptionRaw),
      cleanInt(w.displayOrder) ?? i,
    ];

    let experienceId = null;
    if (!DRY_RUN) {
      const result = await client.query(
        `INSERT INTO work_experience
          (resume_id, company_name, job_title, location, is_remote,
           start_month, start_year, end_month, end_year, is_current_role,
           job_description_raw, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        params
      );
      experienceId = result.rows[0].id;
    }
    jobs++;

    // bulletPoints can be: array of strings, OR array of objects {raw, ai, isUsingAi}
    const bps = Array.isArray(w.bulletPoints) ? w.bulletPoints : [];
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
      // Skip completely empty bullets
      if (!raw && !ai) continue;
      if (!DRY_RUN && experienceId) {
        await client.query(
          `INSERT INTO bullet_points
            (experience_id, raw_text, ai_text, is_using_ai, display_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [experienceId, raw ?? '', ai, isUsingAi, j]
        );
      }
      bullets++;
    }
  }
  return { jobs, bullets };
}

async function backfillSkills(client, resumeId, skills) {
  if (!skills || typeof skills !== 'object') {
    if (!DRY_RUN) await client.query('DELETE FROM skills WHERE resume_id = $1', [resumeId]);
    return 0;
  }
  if (!DRY_RUN) await client.query('DELETE FROM skills WHERE resume_id = $1', [resumeId]);

  // JSONB key → spec category mapping
  const categoryMap = [
    ['technicalSkills', 'technical'],
    ['programmingLanguages', 'programming'],
    ['toolsSoftware', 'tools'],
    ['domainSpecificSkills', 'domain'],
    // languageSkills handled separately because items are objects
  ];

  let written = 0;
  let order = 0;
  for (const [jsonKey, category] of categoryMap) {
    const arr = skills[jsonKey];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const name = cleanString(item);
      if (!name) continue;
      if (!DRY_RUN) {
        await client.query(
          `INSERT INTO skills (resume_id, category, skill_name, proficiency_level, display_order)
           VALUES ($1, $2, $3, NULL, $4)`,
          [resumeId, category, name, order]
        );
      }
      written++;
      order++;
    }
  }

  // languageSkills: items are { name, proficiency } OR plain strings
  const langs = Array.isArray(skills.languageSkills) ? skills.languageSkills : [];
  for (const item of langs) {
    let name;
    let proficiency = null;
    if (typeof item === 'string') {
      name = cleanString(item);
    } else if (item && typeof item === 'object') {
      name = cleanString(item.name);
      proficiency = cleanString(item.proficiency);
    }
    if (!name) continue;
    if (!DRY_RUN) {
      await client.query(
        `INSERT INTO skills (resume_id, category, skill_name, proficiency_level, display_order)
         VALUES ($1, 'language', $2, $3, $4)`,
        [resumeId, name, proficiency, order]
      );
    }
    written++;
    order++;
  }

  return written;
}

async function backfillProjects(client, resumeId, projects) {
  if (!Array.isArray(projects) || projects.length === 0) {
    if (!DRY_RUN) await client.query('DELETE FROM projects WHERE resume_id = $1', [resumeId]);
    return 0;
  }
  if (!DRY_RUN) await client.query('DELETE FROM projects WHERE resume_id = $1', [resumeId]);

  let written = 0;
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i] || {};
    // associatedInstitution doesn't have a column; prepend to description if present
    let description = cleanString(p.projectDescription);
    if (cleanString(p.associatedInstitution)) {
      description = description
        ? `[${cleanString(p.associatedInstitution)}] ${description}`
        : `[${cleanString(p.associatedInstitution)}]`;
    }
    const params = [
      resumeId,
      cleanString(p.projectTitle),
      description,
      JSON.stringify(cleanJsonArray(p.technologiesUsed)),
      cleanString(p.projectOutcome),
      cleanString(p.projectUrl),
      i,
    ];
    if (!DRY_RUN) {
      await client.query(
        `INSERT INTO projects
          (resume_id, project_title, description, technologies_used, outcome,
           project_url, display_order)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
        params
      );
    }
    written++;
  }
  return written;
}

async function backfillCertifications(client, resumeId, certs) {
  if (!Array.isArray(certs) || certs.length === 0) {
    if (!DRY_RUN) await client.query('DELETE FROM certifications WHERE resume_id = $1', [resumeId]);
    return 0;
  }
  if (!DRY_RUN) await client.query('DELETE FROM certifications WHERE resume_id = $1', [resumeId]);

  let written = 0;
  for (let i = 0; i < certs.length; i++) {
    const c = certs[i] || {};
    const params = [
      resumeId,
      cleanString(c.certificationName),
      cleanString(c.issuingBody),
      cleanDate(c.dateObtained),
      cleanString(c.credentialId),
      i,
    ];
    if (!DRY_RUN) {
      await client.query(
        `INSERT INTO certifications
          (resume_id, certification_name, issuing_body, date_obtained,
           credential_id, display_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        params
      );
    }
    written++;
  }
  return written;
}

async function backfillVolunteer(client, resumeId, vols) {
  if (!Array.isArray(vols) || vols.length === 0) {
    if (!DRY_RUN) await client.query('DELETE FROM volunteer_experience WHERE resume_id = $1', [resumeId]);
    return 0;
  }
  if (!DRY_RUN) await client.query('DELETE FROM volunteer_experience WHERE resume_id = $1', [resumeId]);

  let written = 0;
  for (let i = 0; i < vols.length; i++) {
    const v = vols[i] || {};
    const params = [
      resumeId,
      cleanString(v.organizationName),
      cleanString(v.role),
      cleanDate(v.startDate),
      cleanDate(v.endDate),
      cleanString(v.description),
      i,
    ];
    if (!DRY_RUN) {
      await client.query(
        `INSERT INTO volunteer_experience
          (resume_id, organization_name, role, start_date, end_date,
           description, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        params
      );
    }
    written++;
  }
  return written;
}

async function backfillPublications(client, resumeId, pubs) {
  if (!Array.isArray(pubs) || pubs.length === 0) {
    if (!DRY_RUN) await client.query('DELETE FROM publications WHERE resume_id = $1', [resumeId]);
    return 0;
  }
  if (!DRY_RUN) await client.query('DELETE FROM publications WHERE resume_id = $1', [resumeId]);

  let written = 0;
  for (let i = 0; i < pubs.length; i++) {
    const p = pubs[i] || {};
    const params = [
      resumeId,
      cleanString(p.publicationTitle),
      JSON.stringify(cleanJsonArray(p.authors)),
      cleanString(p.publicationName),
      cleanInt(p.year),
      cleanString(p.doiUrl),
      i,
    ];
    if (!DRY_RUN) {
      await client.query(
        `INSERT INTO publications
          (resume_id, publication_title, authors, publication_name, year,
           doi_url, display_order)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)`,
        params
      );
    }
    written++;
  }
  return written;
}

async function backfillAwards(client, resumeId, awards) {
  if (!Array.isArray(awards) || awards.length === 0) {
    if (!DRY_RUN) await client.query('DELETE FROM awards WHERE resume_id = $1', [resumeId]);
    return 0;
  }
  if (!DRY_RUN) await client.query('DELETE FROM awards WHERE resume_id = $1', [resumeId]);

  let written = 0;
  for (let i = 0; i < awards.length; i++) {
    const a = awards[i] || {};
    const params = [
      resumeId,
      cleanString(a.awardName),
      cleanString(a.awardingBody),
      cleanDate(a.dateReceived),
      cleanString(a.description),
      i,
    ];
    if (!DRY_RUN) {
      await client.query(
        `INSERT INTO awards
          (resume_id, award_name, awarding_body, date_received, description,
           display_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        params
      );
    }
    written++;
  }
  return written;
}

async function backfillProfessionalSummary(client, resumeId, ps) {
  if (!ps || typeof ps !== 'object') return 0;
  const text = cleanString(ps.summaryText);
  if (!text) return 0;
  const sql = `
    INSERT INTO professional_summary (resume_id, summary_text, is_ai_generated)
    VALUES ($1, $2, $3)
    ON CONFLICT (resume_id) DO UPDATE SET
      summary_text    = EXCLUDED.summary_text,
      is_ai_generated = EXCLUDED.is_ai_generated,
      updated_at      = NOW()
  `;
  if (!DRY_RUN) await client.query(sql, [resumeId, text, cleanBool(ps.isAiGenerated)]);
  return 1;
}

// ────────────────────────────────────────────────────────────
// Main per-resume orchestrator
// ────────────────────────────────────────────────────────────

async function backfillResume(client, row) {
  const data = row.data || {};
  const counts = {};

  if (!DRY_RUN) await client.query('BEGIN');
  try {
    counts.personal_info = await backfillPersonalInfo(client, row.id, data.personalInfo);

    // Resume metadata cols come from careerObjective + summary settings
    counts.metadata = await backfillResumeMetadata(client, row.id, data.careerObjective, data.summary);

    counts.education = await backfillEducation(client, row.id, data.education);

    const work = await backfillWorkExperience(client, row.id, data.workExperience);
    counts.work_experience = work.jobs;
    counts.bullet_points = work.bullets;

    counts.skills = await backfillSkills(client, row.id, data.skills);
    counts.projects = await backfillProjects(client, row.id, data.projects);
    counts.certifications = await backfillCertifications(client, row.id, data.certifications);

    // volunteer / publications / awards: support both top-level and additionalInfo paths
    const vols = data.volunteerExperience ?? data.additionalInfo?.volunteerExperience;
    const pubs = data.publications ?? data.additionalInfo?.publications;
    const awds = data.awards ?? data.additionalInfo?.awards;
    counts.volunteer_experience = await backfillVolunteer(client, row.id, vols);
    counts.publications = await backfillPublications(client, row.id, pubs);
    counts.awards = await backfillAwards(client, row.id, awds);

    // professional_summary: support data.professionalSummary, then reviewOptimize.professionalSummary, then summary
    const ps =
      data.professionalSummary ??
      data.reviewOptimize?.professionalSummary ??
      (data.summary && data.summary.summaryText ? data.summary : null);
    counts.professional_summary = await backfillProfessionalSummary(client, row.id, ps);

    if (!DRY_RUN) await client.query('COMMIT');
    return { ok: true, counts };
  } catch (err) {
    if (!DRY_RUN) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        /* ignore */
      }
    }
    return { ok: false, error: err.message || String(err), counts };
  }
}

// ────────────────────────────────────────────────────────────
// Entry point
// ────────────────────────────────────────────────────────────

(async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      '[backfill] DATABASE_URL is not set.\n' +
        '  Add it to .env.local. See .env.local.example for instructions.'
    );
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
  } catch (err) {
    console.error('[backfill] Failed to connect to database:');
    console.error(err.message || err);
    process.exit(1);
  }

  console.log(
    `[backfill] Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE WRITE'}`
  );

  let resumes;
  try {
    const result = await client.query('SELECT id, user_id, data FROM resumes ORDER BY created_at');
    resumes = result.rows;
  } catch (err) {
    console.error('[backfill] Failed to read resumes table:', err.message || err);
    await client.end();
    process.exit(1);
  }

  console.log(`[backfill] Processing ${resumes.length} resume(s)...\n`);

  const totals = {
    personal_info: 0, metadata: 0, education: 0, work_experience: 0,
    bullet_points: 0, skills: 0, projects: 0, certifications: 0,
    volunteer_experience: 0, publications: 0, awards: 0, professional_summary: 0,
  };
  const errors = [];

  for (const row of resumes) {
    const { ok, counts, error } = await backfillResume(client, row);
    const summary = Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ') || 'no sections';
    if (ok) {
      console.log(`  [resume ${row.id}] ${summary}`);
      for (const [k, v] of Object.entries(counts)) {
        totals[k] = (totals[k] || 0) + v;
      }
    } else {
      console.error(`  [resume ${row.id}] FAILED: ${error}`);
      errors.push({ id: row.id, error });
    }
  }

  console.log('\n=== Backfill summary ===');
  console.log(`Resumes processed:     ${resumes.length}`);
  console.log(`Resumes failed:        ${errors.length}`);
  console.log('Rows written per table:');
  for (const [k, v] of Object.entries(totals)) {
    console.log(`  ${k.padEnd(22)} ${v}`);
  }
  if (errors.length > 0) {
    console.log('\nErrors:');
    for (const e of errors) console.log(`  ${e.id}: ${e.error}`);
  }
  console.log('');

  await client.end();
  process.exit(errors.length > 0 && !DRY_RUN ? 1 : 0);
})();
