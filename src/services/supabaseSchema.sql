-- ============================================================
-- ScopusResume — Phase 1 Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add metadata columns to the resumes table
--    (resume content stays in the existing JSONB data column)
-- ────────────────────────────────────────────────────────────
ALTER TABLE resumes
  ADD COLUMN IF NOT EXISTS template_id    VARCHAR(50)     DEFAULT 'modern',
  ADD COLUMN IF NOT EXISTS ats_score      DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS status         VARCHAR(20)     DEFAULT 'draft'
                                          CHECK (status IN ('draft', 'complete')),
  ADD COLUMN IF NOT EXISTS current_step   SMALLINT        DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_exported_at TIMESTAMPTZ;


-- ────────────────────────────────────────────────────────────
-- 2. ATS Scores cache
--    Stores scored results per resume + JD hash combo.
--    Cache TTL is handled at the application layer (1 hour).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ats_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id           UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_description_hash VARCHAR(64),
  overall_score       DECIMAL(5,2),
  keyword_score       DECIMAL(5,2),
  format_score        DECIMAL(5,2),
  impact_score        DECIMAL(5,2),
  completeness_score  DECIMAL(5,2),
  missing_keywords    JSONB DEFAULT '[]',
  suggestions         JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ats_resume_id
  ON ats_scores(resume_id);

CREATE INDEX IF NOT EXISTS idx_ats_resume_jd
  ON ats_scores(resume_id, job_description_hash);


-- ────────────────────────────────────────────────────────────
-- 3. Job Description analyses
--    Stores parsed JD analysis results (required/preferred
--    skills, keywords, seniority signals, culture hints).
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_analyses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id           UUID REFERENCES resumes(id) ON DELETE SET NULL,
  job_description_text TEXT NOT NULL,
  job_title           VARCHAR(200),
  seniority_level     VARCHAR(20),
  required_skills     JSONB DEFAULT '[]',
  preferred_skills    JSONB DEFAULT '[]',
  keywords            JSONB DEFAULT '[]',
  culture_signals     JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_analyses_resume_id
  ON job_analyses(resume_id);


-- ────────────────────────────────────────────────────────────
-- 4. Export history
--    One record per export event. Tracks format, template,
--    language, and file metadata.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS export_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id       UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  format          VARCHAR(10) CHECK (format IN ('pdf', 'docx', 'txt', 'html')),
  language        VARCHAR(10) DEFAULT 'en',
  template_id     VARCHAR(50),
  file_url        VARCHAR(1000),
  file_size_bytes INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_history_resume_id
  ON export_history(resume_id);


-- ────────────────────────────────────────────────────────────
-- Done. Verify:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'resumes' ORDER BY column_name;
-- ────────────────────────────────────────────────────────────
