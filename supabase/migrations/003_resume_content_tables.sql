-- ============================================================
-- 003_resume_content_tables.sql
-- Five core resume content tables:
--   personal_info (1:1)
--   education (repeatable)
--   work_experience (repeatable)
--   bullet_points (child of work_experience)
--   professional_summary (1:1)
-- All FKs use ON DELETE CASCADE so deleting a resume cleans
-- up its content automatically.
-- ============================================================

-- personal_info: one row per resume (UNIQUE on resume_id)
CREATE TABLE IF NOT EXISTS personal_info (
  id                     UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id              UUID        NOT NULL UNIQUE REFERENCES resumes(id) ON DELETE CASCADE,
  full_name              TEXT,
  professional_email     TEXT,
  phone_number           TEXT,
  city                   TEXT,
  state                  TEXT,
  target_country_region  TEXT,
  linkedin_url           TEXT,
  portfolio_url          TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- education: many per resume
CREATE TABLE IF NOT EXISTS education (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id            UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  institution_name     TEXT,
  degree_type          TEXT,
  field_of_study       TEXT,
  graduation_month     SMALLINT,
  graduation_year      SMALLINT,
  currently_enrolled   BOOLEAN     DEFAULT FALSE,
  gpa                  NUMERIC(3,2),
  honors_awards        TEXT,
  relevant_coursework  TEXT,
  thesis_title         TEXT,
  display_order        SMALLINT    DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT education_degree_type_check CHECK (
    degree_type IS NULL OR degree_type IN
      ('ba','bs','ma','ms','mba','phd','certificate','other')
  ),
  CONSTRAINT education_graduation_month_check CHECK (
    graduation_month IS NULL OR (graduation_month BETWEEN 1 AND 12)
  ),
  CONSTRAINT education_gpa_check CHECK (
    gpa IS NULL OR (gpa BETWEEN 0 AND 4.00)
  )
);

-- work_experience: many per resume
CREATE TABLE IF NOT EXISTS work_experience (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id            UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  company_name         TEXT,
  job_title            TEXT,
  location             TEXT,
  is_remote            BOOLEAN     DEFAULT FALSE,
  start_month          SMALLINT,
  start_year           SMALLINT,
  end_month            SMALLINT,
  end_year             SMALLINT,
  is_current_role      BOOLEAN     DEFAULT FALSE,
  job_description_raw  TEXT,
  display_order        SMALLINT    DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT work_experience_start_month_check CHECK (
    start_month IS NULL OR (start_month BETWEEN 1 AND 12)
  ),
  CONSTRAINT work_experience_end_month_check CHECK (
    end_month IS NULL OR (end_month BETWEEN 1 AND 12)
  )
);

-- bullet_points: many per work_experience (no direct resume_id; scoped via parent)
-- raw_text is nullable so backfill from existing JSONB tolerates partial/empty bullets.
CREATE TABLE IF NOT EXISTS bullet_points (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  experience_id  UUID        NOT NULL REFERENCES work_experience(id) ON DELETE CASCADE,
  raw_text       TEXT        DEFAULT '',
  ai_text        TEXT,
  is_using_ai    BOOLEAN     DEFAULT TRUE,
  display_order  SMALLINT    DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- professional_summary: one row per resume (UNIQUE on resume_id)
CREATE TABLE IF NOT EXISTS professional_summary (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id        UUID        NOT NULL UNIQUE REFERENCES resumes(id) ON DELETE CASCADE,
  summary_text     TEXT,
  is_ai_generated  BOOLEAN     DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Reuse the update_updated_at() trigger function (declared in 001).
DROP TRIGGER IF EXISTS professional_summary_updated_at ON professional_summary;
CREATE TRIGGER professional_summary_updated_at
  BEFORE UPDATE ON professional_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
