#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Verification script: compares the JSONB resume content (resumes.data) against
 * the normalized child tables row by row.
 *
 * Reports any mismatches with greppable [MISMATCH] prefix. Exit code 0 if
 * everything matches, 1 if any mismatch found.
 *
 * Use after backfill, and after every Phase 4 (dual-write) edit, to confirm
 * the two stores are in sync.
 *
 * Usage:
 *   node scripts/db/verify.js
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
  console.error('[verify] Missing dependency: `pg`. Run `npm install` first.');
  process.exit(1);
}

let totalMismatches = 0;

function reportMismatch(resumeId, section, detail) {
  console.log(`[MISMATCH] resume=${resumeId} section=${section} ${detail}`);
  totalMismatches++;
}

function jsonbArrayLen(arr) {
  return Array.isArray(arr) ? arr.filter((x) => x !== undefined && x !== null && x !== '').length : 0;
}

function normString(v) {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

async function fetchAllForResume(client, resumeId) {
  // Single round-trip per table — small data volume on dev, prioritise simplicity over batching
  const queries = await Promise.all([
    client.query('SELECT * FROM personal_info WHERE resume_id = $1', [resumeId]),
    client.query('SELECT * FROM education WHERE resume_id = $1 ORDER BY display_order', [resumeId]),
    client.query('SELECT * FROM work_experience WHERE resume_id = $1 ORDER BY display_order', [resumeId]),
    client.query('SELECT * FROM skills WHERE resume_id = $1', [resumeId]),
    client.query('SELECT * FROM projects WHERE resume_id = $1 ORDER BY display_order', [resumeId]),
    client.query('SELECT * FROM certifications WHERE resume_id = $1 ORDER BY display_order', [resumeId]),
    client.query('SELECT * FROM volunteer_experience WHERE resume_id = $1 ORDER BY display_order', [resumeId]),
    client.query('SELECT * FROM publications WHERE resume_id = $1 ORDER BY display_order', [resumeId]),
    client.query('SELECT * FROM awards WHERE resume_id = $1 ORDER BY display_order', [resumeId]),
    client.query('SELECT * FROM professional_summary WHERE resume_id = $1', [resumeId]),
  ]);

  // Bullets fetched after we know the work_experience rows so we can scope them
  const workIds = queries[2].rows.map((r) => r.id);
  let bulletsByExp = {};
  if (workIds.length > 0) {
    const bulletsRes = await client.query(
      'SELECT * FROM bullet_points WHERE experience_id = ANY($1::uuid[]) ORDER BY display_order',
      [workIds]
    );
    for (const b of bulletsRes.rows) {
      if (!bulletsByExp[b.experience_id]) bulletsByExp[b.experience_id] = [];
      bulletsByExp[b.experience_id].push(b);
    }
  }

  return {
    personal_info: queries[0].rows,
    education: queries[1].rows,
    work_experience: queries[2].rows,
    skills: queries[3].rows,
    projects: queries[4].rows,
    certifications: queries[5].rows,
    volunteer_experience: queries[6].rows,
    publications: queries[7].rows,
    awards: queries[8].rows,
    professional_summary: queries[9].rows,
    bulletsByExp,
  };
}

function verifyResume(row, normalized) {
  const id = row.id;
  const data = row.data || {};

  // ── personal_info ──
  const pi = data.personalInfo || {};
  const piRow = normalized.personal_info[0];
  if (pi.fullName || pi.email || pi.phone) {
    if (!piRow) {
      reportMismatch(id, 'personal_info', 'JSONB has personalInfo but no normalized row');
    } else {
      if (normString(pi.fullName) !== normString(piRow.full_name)) {
        reportMismatch(id, 'personal_info',
          `full_name JSONB="${normString(pi.fullName)}" vs normalized="${normString(piRow.full_name)}"`);
      }
      if (normString(pi.email) !== normString(piRow.professional_email)) {
        reportMismatch(id, 'personal_info',
          `email JSONB="${normString(pi.email)}" vs normalized="${normString(piRow.professional_email)}"`);
      }
    }
  }

  // ── careerObjective → resumes table cols ──
  const co = data.careerObjective || {};
  if (normString(co.targetJobTitle) !== normString(row.target_job_title)) {
    reportMismatch(id, 'metadata',
      `target_job_title JSONB="${normString(co.targetJobTitle)}" vs col="${normString(row.target_job_title)}"`);
  }
  if (normString(co.targetIndustry) !== normString(row.target_industry)) {
    reportMismatch(id, 'metadata',
      `target_industry JSONB="${normString(co.targetIndustry)}" vs col="${normString(row.target_industry)}"`);
  }

  // ── education ──
  const eduJsonbLen = jsonbArrayLen(data.education);
  const eduNormLen = normalized.education.length;
  if (eduJsonbLen !== eduNormLen) {
    reportMismatch(id, 'education', `length JSONB=${eduJsonbLen} vs normalized=${eduNormLen}`);
  }

  // ── work_experience + bullet_points ──
  const workJsonb = Array.isArray(data.workExperience) ? data.workExperience : [];
  const workNorm = normalized.work_experience;
  if (workJsonb.length !== workNorm.length) {
    reportMismatch(id, 'work_experience', `length JSONB=${workJsonb.length} vs normalized=${workNorm.length}`);
  }
  // Compare bullet counts per work entry, by display_order
  for (let i = 0; i < Math.min(workJsonb.length, workNorm.length); i++) {
    const jb = Array.isArray(workJsonb[i]?.bulletPoints)
      ? workJsonb[i].bulletPoints.filter((b) => {
          if (typeof b === 'string') return b.trim() !== '';
          if (b && typeof b === 'object') return b.raw || b.ai;
          return false;
        }).length
      : 0;
    const nb = (normalized.bulletsByExp[workNorm[i].id] || []).length;
    if (jb !== nb) {
      reportMismatch(id, 'bullet_points',
        `experience #${i} bullets JSONB=${jb} vs normalized=${nb}`);
    }
  }

  // ── skills ──
  const sk = data.skills || {};
  const skJsonbCount =
    jsonbArrayLen(sk.technicalSkills) +
    jsonbArrayLen(sk.programmingLanguages) +
    jsonbArrayLen(sk.toolsSoftware) +
    jsonbArrayLen(sk.domainSpecificSkills) +
    jsonbArrayLen(sk.languageSkills);
  const skNormCount = normalized.skills.length;
  if (skJsonbCount !== skNormCount) {
    reportMismatch(id, 'skills', `count JSONB=${skJsonbCount} vs normalized=${skNormCount}`);
  }

  // ── projects ──
  const projJsonbLen = jsonbArrayLen(data.projects);
  if (projJsonbLen !== normalized.projects.length) {
    reportMismatch(id, 'projects',
      `length JSONB=${projJsonbLen} vs normalized=${normalized.projects.length}`);
  }

  // ── certifications ──
  const certJsonbLen = jsonbArrayLen(data.certifications);
  if (certJsonbLen !== normalized.certifications.length) {
    reportMismatch(id, 'certifications',
      `length JSONB=${certJsonbLen} vs normalized=${normalized.certifications.length}`);
  }

  // ── volunteer / publications / awards (top-level OR additionalInfo) ──
  const vols = data.volunteerExperience ?? data.additionalInfo?.volunteerExperience;
  if (jsonbArrayLen(vols) !== normalized.volunteer_experience.length) {
    reportMismatch(id, 'volunteer_experience',
      `length JSONB=${jsonbArrayLen(vols)} vs normalized=${normalized.volunteer_experience.length}`);
  }
  const pubs = data.publications ?? data.additionalInfo?.publications;
  if (jsonbArrayLen(pubs) !== normalized.publications.length) {
    reportMismatch(id, 'publications',
      `length JSONB=${jsonbArrayLen(pubs)} vs normalized=${normalized.publications.length}`);
  }
  const awds = data.awards ?? data.additionalInfo?.awards;
  if (jsonbArrayLen(awds) !== normalized.awards.length) {
    reportMismatch(id, 'awards',
      `length JSONB=${jsonbArrayLen(awds)} vs normalized=${normalized.awards.length}`);
  }

  // ── professional_summary ──
  const psSource =
    data.professionalSummary ??
    data.reviewOptimize?.professionalSummary ??
    (data.summary && data.summary.summaryText ? data.summary : null);
  const psText = psSource ? normString(psSource.summaryText) : '';
  const psNormText = normalized.professional_summary[0]
    ? normString(normalized.professional_summary[0].summary_text)
    : '';
  if (psText !== psNormText) {
    reportMismatch(id, 'professional_summary',
      `JSONB="${psText.slice(0, 60)}..." vs normalized="${psNormText.slice(0, 60)}..."`);
  }
}

(async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[verify] DATABASE_URL is not set. See .env.local.example.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
  } catch (err) {
    console.error('[verify] Failed to connect:', err.message || err);
    process.exit(1);
  }

  let resumes;
  try {
    const result = await client.query(
      'SELECT id, data, target_job_title, target_industry, seniority_level, ' +
      'job_description_text, job_description_url FROM resumes ORDER BY created_at'
    );
    resumes = result.rows;
  } catch (err) {
    console.error('[verify] Failed to read resumes:', err.message || err);
    await client.end();
    process.exit(1);
  }

  console.log(`[verify] Auditing ${resumes.length} resume(s)...\n`);

  for (const row of resumes) {
    const normalized = await fetchAllForResume(client, row.id);
    verifyResume(row, normalized);
  }

  console.log('\n=== Verification summary ===');
  console.log(`Resumes audited: ${resumes.length}`);
  console.log(`Mismatches:      ${totalMismatches}`);
  if (totalMismatches === 0) {
    console.log('All sections match between JSONB and normalized tables. ✓');
  } else {
    console.log('Mismatches found — review the [MISMATCH] lines above.');
  }
  console.log('');

  await client.end();
  process.exit(totalMismatches > 0 ? 1 : 0);
})();
