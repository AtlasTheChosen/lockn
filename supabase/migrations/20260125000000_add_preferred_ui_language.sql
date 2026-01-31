-- Add preferred_ui_language to user_profiles for site-wide i18n
-- NULL = use browser/localStorage; otherwise e.g. 'en', 'ru', 'es'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'preferred_ui_language'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN preferred_ui_language text;
    COMMENT ON COLUMN user_profiles.preferred_ui_language IS 'UI locale (e.g. en, ru). NULL = use browser/localStorage.';
  END IF;
END $$;
