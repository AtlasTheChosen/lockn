-- Migration: Add streak_countdown_starts column to user_stats
-- This column tracks when the streak countdown begins (midnight of the day streak was earned)
-- Cards become locked at this time - downgrading them after this point triggers streak penalty

-- Add the countdown starts column
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS streak_countdown_starts timestamptz;

-- Add comment for documentation
COMMENT ON COLUMN user_stats.streak_countdown_starts IS 
'UTC timestamp of when streak countdown begins (midnight of the day streak was earned). Cards are locked after this time.';

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_stats_countdown_starts 
ON user_stats(streak_countdown_starts) 
WHERE streak_countdown_starts IS NOT NULL;
