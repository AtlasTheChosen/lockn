/*
  ============================================================
  STREAK TRACKING COLUMNS
  ============================================================
  
  Run this SQL in Supabase SQL Editor.
  
  These columns track daily mastered cards and streak:
  - daily_cards_learned: Cards mastered today (resets each day)
  - daily_cards_date: The date of the daily count
  - current_streak: Increments when user hits 10 mastered/day
  - longest_streak: Highest streak ever achieved
  
  ============================================================
*/

-- Add streak tracking columns to user_stats
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS daily_cards_learned integer DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS daily_cards_date date;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS streak_frozen boolean DEFAULT false;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS streak_frozen_stacks jsonb DEFAULT '[]'::jsonb;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS last_activity_date date;

-- Initialize any NULL values
UPDATE user_stats SET
  daily_cards_learned = COALESCE(daily_cards_learned, 0),
  current_streak = COALESCE(current_streak, 0),
  longest_streak = COALESCE(longest_streak, 0),
  streak_frozen = COALESCE(streak_frozen, false),
  streak_frozen_stacks = COALESCE(streak_frozen_stacks, '[]'::jsonb);

-- Verify columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'user_stats' 
AND column_name IN ('daily_cards_learned', 'daily_cards_date', 'current_streak', 'longest_streak', 'streak_frozen')
ORDER BY column_name;

-- Show current values
SELECT 
  us.user_id,
  up.display_name,
  us.daily_cards_learned,
  us.daily_cards_date,
  us.current_streak,
  us.longest_streak
FROM user_stats us
LEFT JOIN user_profiles up ON us.user_id = up.id;

/*
  ============================================================
  DONE! 
  
  How streak works:
  1. When you rate a card "Know" or "Really Know" → daily_cards_learned +1
  2. When daily_cards_learned hits 10 → current_streak +1
  3. Next day → daily_cards_learned resets to 0
  4. If you don't hit 10 cards in a day → streak resets to 0
  ============================================================
*/








