/*
  ============================================================
  COMPLETE STREAK & WEEKLY STATS SETUP
  ============================================================
  
  Run this SQL in your Supabase SQL Editor.
  This ensures all required columns exist and are initialized.
  
  ============================================================
*/

-- ============================================================
-- STEP 1: Add all required columns to user_stats
-- ============================================================

-- Daily cards passed counter (resets each day)
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS daily_cards_learned integer DEFAULT 0;

-- Last date cards were passed (to detect new day)
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS daily_cards_date date;

-- Streak frozen status
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS streak_frozen boolean DEFAULT false;

-- Streak frozen stacks (IDs of stacks with overdue tests)
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS streak_frozen_stacks jsonb DEFAULT '[]'::jsonb;

-- Weekly cards history
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS weekly_cards_history jsonb DEFAULT '[]'::jsonb;

-- Current week cards passed
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS current_week_cards integer DEFAULT 0;

-- Current week start timestamp
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS current_week_start timestamptz;

-- Pause weekly tracking flag
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS pause_weekly_tracking boolean DEFAULT false;

-- Last card learned timestamp
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS last_card_learned_at timestamptz;

-- Total cards mastered (passed in tests)
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_cards_mastered integer DEFAULT 0;

-- ============================================================
-- STEP 2: Add grace period columns to card_stacks
-- ============================================================

-- When stack reached 100% mastery
ALTER TABLE card_stacks ADD COLUMN IF NOT EXISTS mastery_reached_at timestamptz;

-- Test deadline (grace period end)
ALTER TABLE card_stacks ADD COLUMN IF NOT EXISTS test_deadline timestamptz;

-- ============================================================
-- STEP 3: Initialize NULL values to defaults for existing rows
-- ============================================================

UPDATE user_stats SET
  daily_cards_learned = COALESCE(daily_cards_learned, 0),
  streak_frozen = COALESCE(streak_frozen, false),
  streak_frozen_stacks = COALESCE(streak_frozen_stacks, '[]'::jsonb),
  weekly_cards_history = COALESCE(weekly_cards_history, '[]'::jsonb),
  current_week_cards = COALESCE(current_week_cards, 0),
  pause_weekly_tracking = COALESCE(pause_weekly_tracking, false),
  total_cards_mastered = COALESCE(total_cards_mastered, 0),
  current_streak = COALESCE(current_streak, 0),
  longest_streak = COALESCE(longest_streak, 0);

-- ============================================================
-- STEP 4: Verify columns exist (this query should return results)
-- ============================================================

SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_stats' 
AND column_name IN (
  'daily_cards_learned', 
  'daily_cards_date', 
  'streak_frozen', 
  'streak_frozen_stacks',
  'weekly_cards_history',
  'current_week_cards',
  'current_week_start',
  'pause_weekly_tracking',
  'last_card_learned_at',
  'total_cards_mastered',
  'current_streak',
  'longest_streak'
)
ORDER BY column_name;

-- ============================================================
-- STEP 5: Show current user_stats values
-- ============================================================

SELECT 
  us.user_id,
  up.display_name,
  us.current_streak,
  us.daily_cards_learned,
  us.current_week_cards,
  us.total_cards_mastered,
  us.streak_frozen
FROM user_stats us
LEFT JOIN user_profiles up ON us.user_id = up.id;

/*
  ============================================================
  DONE! All columns should now exist and be initialized.
  
  Expected output from Step 4: 12 rows showing all columns
  Expected output from Step 5: Your user stats with values
  ============================================================
*/




