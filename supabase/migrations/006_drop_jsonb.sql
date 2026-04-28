-- Migration 006: Drop the JSONB `data` column from resumes.
--
-- Phase 5 cut-over: all resume content now lives in the 11 normalized child
-- tables (personal_info, education, work_experience, bullet_points, skills,
-- projects, certifications, volunteer_experience, publications, awards,
-- professional_summary). The `data` JSONB column is no longer read or written
-- by the application — this migration removes it permanently.
--
-- Prerequisites:
--   • Migrations 001–005 applied (schema + normalized tables + indexes + RLS).
--   • npm run db:backfill run against production data.
--   • npm run db:verify confirmed 0 mismatches.

ALTER TABLE resumes DROP COLUMN IF EXISTS data;
