/*
  ============================================================
  STREAK TRACKING AND GRACE PERIOD MIGRATION
  ============================================================
  
  Run this SQL in your Supabase SQL Editor.
  
  Features:
  - Daily cards learned tracking (10 cards/day to maintain streak)
  - Streak freeze for pending mastery tests
  - Grace period based on stack size (2/5/10 days)
  
  ============================================================
*/

-- Add streak tracking columns to user_stats
DO $$
BEGIN
  -- Daily cards learned counter (resets each day)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'daily_cards_learned') THEN
    ALTER TABLE user_stats ADD COLUMN daily_cards_learned integer DEFAULT 0;
  END IF;
  
  -- Last date cards were learned (to detect new day)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'daily_cards_date') THEN
    ALTER TABLE user_stats ADD COLUMN daily_cards_date date;
  END IF;
  
  -- Streak frozen status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'streak_frozen') THEN
    ALTER TABLE user_stats ADD COLUMN streak_frozen boolean DEFAULT false;
  END IF;
  
  -- Streak frozen reason (pending test stack IDs as JSONB array)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'streak_frozen_stacks') THEN
    ALTER TABLE user_stats ADD COLUMN streak_frozen_stacks jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add grace period tracking to card_stacks
DO $$
BEGIN
  -- When stack reached 100% mastery (all cards Know/Really Know)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_stacks' AND column_name = 'mastery_reached_at') THEN
    ALTER TABLE card_stacks ADD COLUMN mastery_reached_at timestamptz;
  END IF;
  
  -- Grace period deadline for taking test
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_stacks' AND column_name = 'test_deadline') THEN
    ALTER TABLE card_stacks ADD COLUMN test_deadline timestamptz;
  END IF;
END $$;

-- ============================================================
-- DONE! Streak and grace period columns added.
-- ============================================================








