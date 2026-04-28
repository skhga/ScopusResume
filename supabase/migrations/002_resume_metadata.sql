-- ============================================================
-- 002_resume_metadata.sql
-- Add target/format metadata columns to the existing resumes
-- table. The data JSONB column is intentionally untouched
-- (it remains the source of truth through Phase 4).
-- ============================================================

ALTER TABLE resumes ADD COLUMN IF NOT EXISTS target_job_title    TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS target_industry     TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS seniority_level     TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS job_description_text TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS job_description_url  TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS resume_format       TEXT DEFAULT 'chronological';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS resume_length       TEXT DEFAULT 'one_page';

-- CHECK constraints are added via DO blocks so that re-runs don't fail on
-- "already exists" — Postgres lacks ADD CONSTRAINT IF NOT EXISTS for CHECKs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resumes_seniority_level_check'
  ) THEN
    ALTER TABLE resumes
      ADD CONSTRAINT resumes_seniority_level_check
      CHECK (seniority_level IS NULL OR seniority_level IN ('entry','mid','senior','executive'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resumes_resume_format_check'
  ) THEN
    ALTER TABLE resumes
      ADD CONSTRAINT resumes_resume_format_check
      CHECK (resume_format IN ('chronological','functional','hybrid'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resumes_resume_length_check'
  ) THEN
    ALTER TABLE resumes
      ADD CONSTRAINT resumes_resume_length_check
      CHECK (resume_length IN ('one_page','two_page'));
  END IF;
END $$;
