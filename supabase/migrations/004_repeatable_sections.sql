-- ============================================================
-- 004_repeatable_sections.sql
-- Six repeatable child tables. All have:
--   id (UUID PK), resume_id (FK CASCADE), display_order, created_at
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
