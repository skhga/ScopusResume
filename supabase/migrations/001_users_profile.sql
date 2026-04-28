-- ============================================================
-- 001_users_profile.sql
-- Adds the user_profiles table — replaces the spec's custom
-- "users" table by referencing Supabase auth.users.
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

-- Reuse the shared update_updated_at() trigger function defined in schema.sql.
-- Define it here as well so this migration is self-contained when applied first
-- against an empty database (CREATE OR REPLACE makes this safe to re-run).
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_select_own ON user_profiles;
CREATE POLICY user_profiles_select_own
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_profiles_insert_own ON user_profiles;
CREATE POLICY user_profiles_insert_own
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_profiles_update_own ON user_profiles;
CREATE POLICY user_profiles_update_own
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS user_profiles_delete_own ON user_profiles;
CREATE POLICY user_profiles_delete_own
  ON user_profiles FOR DELETE
  USING (auth.uid() = user_id);
