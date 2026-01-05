-- Add streak_awarded_today column to track if daily streak was already awarded
-- This prevents multiple streak increments when user masters more than 10 cards in a day

ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS streak_awarded_today BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN user_stats.streak_awarded_today IS 'Tracks if streak was already awarded today. Resets when daily_cards_date changes.';

