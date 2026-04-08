-- ============================================================
-- ScopusResume database schema
-- Run in Supabase SQL Editor: Project → SQL → New Query
-- ============================================================

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT 'Untitled Resume',
  data        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
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
