-- Add has_seen_streak_tutorial column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS has_seen_streak_tutorial BOOLEAN DEFAULT FALSE;

-- Comment for documentation
COMMENT ON COLUMN user_profiles.has_seen_streak_tutorial IS 'Tracks if user has seen the streak rules tutorial';


