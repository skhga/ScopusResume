-- ============================================================
-- ScopusResume database schema
-- Run in Supabase SQL Editor: Project > SQL > New Query
-- ============================================================

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL DEFAULT 'Untitled Resume',
  data             JSONB       NOT NULL DEFAULT '{}',
  template_id      TEXT        DEFAULT 'modern',
  ats_score        NUMERIC,
  status           TEXT        DEFAULT 'draft',
  current_step     INTEGER     DEFAULT 1,
  last_exported_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resumes_updated_at
  BEFORE UPDATE ON resumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: users can only access their own resumes
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own resumes"
  ON resumes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resumes"
  ON resumes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resumes"
  ON resumes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resumes"
  ON resumes FOR DELETE USING (auth.uid() = user_id);

-- Resume versions table (application history)
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

CREATE POLICY "Users can select their own versions"
  ON resume_versions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own versions"
  ON resume_versions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own versions"
  ON resume_versions FOR DELETE USING (auth.uid() = user_id);

-- ATS scores table
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

CREATE POLICY "Users can select their own ats_scores"
  ON ats_scores FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own ats_scores"
  ON ats_scores FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- Export history table
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

CREATE POLICY "Users can select their own export_history"
  ON export_history FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own export_history"
  ON export_history FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

-- Job analyses table
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

CREATE POLICY "Users can select their own job_analyses"
  ON job_analyses FOR SELECT
  USING (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own job_analyses"
  ON job_analyses FOR INSERT
  WITH CHECK (resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid()));
