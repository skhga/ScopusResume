-- ============================================================
-- ScopusResume database schema (canonical reference)
--
-- The authoritative source going forward is the ordered set of
-- migration files under supabase/migrations/. This file is a
-- single-page snapshot of the full schema for new contributors.
--
-- Apply migrations with:   npm run db:migrate
-- Inspect status with:     npm run db:status
-- Take a snapshot with:    npm run db:backup
-- ============================================================

-- ------------------------------------------------------------
-- Shared trigger: keep updated_at fresh on every row update.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. resumes (extended with normalized metadata columns)
-- ============================================================
CREATE TABLE IF NOT EXISTS resumes (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL DEFAULT 'Untitled Resume',
  data                 JSONB       NOT NULL DEFAULT '{}',
  template_id          TEXT        DEFAULT 'modern',
  ats_score            NUMERIC,
  status               TEXT        DEFAULT 'draft',
  current_step         INTEGER     DEFAULT 1,
  last_exported_at     TIMESTAMPTZ,
  -- Added by 002_resume_metadata.sql
  target_job_title     TEXT,
  target_industry      TEXT,
  seniority_level      TEXT CHECK (
    seniority_level IS NULL OR seniority_level IN ('entry','mid','senior','executive')
  ),
  job_description_text TEXT,
  job_description_url  TEXT,
  resume_format        TEXT DEFAULT 'chronological' CHECK (
    resume_format IN ('chronological','functional','hybrid')
  ),
  resume_length        TEXT DEFAULT 'one_page' CHECK (
    resume_length IN ('one_page','two_page')
  ),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS resumes_updated_at ON resumes;
CREATE TRIGGER resumes_updated_at
  BEFORE UPDATE ON resumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own resumes" ON resumes;
CREATE POLICY "Users can select their own resumes"
  ON resumes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own resumes" ON resumes;
CREATE POLICY "Users can insert their own resumes"
  ON resumes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own resumes" ON resumes;
CREATE POLICY "Users can update their own resumes"
  ON resumes FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own resumes" ON resumes;
CREATE POLICY "Users can delete their own resumes"
  ON resumes FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 2. resume_versions (project-specific; not in spec)
-- ============================================================
CREATE TABLE IF NOT EXISTS resume_versions (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id       UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot        JSONB       NOT NULL,
  job_description TEXT,
  tailored_diffs  JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own versions" ON resume_versions;
CREATE POLICY "Users can select their own versions"
  ON resume_versions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own versions" ON resume_versions;
CREATE POLICY "Users can insert their own versions"
  ON resume_versions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own versions" ON resume_versions;
CREATE POLICY "Users can delete their own versions"
  ON resume_versions FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. ats_scores
-- ============================================================
CREATE TABLE IF NOT EXISTS ats_scores (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id            UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_description_hash TEXT,
  overall_score        NUMERIC,
  keyword_score        NUMERIC,
  format_score         NUMERIC,
  impact_score         NUMERIC,
  completeness_score   NUMERIC,
  missing_keywords     JSONB       DEFAULT '[]',
  suggestions          JSONB       DEFAULT '[]',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ats_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own ats_scores" ON ats_scores;
CREATE POLICY "Users can select their own ats_scores"
  ON ats_scores FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own ats_scores" ON ats_scores;
CREATE POLICY "Users can insert their own ats_scores"
  ON ats_scores FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- ============================================================
-- 4. export_history
-- ============================================================
CREATE TABLE IF NOT EXISTS export_history (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id       UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  format          TEXT        NOT NULL,
  template_id     TEXT        DEFAULT 'modern',
  language        TEXT        DEFAULT 'en',
  file_size_bytes INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own export_history" ON export_history;
CREATE POLICY "Users can select their own export_history"
  ON export_history FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own export_history" ON export_history;
CREATE POLICY "Users can insert their own export_history"
  ON export_history FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- ============================================================
-- 5. job_analyses
-- ============================================================
CREATE TABLE IF NOT EXISTS job_analyses (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id            UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_description_text TEXT,
  job_title            TEXT,
  seniority_level      TEXT,
  required_skills      JSONB       DEFAULT '[]',
  preferred_skills     JSONB       DEFAULT '[]',
  keywords             JSONB       DEFAULT '[]',
  culture_signals      JSONB       DEFAULT '[]',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select their own job_analyses" ON job_analyses;
CREATE POLICY "Users can select their own job_analyses"
  ON job_analyses FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own job_analyses" ON job_analyses;
CREATE POLICY "Users can insert their own job_analyses"
  ON job_analyses FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- ============================================================
-- 6. user_profiles  (replaces spec's custom users table)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name              TEXT,
  avatar_url             TEXT,
  consent_ai_processing  BOOLEAN     DEFAULT FALSE,
  consent_marketing      BOOLEAN     DEFAULT FALSE,
  is_deleted             BOOLEAN     DEFAULT FALSE,
  deleted_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_select_own ON user_profiles;
CREATE POLICY user_profiles_select_own ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS user_profiles_insert_own ON user_profiles;
CREATE POLICY user_profiles_insert_own ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_profiles_update_own ON user_profiles;
CREATE POLICY user_profiles_update_own ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS user_profiles_delete_own ON user_profiles;
CREATE POLICY user_profiles_delete_own ON user_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 7. personal_info  (1:1 with resume)
-- ============================================================
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
CREATE INDEX IF NOT EXISTS idx_personal_info_resume_id ON personal_info (resume_id);

ALTER TABLE personal_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS personal_info_select_own ON personal_info;
CREATE POLICY personal_info_select_own ON personal_info FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS personal_info_insert_own ON personal_info;
CREATE POLICY personal_info_insert_own ON personal_info FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS personal_info_update_own ON personal_info;
CREATE POLICY personal_info_update_own ON personal_info FOR UPDATE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()))
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS personal_info_delete_own ON personal_info;
CREATE POLICY personal_info_delete_own ON personal_info FOR DELETE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- ============================================================
-- 8. education  (repeatable)
-- ============================================================
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
CREATE INDEX IF NOT EXISTS idx_education_resume_id ON education (resume_id);
CREATE INDEX IF NOT EXISTS idx_education_resume_id_display_order ON education (resume_id, display_order);

ALTER TABLE education ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS education_select_own ON education;
CREATE POLICY education_select_own ON education FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS education_insert_own ON education;
CREATE POLICY education_insert_own ON education FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS education_update_own ON education;
CREATE POLICY education_update_own ON education FOR UPDATE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()))
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS education_delete_own ON education;
CREATE POLICY education_delete_own ON education FOR DELETE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- ============================================================
-- 9. work_experience  (repeatable)
-- ============================================================
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
CREATE INDEX IF NOT EXISTS idx_work_experience_resume_id ON work_experience (resume_id);
CREATE INDEX IF NOT EXISTS idx_work_experience_resume_id_display_order ON work_experience (resume_id, display_order);

ALTER TABLE work_experience ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_experience_select_own ON work_experience;
CREATE POLICY work_experience_select_own ON work_experience FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS work_experience_insert_own ON work_experience;
CREATE POLICY work_experience_insert_own ON work_experience FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS work_experience_update_own ON work_experience;
CREATE POLICY work_experience_update_own ON work_experience FOR UPDATE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()))
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS work_experience_delete_own ON work_experience;
CREATE POLICY work_experience_delete_own ON work_experience FOR DELETE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- ============================================================
-- 10. bullet_points  (child of work_experience)
-- raw_text is nullable so backfill from existing JSONB tolerates partial bullets.
-- ============================================================
CREATE TABLE IF NOT EXISTS bullet_points (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  experience_id  UUID        NOT NULL REFERENCES work_experience(id) ON DELETE CASCADE,
  raw_text       TEXT        DEFAULT '',
  ai_text        TEXT,
  is_using_ai    BOOLEAN     DEFAULT TRUE,
  display_order  SMALLINT    DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bullet_points_experience_id_display_order ON bullet_points (experience_id, display_order);

ALTER TABLE bullet_points ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bullet_points_select_own ON bullet_points;
CREATE POLICY bullet_points_select_own ON bullet_points FOR SELECT
  USING (experience_id IN (
    SELECT id FROM work_experience
    WHERE resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid())
  ));
DROP POLICY IF EXISTS bullet_points_insert_own ON bullet_points;
CREATE POLICY bullet_points_insert_own ON bullet_points FOR INSERT
  WITH CHECK (experience_id IN (
    SELECT id FROM work_experience
    WHERE resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid())
  ));
DROP POLICY IF EXISTS bullet_points_update_own ON bullet_points;
CREATE POLICY bullet_points_update_own ON bullet_points FOR UPDATE
  USING (experience_id IN (
    SELECT id FROM work_experience
    WHERE resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid())
  ))
  WITH CHECK (experience_id IN (
    SELECT id FROM work_experience
    WHERE resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid())
  ));
DROP POLICY IF EXISTS bullet_points_delete_own ON bullet_points;
CREATE POLICY bullet_points_delete_own ON bullet_points FOR DELETE
  USING (experience_id IN (
    SELECT id FROM work_experience
    WHERE resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid())
  ));

-- ============================================================
-- 11. professional_summary  (1:1 with resume)
-- ============================================================
CREATE TABLE IF NOT EXISTS professional_summary (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id        UUID        NOT NULL UNIQUE REFERENCES resumes(id) ON DELETE CASCADE,
  summary_text     TEXT,
  is_ai_generated  BOOLEAN     DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_professional_summary_resume_id ON professional_summary (resume_id);

DROP TRIGGER IF EXISTS professional_summary_updated_at ON professional_summary;
CREATE TRIGGER professional_summary_updated_at
  BEFORE UPDATE ON professional_summary
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE professional_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS professional_summary_select_own ON professional_summary;
CREATE POLICY professional_summary_select_own ON professional_summary FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS professional_summary_insert_own ON professional_summary;
CREATE POLICY professional_summary_insert_own ON professional_summary FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS professional_summary_update_own ON professional_summary;
CREATE POLICY professional_summary_update_own ON professional_summary FOR UPDATE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()))
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS professional_summary_delete_own ON professional_summary;
CREATE POLICY professional_summary_delete_own ON professional_summary FOR DELETE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- ============================================================
-- 12. skills  (repeatable, categorized)
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id          UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  category           TEXT,
  skill_name         TEXT,
  proficiency_level  TEXT,
  display_order      SMALLINT    DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT skills_category_check CHECK (
    category IS NULL OR category IN
      ('technical','programming','tools','language','domain')
  )
);
CREATE INDEX IF NOT EXISTS idx_skills_resume_id ON skills (resume_id);
CREATE INDEX IF NOT EXISTS idx_skills_resume_id_display_order ON skills (resume_id, display_order);
CREATE INDEX IF NOT EXISTS idx_skills_resume_id_category ON skills (resume_id, category);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS skills_select_own ON skills;
CREATE POLICY skills_select_own ON skills FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS skills_insert_own ON skills;
CREATE POLICY skills_insert_own ON skills FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS skills_update_own ON skills;
CREATE POLICY skills_update_own ON skills FOR UPDATE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()))
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS skills_delete_own ON skills;
CREATE POLICY skills_delete_own ON skills FOR DELETE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- ============================================================
-- 13. certifications
-- ============================================================
CREATE TABLE IF NOT EXISTS certifications (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id           UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  certification_name  TEXT,
  issuing_body        TEXT,
  date_obtained       DATE,
  credential_id       TEXT,
  display_order       SMALLINT    DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_certifications_resume_id ON certifications (resume_id);
CREATE INDEX IF NOT EXISTS idx_certifications_resume_id_display_order ON certifications (resume_id, display_order);

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS certifications_select_own ON certifications;
CREATE POLICY certifications_select_own ON certifications FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS certifications_insert_own ON certifications;
CREATE POLICY certifications_insert_own ON certifications FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS certifications_update_own ON certifications;
CREATE POLICY certifications_update_own ON certifications FOR UPDATE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()))
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS certifications_delete_own ON certifications;
CREATE POLICY certifications_delete_own ON certifications FOR DELETE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- ============================================================
-- 14. projects
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id           UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  project_title       TEXT,
  description         TEXT,
  technologies_used   JSONB       DEFAULT '[]',
  outcome             TEXT,
  project_url         TEXT,
  display_order       SMALLINT    DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_projects_resume_id ON projects (resume_id);
CREATE INDEX IF NOT EXISTS idx_projects_resume_id_display_order ON projects (resume_id, display_order);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS projects_select_own ON projects;
CREATE POLICY projects_select_own ON projects FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS projects_insert_own ON projects;
CREATE POLICY projects_insert_own ON projects FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS projects_update_own ON projects;
CREATE POLICY projects_update_own ON projects FOR UPDATE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()))
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS projects_delete_own ON projects;
CREATE POLICY projects_delete_own ON projects FOR DELETE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- ============================================================
-- 15. volunteer_experience
-- ============================================================
CREATE TABLE IF NOT EXISTS volunteer_experience (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id          UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  organization_name  TEXT,
  role               TEXT,
  start_date         DATE,
  end_date           DATE,
  description        TEXT,
  display_order      SMALLINT    DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_volunteer_experience_resume_id ON volunteer_experience (resume_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_experience_resume_id_display_order ON volunteer_experience (resume_id, display_order);

ALTER TABLE volunteer_experience ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS volunteer_experience_select_own ON volunteer_experience;
CREATE POLICY volunteer_experience_select_own ON volunteer_experience FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS volunteer_experience_insert_own ON volunteer_experience;
CREATE POLICY volunteer_experience_insert_own ON volunteer_experience FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS volunteer_experience_update_own ON volunteer_experience;
CREATE POLICY volunteer_experience_update_own ON volunteer_experience FOR UPDATE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()))
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS volunteer_experience_delete_own ON volunteer_experience;
CREATE POLICY volunteer_experience_delete_own ON volunteer_experience FOR DELETE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- ============================================================
-- 16. publications
-- ============================================================
CREATE TABLE IF NOT EXISTS publications (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id          UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  publication_title  TEXT,
  authors            JSONB       DEFAULT '[]',
  publication_name   TEXT,
  year               SMALLINT,
  doi_url            TEXT,
  display_order      SMALLINT    DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_publications_resume_id ON publications (resume_id);
CREATE INDEX IF NOT EXISTS idx_publications_resume_id_display_order ON publications (resume_id, display_order);

ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS publications_select_own ON publications;
CREATE POLICY publications_select_own ON publications FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS publications_insert_own ON publications;
CREATE POLICY publications_insert_own ON publications FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS publications_update_own ON publications;
CREATE POLICY publications_update_own ON publications FOR UPDATE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()))
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS publications_delete_own ON publications;
CREATE POLICY publications_delete_own ON publications FOR DELETE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- ============================================================
-- 17. awards
-- ============================================================
CREATE TABLE IF NOT EXISTS awards (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  resume_id       UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  award_name      TEXT,
  awarding_body   TEXT,
  date_received   DATE,
  description     TEXT,
  display_order   SMALLINT    DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_awards_resume_id ON awards (resume_id);
CREATE INDEX IF NOT EXISTS idx_awards_resume_id_display_order ON awards (resume_id, display_order);

ALTER TABLE awards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS awards_select_own ON awards;
CREATE POLICY awards_select_own ON awards FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS awards_insert_own ON awards;
CREATE POLICY awards_insert_own ON awards FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS awards_update_own ON awards;
CREATE POLICY awards_update_own ON awards FOR UPDATE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()))
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS awards_delete_own ON awards;
CREATE POLICY awards_delete_own ON awards FOR DELETE
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
