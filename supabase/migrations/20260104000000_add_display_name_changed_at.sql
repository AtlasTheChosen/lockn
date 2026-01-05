-- Add display_name_changed_at column to track when display name was last changed
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS display_name_changed_at timestamptz DEFAULT NULL;

-- Comment explaining the column
COMMENT ON COLUMN user_profiles.display_name_changed_at IS 'Timestamp of last display name change. Users can only change once per month.';

