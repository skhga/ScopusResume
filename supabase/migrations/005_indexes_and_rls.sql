-- ============================================================
-- 005_indexes_and_rls.sql
-- Indexes and RLS policies for the 11 new tables added in
-- migrations 001, 003, 004. (user_profiles RLS is already
-- declared in 001 so it is not repeated here.)
-- ============================================================

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------

-- personal_info (1:1 — already UNIQUE on resume_id, but explicit index for joins)
CREATE INDEX IF NOT EXISTS idx_personal_info_resume_id
  ON personal_info (resume_id);

-- education
CREATE INDEX IF NOT EXISTS idx_education_resume_id
  ON education (resume_id);
CREATE INDEX IF NOT EXISTS idx_education_resume_id_display_order
  ON education (resume_id, display_order);

-- work_experience
CREATE INDEX IF NOT EXISTS idx_work_experience_resume_id
  ON work_experience (resume_id);
CREATE INDEX IF NOT EXISTS idx_work_experience_resume_id_display_order
  ON work_experience (resume_id, display_order);

-- bullet_points (no resume_id — scoped by experience_id)
CREATE INDEX IF NOT EXISTS idx_bullet_points_experience_id_display_order
  ON bullet_points (experience_id, display_order);

-- professional_summary (1:1)
CREATE INDEX IF NOT EXISTS idx_professional_summary_resume_id
  ON professional_summary (resume_id);

-- skills
CREATE INDEX IF NOT EXISTS idx_skills_resume_id
  ON skills (resume_id);
CREATE INDEX IF NOT EXISTS idx_skills_resume_id_display_order
  ON skills (resume_id, display_order);
CREATE INDEX IF NOT EXISTS idx_skills_resume_id_category
  ON skills (resume_id, category);

-- certifications
CREATE INDEX IF NOT EXISTS idx_certifications_resume_id
  ON certifications (resume_id);
CREATE INDEX IF NOT EXISTS idx_certifications_resume_id_display_order
  ON certifications (resume_id, display_order);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_resume_id
  ON projects (resume_id);
CREATE INDEX IF NOT EXISTS idx_projects_resume_id_display_order
  ON projects (resume_id, display_order);

-- volunteer_experience
CREATE INDEX IF NOT EXISTS idx_volunteer_experience_resume_id
  ON volunteer_experience (resume_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_experience_resume_id_display_order
  ON volunteer_experience (resume_id, display_order);

-- publications
CREATE INDEX IF NOT EXISTS idx_publications_resume_id
  ON publications (resume_id);
CREATE INDEX IF NOT EXISTS idx_publications_resume_id_display_order
  ON publications (resume_id, display_order);

-- awards
CREATE INDEX IF NOT EXISTS idx_awards_resume_id
  ON awards (resume_id);
CREATE INDEX IF NOT EXISTS idx_awards_resume_id_display_order
  ON awards (resume_id, display_order);

-- ------------------------------------------------------------
-- Enable RLS on every new content table
-- ------------------------------------------------------------

ALTER TABLE personal_info        ENABLE ROW LEVEL SECURITY;
ALTER TABLE education            ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_experience      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bullet_points        ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills               ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_experience ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards               ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- RLS policies
-- All access is scoped to the owning user via:
--   resume_id IN (SELECT id FROM resumes WHERE user_id = auth.uid())
-- bullet_points is scoped via its parent work_experience.
-- ------------------------------------------------------------

-- personal_info
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

-- education
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

-- work_experience
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

-- bullet_points (scoped via parent work_experience)
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

-- professional_summary
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

-- skills
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

-- certifications
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

-- projects
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

-- volunteer_experience
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

-- publications
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

-- awards
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
