# Database Normalization — Implementation Plan

> **For agentic workers:** This plan dispatches fresh subagents per phase. Each phase ends at a manual user verification gate — do NOT auto-advance. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Migrate the live Supabase schema from a 5-table JSONB design to the 16-table normalized design specified in the ScopusResume Technical Specification §3.3. Preserve all existing dev data through the migration. Rewrite the service layer to use normalized tables. Remove the JSONB blob at the end.

**Architecture:** Phased "strangler fig" migration in 5 ordered phases, each with its own subagent dispatch and verification gate. The app keeps working at every checkpoint. Backups are taken before any destructive operation. Apply order is **schema → backfill → dual-read → dual-write → cutover**.

**Tech Stack:** Supabase Postgres (RLS enforced), JS migration scripts using `@supabase/supabase-js`, plain SQL for DDL. No new app-side dependencies.

---

## Pre-Flight Assumptions (locked in by user)

- **Data state:** Dev/test data only — wipe is acceptable but we'll back up anyway out of caution
- **Apply strategy:** JS migration scripts (`node scripts/<name>.js`) using the existing Supabase client. User executes scripts locally.
- **Migration cadence:** Phased / strangler fig — 5 phases with manual verification gates between each.
- **Spec source of truth:** `~/Documents/Shiller International University /School Work /Integrative Project III /ScopusResume_Technical_Specification.pdf`, sections 3.3.1–3.3.8

---

## File Structure

**New files:**
- `supabase/migrations/001_users_profile.sql` — `user_profiles` table (replaces spec's custom `users` table; references `auth.users`)
- `supabase/migrations/002_resume_metadata.sql` — Add missing columns to existing `resumes` table per spec
- `supabase/migrations/003_resume_content_tables.sql` — `personal_info`, `education`, `work_experience`, `bullet_points`, `professional_summary`
- `supabase/migrations/004_repeatable_sections.sql` — `skills`, `certifications`, `projects`, `volunteer_experience`, `publications`, `awards`
- `supabase/migrations/005_indexes_and_rls.sql` — All indexes + RLS policies for the 11 new tables
- `scripts/backup-supabase.js` — Snapshots current `resumes` rows + JSONB to a timestamped JSON file
- `scripts/backfill-normalized.js` — One-time decomposition of JSONB into normalized rows (idempotent)
- `scripts/verify-migration.js` — Compares JSONB vs. normalized data; reports any mismatches

**Modified files:**
- `supabase/schema.sql` — Updated to be the new canonical schema (after migrations applied)
- `src/services/resumeService.js` — Rewrites in Phase 3 (dual-read) and Phase 4 (dual-write); cleanup in Phase 5
- `src/services/resumeService.test.js` *(may need to be created)* — Unit tests for the new behavior
- `package.json` — Add scripts entries: `db:backup`, `db:backfill`, `db:verify`, `db:migrate-status`

**Deferred until Phase 5:**
- `supabase/migrations/006_drop_jsonb.sql` — `ALTER TABLE resumes DROP COLUMN data;` (only after Phase 4 verified for at least 1 day)

---

## Naming & Design Decisions (locked in by this plan)

1. **No custom `users` table.** Supabase manages `auth.users`. The spec's `users` table fields (consent flags, soft delete, etc.) live in a new `user_profiles` table with `user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`. Better separation of auth from profile data.
2. **Existing `resumes` table extended in place.** New columns added (target_job_title, seniority_level, etc.) instead of dropping/recreating. The `data` JSONB column stays through Phase 4 and is dropped in Phase 5.
3. **Existing `resume_versions` kept as-is.** It is not in the spec but is actively used by `resumeVersionService.js` — we keep it and document it as a project-specific addition.
4. **All UUIDs.** Spec uses MySQL `CHAR(36)`; we use Postgres `UUID` (`gen_random_uuid()`).
5. **All timestamps `TIMESTAMPTZ`** (spec uses MySQL `DATETIME`).
6. **All ENUMs use Postgres `CHECK` constraints** instead of MySQL ENUM (more flexible, easier to evolve).
7. **RLS on every table.** Every new table gets policies scoped via `resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid())`.

---

## Phase 1: Add 12 missing tables + backup script

**Goal:** Schema matches spec §3.3 (16 total tables). All new tables empty. App still works because `resumeService.js` is unchanged.

**Risk:** LOW. New tables are additive; existing data untouched.

**Subagent dispatch:**

- [ ] **Step 1.1: Dispatch Phase-1 subagent**

Use the general-purpose subagent with this prompt:

````
You are implementing Phase 1 of a database normalization migration for ScopusResume,
a React + Supabase resume builder app at /Users/sk_hga/ScopusResume/scopus.

CONTEXT:
- The app currently stores all resume content in a single JSONB column resumes.data.
- The technical spec (PDF at ~/Documents/Shiller International University /School Work
  /Integrative Project III /ScopusResume_Technical_Specification.pdf §3.3) calls for
  16 normalized tables. We currently have 5: resumes, resume_versions, ats_scores,
  job_analyses, export_history. We need to add 11 more (the "users" table is replaced
  by Supabase's auth.users + a new user_profiles table).
- Live Supabase has only dev data. Schema changes apply via SQL files the user
  will run via Supabase Dashboard.
- Existing schema lives in supabase/schema.sql.

YOUR TASK:

1. Create the migrations/ folder under supabase/.

2. Write FIVE migration files under supabase/migrations/:

   001_users_profile.sql — user_profiles table:
     - user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
     - full_name TEXT
     - avatar_url TEXT
     - consent_ai_processing BOOLEAN DEFAULT FALSE
     - consent_marketing BOOLEAN DEFAULT FALSE
     - is_deleted BOOLEAN DEFAULT FALSE
     - deleted_at TIMESTAMPTZ
     - created_at TIMESTAMPTZ DEFAULT NOW()
     - updated_at TIMESTAMPTZ DEFAULT NOW() with auto-update trigger
     - RLS: users can SELECT/UPDATE/INSERT/DELETE only their own row (auth.uid() = user_id)

   002_resume_metadata.sql — Add columns to existing resumes table:
     - target_job_title TEXT
     - target_industry TEXT
     - seniority_level TEXT CHECK (seniority_level IN ('entry','mid','senior','executive'))
     - job_description_text TEXT
     - job_description_url TEXT
     - resume_format TEXT DEFAULT 'chronological' CHECK (resume_format IN ('chronological','functional','hybrid'))
     - resume_length TEXT DEFAULT 'one_page' CHECK (resume_length IN ('one_page','two_page'))
     - Use ALTER TABLE ADD COLUMN IF NOT EXISTS for safety.
     - Do NOT touch the existing data JSONB column.

   003_resume_content_tables.sql — 5 tables that store the bulk of resume content:
     personal_info (1:1 with resume): id, resume_id (UNIQUE FK), full_name, professional_email,
       phone_number, city, state, target_country_region, linkedin_url, portfolio_url, created_at
     education (repeatable): id, resume_id, institution_name, degree_type CHECK
       (ba/bs/ma/ms/mba/phd/certificate/other), field_of_study, graduation_month (1-12),
       graduation_year, currently_enrolled BOOL, gpa NUMERIC(3,2) CHECK (gpa BETWEEN 0 AND 4.00),
       honors_awards, relevant_coursework, thesis_title, display_order, created_at
     work_experience (repeatable): id, resume_id, company_name, job_title, location, is_remote,
       start_month (1-12), start_year, end_month, end_year, is_current_role, job_description_raw,
       display_order, created_at
     bullet_points (child of work_experience): id, experience_id (FK to work_experience ON
       DELETE CASCADE), raw_text, ai_text, is_using_ai BOOL DEFAULT TRUE, display_order, created_at
     professional_summary (1:1 with resume): id, resume_id (UNIQUE FK), summary_text,
       is_ai_generated BOOL, created_at, updated_at

   004_repeatable_sections.sql — 6 more repeatable tables:
     skills: id, resume_id, category CHECK (technical/programming/tools/language/domain),
       skill_name, proficiency_level, display_order, created_at
     certifications: id, resume_id, certification_name, issuing_body, date_obtained,
       credential_id, display_order, created_at
     projects: id, resume_id, project_title, description, technologies_used (JSONB),
       outcome, project_url, display_order, created_at
     volunteer_experience: id, resume_id, organization_name, role, start_date, end_date,
       description, display_order, created_at
     publications: id, resume_id, publication_title, authors (JSONB), publication_name,
       year, doi_url, display_order, created_at
     awards: id, resume_id, award_name, awarding_body, date_received, description,
       display_order, created_at

   005_indexes_and_rls.sql:
     - CREATE INDEX on every (resume_id) and (resume_id, display_order) per spec §3.4
     - CREATE INDEX bullets on (experience_id, display_order)
     - CREATE INDEX skills on (resume_id, category)
     - ALTER TABLE … ENABLE ROW LEVEL SECURITY on all 11 new tables
     - For each table, CREATE POLICY for SELECT, INSERT, UPDATE, DELETE scoped via:
       resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid())
     - For tables with experience_id (bullet_points), scope via the work_experience parent.

3. Write scripts/backup-supabase.js:
   - Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
   - SELECTs all rows from: resumes, resume_versions, ats_scores, job_analyses, export_history
   - Writes a single timestamped JSON file: backups/supabase-YYYY-MM-DD_HHMMSS.json
   - Logs row counts per table
   - Exits with code 0 on success, 1 on error
   - No external deps beyond @supabase/supabase-js (already installed) and node:fs

4. Update package.json scripts:
     "db:backup": "node scripts/backup-supabase.js"

5. Update supabase/schema.sql to be the FULL new canonical schema (existing tables +
   all new tables + indexes + RLS) by concatenating the migration files in order. This
   serves as a single-file reference for new contributors.

6. Verify your work:
   - All SQL files are syntactically valid Postgres
   - No CREATE TABLE without IF NOT EXISTS (idempotency)
   - RLS policies cover SELECT, INSERT, UPDATE, DELETE on every table
   - The backup script can be invoked but DO NOT actually run it (env may not be set up)
   - Report what you wrote and any concerns

CONSTRAINTS:
- Do NOT modify any code in src/ — Phase 1 is schema-only.
- Do NOT delete or modify the existing data JSONB column on resumes.
- Do NOT run any SQL or scripts yourself — only write the files.
- All UUIDs use gen_random_uuid(). All timestamps are TIMESTAMPTZ DEFAULT NOW().
- Report a final summary listing every file you created/modified and any decisions you made.
````

- [ ] **Step 1.2: Review subagent output**

Read each file the subagent created. Verify:
- Migration files run in order (numeric prefix)
- All 11 new tables present
- RLS on every table
- Backup script reads from env, writes timestamped file

- [ ] **Step 1.3: USER VERIFICATION GATE**

User runs:
1. `npm run db:backup` — verifies backup script works and saves a snapshot
2. Open Supabase Dashboard → SQL Editor → paste contents of `supabase/migrations/001_users_profile.sql` → Run
3. Repeat for migrations 002, 003, 004, 005 in order
4. Run `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;` — confirm all expected tables present
5. Run `SELECT COUNT(*) FROM resumes;` — confirm row count unchanged
6. Test the live app: dev server, dashboard loads, can open an existing resume — **app must still work**

**STOP HERE.** Do not proceed to Phase 2 until user confirms everything works.

- [ ] **Step 1.4: Commit**

```bash
git -C /Users/sk_hga/ScopusResume/scopus add supabase/ scripts/backup-supabase.js package.json
git -C /Users/sk_hga/ScopusResume/scopus commit -m "feat(db): Phase 1 — add 11 normalized tables + backup script

Adds the missing tables from Technical Spec §3.3 (user_profiles, personal_info,
education, work_experience, bullet_points, professional_summary, skills,
certifications, projects, volunteer_experience, publications, awards) with
indexes and RLS policies. Existing resumes.data JSONB blob is untouched.
App behavior unchanged.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 2: Backfill JSONB → normalized tables

**Goal:** Existing resume content is duplicated into the new tables. Both stores have the same data. JSONB remains the source of truth.

**Risk:** MEDIUM. Reads existing data, writes new rows. No deletes, no updates to existing rows.

**Subagent dispatch:**

- [ ] **Step 2.1: Dispatch Phase-2 subagent**

```
You are implementing Phase 2 of a database normalization migration for ScopusResume.

PRECONDITION: Phase 1 is complete. The 11 new tables exist and are empty.

YOUR TASK:

Write scripts/backfill-normalized.js that:

1. Connects to Supabase using SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
   (use the service role key so RLS doesn't block writes)

2. SELECTs all rows from resumes (id, user_id, data, ats_score, status, current_step, etc.)

3. For each resume row:
   a. Decompose data JSONB into normalized rows. The expected JSONB shape is defined
      by src/constants/resumeFields.js (read it for the field names). Map JSONB keys
      to the new table columns. Examples:
        data.personalInfo  → personal_info (1 row)
        data.careerObjective → updates to resumes table columns (target_job_title,
          target_industry, seniority_level, job_description_text, job_description_url)
        data.education[]   → education table (one row per entry, display_order 0-N)
        data.workExperience[] → work_experience + bullet_points (decompose bullets[])
        data.skills.{technical,programming,tools,language,domain}[] → skills table
          (one row per skill_name, set category appropriately)
        data.projects[]    → projects
        data.certifications[] → certifications
        data.volunteer[]   → volunteer_experience
        data.publications[] → publications
        data.awards[]      → awards
        data.professionalSummary → professional_summary

   b. Use upserts (INSERT … ON CONFLICT DO UPDATE) so the script is IDEMPOTENT —
      safe to re-run after partial failure.

   c. Use the resume's id as the parent FK; let Postgres generate child UUIDs.

   d. Log every operation: "[resume <id>] inserted N education rows"

4. After processing all resumes, print a final summary table:
   - Resume count processed
   - Total rows inserted per table
   - Any resumes with errors (and the error)

5. Exit code 0 on success, 1 on any failure.

ALSO WRITE scripts/verify-migration.js that:
   - For each resume, compares JSONB content against the normalized rows
   - Reports any mismatches (e.g., "resume X has 3 education entries in JSONB but
     2 rows in education table")
   - Returns 0 if all match, 1 if any mismatch
   - This will be used as the verification step after backfill.

UPDATE package.json scripts:
   "db:backfill": "node scripts/backfill-normalized.js",
   "db:verify": "node scripts/verify-migration.js"

CONSTRAINTS:
- Do NOT modify any other source files in src/.
- Do NOT delete anything from any table.
- Do NOT modify the JSONB data column.
- Reads MUST handle missing/partial data gracefully (a resume might not have all sections).
- The script must be idempotent — running it twice should not produce duplicates.
- Do NOT run the script yourself; only write it.

REPORT back the file paths you created, the table-to-JSONB-key mapping you used,
and any edge cases you handled (empty arrays, missing keys, malformed data).
```

- [ ] **Step 2.2: Review subagent output**

Read both scripts. Verify:
- Idempotent (uses upsert with `ON CONFLICT`)
- Handles missing JSONB keys
- Logs row counts

- [ ] **Step 2.3: USER VERIFICATION GATE**

User runs:
1. `npm run db:backup` — fresh snapshot before backfill
2. `npm run db:backfill` — should print row counts per table
3. `npm run db:verify` — should report 0 mismatches
4. Open Supabase Dashboard → Table Editor → spot check `personal_info`, `education`, `work_experience` rows for one known resume — verify content matches what's in `resumes.data`
5. Test live app: dev server still works, dashboard loads, resumes still readable — **app behavior unchanged**

**STOP HERE.** Confirm verification passed before Phase 3.

- [ ] **Step 2.4: Commit**

```bash
git -C /Users/sk_hga/ScopusResume/scopus add scripts/backfill-normalized.js scripts/verify-migration.js package.json
git -C /Users/sk_hga/ScopusResume/scopus commit -m "feat(db): Phase 2 — backfill JSONB into normalized tables

Idempotent JS script that decomposes resumes.data into the 11 new tables.
Includes verify-migration.js for ongoing JSONB↔normalized consistency checks.
JSONB remains the source of truth; normalized tables are now a synchronized copy.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 3: Dual-read (read from normalized first, fallback JSONB)

**Goal:** `resumeService.js` reads child sections from normalized tables when populated; falls back to JSONB if normalized rows are missing. JSONB still source of truth for writes.

**Risk:** MEDIUM-HIGH. Touches the service layer that every page depends on. Wrong reads = blank or stale fields in the UI.

**Subagent dispatch:**

- [ ] **Step 3.1: Dispatch Phase-3 subagent**

```
You are implementing Phase 3 of a database normalization migration for ScopusResume.

PRECONDITION: Phases 1+2 done. All 16 tables exist. Normalized tables are populated
to match resumes.data JSONB. JSONB is still the source of truth for writes.

YOUR TASK:

Modify src/services/resumeService.js so that READS draw from normalized tables when
those tables have rows, with JSONB as fallback. WRITES are unchanged in this phase
(still write to JSONB only).

1. Read the current src/services/resumeService.js end to end. Note:
   - rowToResume(row) currently flattens row.data JSONB into the app's resume shape.
   - The app expects: resume.personalInfo, resume.education, resume.workExperience
     (with .bulletPoints), resume.skills (with categories), resume.projects, etc.

2. Refactor so getResumes() and getResumeById(id) build the resume object as follows:
   - Fetch the parent resume row (id, name, metadata cols, data, etc.)
   - In parallel, fetch all child rows for that resume_id from the 11 normalized tables
   - Build the app's resume shape preferring normalized data when ANY rows exist;
     fall back to data JSONB section when zero normalized rows exist for that section.
   - The fallback is per-section, not all-or-nothing (e.g., normalized education + JSONB
     skills is allowed during partial migration).

3. Use Promise.all to parallelize the child fetches so getResumeById stays under 500ms.

4. Add a new exported helper: assembleResumeFromNormalized(resumeRow, childRowsBySection)
   that takes the row + child arrays and returns the resume shape. Pure function. Easy
   to unit-test.

5. Keep all existing public API intact: getResumes, getResumeById, createResume,
   updateResume, deleteResume, duplicateResume. Their signatures and return shapes
   must be identical to today.

6. WRITES (createResume, updateResume) — DO NOT MODIFY. They still write to JSONB
   only in this phase. Phase 4 will add dual-write.

7. Add a test file src/services/resumeService.test.js (Vitest, matching project conventions):
   - Unit tests for assembleResumeFromNormalized covering: all-normalized, all-fallback,
     mixed (e.g., normalized education + JSONB skills), empty resume
   - Mock supabase with a simple in-memory stub
   - At least 8 test cases

8. Verify your work:
   - Run npm test (or npx vitest run if needed) — all existing tests pass + new ones pass
   - Read the modified resumeService.js back and check for typos / wrong column names
   - Report what you changed and any concerns

CONSTRAINTS:
- Do NOT change writes in this phase.
- Do NOT change any page/component files.
- Do NOT add new dependencies.
- Keep the rowToResume function or its replacement backward-compatible.
- The flag for "use normalized" is ALWAYS ON in this phase — no env var, no toggle.
  We're committing to normalized reads.

REPORT back the diff of resumeService.js, the new test file, and the npm test output.
```

- [ ] **Step 3.2: Review subagent output**

Read `resumeService.js` diff. Verify:
- Public API unchanged
- Per-section fallback logic correct
- Tests pass

- [ ] **Step 3.3: USER VERIFICATION GATE — manual app smoke test**

User starts dev server (`npm start`) and:
1. Sign in → dashboard loads → all resumes appear
2. Open one resume → all 7 wizard steps show the same data as before Phase 3
3. Personal info, education entries, work experience + bullets, skills tags, projects, certifications, summary — verify each section matches what was there before
4. Open `ResumePreviewPage` → resume renders correctly
5. **If anything looks wrong, STOP and roll back** (`git revert HEAD`)

- [ ] **Step 3.4: Commit (only after smoke test passes)**

```bash
git -C /Users/sk_hga/ScopusResume/scopus add src/services/resumeService.js src/services/resumeService.test.js
git -C /Users/sk_hga/ScopusResume/scopus commit -m "feat(db): Phase 3 — dual-read with normalized-first preference

resumeService now assembles resume objects from the 11 normalized tables when
those tables have rows; falls back to resumes.data JSONB per-section when not.
Writes still go to JSONB only; that changes in Phase 4.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 4: Dual-write (writes go to BOTH stores)

**Goal:** `resumeService.js` writes update both JSONB and normalized tables atomically. Both stores stay in sync going forward.

**Risk:** HIGH. Auto-save fires every 1s. A bug here corrupts data. Required to use Postgres transactions or careful sequencing.

**Subagent dispatch:**

- [ ] **Step 4.1: Dispatch Phase-4 subagent**

```
You are implementing Phase 4 of a database normalization migration for ScopusResume.

PRECONDITION: Phases 1+2+3 done. App reads from normalized tables (with JSONB fallback).
Writes still go to JSONB only.

YOUR TASK:

Modify src/services/resumeService.js so writes update BOTH stores atomically.

1. updateResume(id, updates) — currently writes the entire resume back to data JSONB.
   Change it to:
   a. Compute the diff vs. current state to identify which sections changed.
   b. Write the JSONB blob (unchanged behavior — keeps Phase 3 fallback working).
   c. For each changed section, also UPSERT/DELETE the corresponding rows in the
      normalized table:
        - personal_info: UPSERT by resume_id (UNIQUE)
        - professional_summary: UPSERT by resume_id (UNIQUE)
        - education / work_experience / skills / projects / certifications /
          volunteer_experience / publications / awards: DELETE WHERE resume_id = X,
          then INSERT all current items (simpler than computing diffs; safe because
          children are owned by the resume)
        - bullet_points: cascaded via DELETE on parent work_experience
        - resume metadata cols (target_job_title, etc.) update on the resumes row directly

2. Use a Supabase RPC (Postgres function) for atomicity if practical, OR sequence the
   writes carefully and roll back via a try/catch that restores from the JSONB if the
   normalized writes fail. Since dev data only, prioritize SIMPLICITY — sequenced
   writes with a clear error message are acceptable.

3. createResume(name) — also INSERT empty rows into the appropriate normalized tables
   so subsequent reads work. Specifically, INSERT a personal_info row (UNIQUE per
   resume) and a professional_summary row.

4. deleteResume(id) — leverage ON DELETE CASCADE; the existing single DELETE FROM
   resumes WHERE id=X already cascades. Verify the FK constraints in the migration
   files are correct.

5. duplicateResume — should also duplicate child rows (read from source resume,
   insert under new resume_id).

6. Update src/services/resumeService.test.js with write-path tests:
   - createResume → child rows exist
   - updateResume changes one section → only that section's child rows touched
   - deleteResume → child rows are gone (CASCADE)
   - duplicateResume → child rows duplicated under new id
   - Edge cases: empty arrays, missing fields, partial updates

7. The auto-save path uses updateResume. Confirm by reading src/hooks/useAutoSave.js
   and src/pages/resume-builder/ResumeBuilderPage.jsx that auto-save triggers
   updateResume(id, fullResumeData) on every change after the 1s debounce. The new
   dual-write must handle this 1Hz call rate without contention.

8. Verify your work:
   - Run npm test — all tests pass
   - Read the modified service and tests for correctness
   - Report any concerns about atomicity or auto-save performance

CONSTRAINTS:
- Do NOT change createResume / updateResume / deleteResume signatures.
- Do NOT remove the JSONB write — it's still part of Phase 4 (dropped in Phase 5).
- Do NOT touch any page or component file.
- If a write to normalized tables fails, the whole updateResume call should fail
  (so the user sees a save error rather than silent corruption).

REPORT back: the service diff, test diff, and any concerns about transactional safety.
```

- [ ] **Step 4.2: Review subagent output**

Read service + test diffs. Critical checks:
- Sequenced writes have a clear error path
- DELETE-then-INSERT for repeatables is wrapped to prevent partial-state on failure
- Auto-save path still works

- [ ] **Step 4.3: USER VERIFICATION GATE — comprehensive smoke test**

User starts dev server and:
1. Create new resume → verify a row appears in `resumes` AND `personal_info`
2. Fill out all 7 wizard steps → after 1s pause on each, check Supabase Table Editor:
   - `personal_info` updated
   - `resumes.target_job_title` updated (Step 2)
   - `education` rows added (Step 3)
   - `work_experience` + `bullet_points` rows added (Step 4)
   - `skills` rows added (Step 5)
   - `projects`, `certifications` etc. (Step 6)
   - `professional_summary` populated (Step 7)
3. Navigate **back** through steps → data preserved (auto-save didn't corrupt anything)
4. Run `npm run db:verify` → 0 mismatches between JSONB and normalized
5. Delete a resume → confirm child rows gone (CASCADE worked)
6. Duplicate a resume → confirm child rows duplicated
7. **Run for 24 hours of normal use to surface any auto-save bugs**

- [ ] **Step 4.4: Commit (only after 24-hour verification)**

```bash
git -C /Users/sk_hga/ScopusResume/scopus add src/services/resumeService.js src/services/resumeService.test.js
git -C /Users/sk_hga/ScopusResume/scopus commit -m "feat(db): Phase 4 — dual-write keeps JSONB and normalized tables in sync

resumeService now writes to both stores on every update. DELETE-then-INSERT
strategy for repeatable sections; UPSERT for 1:1 sections. Auto-save (1s
debounced) confirmed safe under sustained editing.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 5: Cut over + drop JSONB column

**Goal:** Normalized tables become the sole source of truth. JSONB column is removed. Schema matches the spec exactly.

**Risk:** VERY HIGH. Destructive migration. JSONB is gone forever after this phase.

**Pre-condition gate:** Phase 4 must have been live for at least 24 hours of active use without `db:verify` reporting a mismatch.

**Subagent dispatch:**

- [ ] **Step 5.1: Final pre-flight check (USER does this BEFORE dispatching subagent)**

User runs:
1. `npm run db:backup` — final snapshot
2. `npm run db:verify` — must show 0 mismatches; if it doesn't, STOP and fix
3. Confirms no Phase 4 issues observed in 24+ hours of use
4. **Explicit "yes, proceed with Phase 5" confirmation to me**

- [ ] **Step 5.2: Dispatch Phase-5 subagent**

```
You are implementing Phase 5 of a database normalization migration for ScopusResume.

PRECONDITION: Phases 1-4 verified working. The user has explicitly confirmed proceed.
The data JSONB column on resumes is about to be removed forever.

YOUR TASK:

1. Modify src/services/resumeService.js:
   - Remove the JSONB read fallback in assembleResumeFromNormalized — read from
     normalized tables only.
   - Remove the JSONB write in updateResume — write to normalized tables only.
   - Remove the data parameter from createResume's INSERT.
   - Remove rowToResume's row.data spread.
   - Update tests accordingly: remove JSONB-fallback tests; tighten normalized-only tests.

2. Write supabase/migrations/006_drop_jsonb.sql:
   ALTER TABLE resumes DROP COLUMN data;
   (No IF EXISTS — we want to fail loudly if data is somehow needed.)

3. Update supabase/schema.sql to be the new canonical schema with the data column gone.

4. Update package.json scripts: remove db:verify (no longer meaningful), keep db:backup.

5. Run npm test — all tests pass.

CONSTRAINTS:
- Do NOT touch any page or component file (the abstraction was the point).
- The migration file is the LAST thing the user runs — only after the code change deploys.

REPORT back: service diff, test diff, migration file path, schema.sql diff.
```

- [ ] **Step 5.3: Review subagent output**

Read all diffs. Verify nothing in src/ outside services was changed.

- [ ] **Step 5.4: USER VERIFICATION GATE**

User:
1. Tests run green: `npm test`
2. Dev server still works on existing resumes (still using JSONB column for now)
3. `npm run db:backup` final final snapshot
4. Run `supabase/migrations/006_drop_jsonb.sql` via Supabase Dashboard SQL Editor
5. Restart dev server → still works (now reads from normalized only)
6. Edit a resume → still works
7. **If ANY of the above fails, immediately restore from the backup** (see Rollback section)

- [ ] **Step 5.5: Commit**

```bash
git -C /Users/sk_hga/ScopusResume/scopus add src/services/resumeService.js src/services/resumeService.test.js supabase/migrations/006_drop_jsonb.sql supabase/schema.sql package.json
git -C /Users/sk_hga/ScopusResume/scopus commit -m "feat(db): Phase 5 — cut over to normalized schema, drop JSONB column

resumeService now reads and writes only to the 11 normalized tables.
The resumes.data JSONB column is dropped. Schema fully matches Technical
Spec §3.3.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Final: Code review + documentation update

**Goal:** Independent review of the full migration; updated architecture docs reflect 16 tables instead of 5.

- [ ] **Step F.1: Dispatch code-reviewer subagent**

Use the `superpowers:code-reviewer` agent with this prompt:

```
Review the database normalization migration for ScopusResume across these commits:
git log --oneline -10 in /Users/sk_hga/ScopusResume/scopus.

Focus areas:
1. Schema completeness vs. Technical Spec §3.3 (PDF at ~/Documents/Shiller
   International University /School Work /Integrative Project III /
   ScopusResume_Technical_Specification.pdf)
2. RLS policies — is every table protected? Any policy that could allow cross-user
   reads or writes?
3. resumeService.js dual-write atomicity — what happens if a network blip kills
   the script mid-write?
4. Auto-save path — can the 1s debounce + dual-write cause races?
5. Anything left referencing the old JSONB shape?

Report: PASS or FAIL with specific issues. Under 400 words.
```

- [ ] **Step F.2: Address any reviewer findings**

If FAIL, dispatch a fix subagent with specific changes. Re-review.

- [ ] **Step F.3: Update architecture documentation**

Update both:
- `~/Documents/Shiller International University /School Work /Integrative Project III /ScopusResume_Architecture_Documentation.md` — reflect new 16-table schema in the "At a Glance" stats and Layer 4 (Supabase) section
- `docs/superpowers/specs/2026-04-28-architecture-documentation-design.md` — note the schema migration in a new "Changelog" section at the bottom

- [ ] **Step F.4: Final commit**

```bash
git -C /Users/sk_hga/ScopusResume/scopus add docs/
git -C /Users/sk_hga/ScopusResume/scopus commit -m "docs: update architecture documentation for normalized schema

Reflects the 5→16 table migration; updates layer-4 Supabase description and
glossary stats. School-folder companion doc updated separately.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Risk Register

| Phase | Risk | Mitigation |
|-------|------|-----------|
| 1 | SQL syntax error fails to apply | User runs migrations in dashboard one at a time; bad migration is reverted before next |
| 1 | Backup script fails silently | Script has explicit error handling and exit codes; user verifies file exists with non-zero size |
| 2 | Backfill misses sections (incomplete decomposition) | `db:verify` script compares JSONB ↔ normalized; user spot-checks 1-2 resumes |
| 2 | Backfill double-inserts on re-run | All inserts use `ON CONFLICT DO UPDATE` (idempotent) |
| 3 | UI shows blank fields after dual-read | Per-section JSONB fallback catches missing data; user smoke-tests every wizard step |
| 4 | Auto-save corrupts state under contention | Dual-write is sequenced inside a single updateResume call; debounce ensures only one in flight at a time |
| 4 | Partial write leaves stores out of sync | DELETE-then-INSERT for repeatables; failed call surfaces an error to the user (no silent corruption) |
| 5 | Cutover commit deploys before SQL runs | User runs SQL migration AFTER pulling the code change but BEFORE deploying — sequence is in Step 5.4 |
| 5 | Dropped JSONB unrecoverable | Final `db:backup` taken in Step 5.4 step 3; restore procedure documented in Rollback below |

---

## Rollback Procedures

**Phase 1 rollback** (schema additions):
- Drop the new tables: `DROP TABLE IF EXISTS user_profiles, personal_info, education, work_experience, bullet_points, professional_summary, skills, certifications, projects, volunteer_experience, publications, awards CASCADE;`
- Drop added columns from resumes: `ALTER TABLE resumes DROP COLUMN target_job_title, DROP COLUMN target_industry, DROP COLUMN seniority_level, DROP COLUMN job_description_text, DROP COLUMN job_description_url, DROP COLUMN resume_format, DROP COLUMN resume_length;`
- `git revert <phase-1-commit>`

**Phase 2 rollback** (backfilled rows):
- Truncate the populated tables (data still safe in JSONB): `TRUNCATE personal_info, education, work_experience, bullet_points, professional_summary, skills, certifications, projects, volunteer_experience, publications, awards CASCADE;`
- `git revert <phase-2-commit>`

**Phase 3 rollback** (dual-read code):
- `git revert <phase-3-commit>` — service goes back to JSONB-only reads

**Phase 4 rollback** (dual-write code):
- `git revert <phase-4-commit>` — service goes back to JSONB-only writes
- Truncate normalized tables (they may now be ahead of JSONB) and re-run `npm run db:backfill`

**Phase 5 rollback** (DROPPED JSONB column — most painful):
- Restore `data` column: `ALTER TABLE resumes ADD COLUMN data JSONB DEFAULT '{}';`
- Run a reverse-backfill script (write one if needed) that re-composes JSONB from normalized rows
- OR restore the entire `resumes` table from the latest `npm run db:backup` JSON file — write a `restore-from-backup.js` if you reach this point
- `git revert <phase-5-commit>`

---

## Done Criteria

- [x] Schema has 16 tables matching Technical Spec §3.3 + 1 project addition (`resume_versions`)
- [x] All tables have RLS policies
- [x] All tables have appropriate indexes per spec §3.4
- [x] `resumeService.js` reads and writes only to normalized tables
- [x] All existing tests pass; new service tests cover normalized paths
- [x] App behavior unchanged from end-user perspective
- [x] `db:backup` and `db:verify` scripts exist for ongoing operations
- [x] Architecture documentation updated
- [x] Code review passed
- [x] All 5 phases committed to git separately so each can be reverted independently
