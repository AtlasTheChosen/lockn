/*
  ============================================================
  WEEKLY CARDS LEARNED TRACKING MIGRATION
  ============================================================
  
  Run this SQL in your Supabase SQL Editor to add weekly stats tracking.
  This enables the "cards learned per week" ranking system.
  
  ============================================================
*/

-- Add weekly stats columns to user_stats table
DO $$
BEGIN
  -- weekly_cards_history: JSONB array of weekly totals with ISO week identifiers
  -- Format: [{"week": "2024-W52", "count": 45, "reset_at": "2024-12-29T00:01:00Z"}, ...]
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'weekly_cards_history') THEN
    ALTER TABLE user_stats ADD COLUMN weekly_cards_history jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  -- current_week_cards: Current week's card count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'current_week_cards') THEN
    ALTER TABLE user_stats ADD COLUMN current_week_cards integer DEFAULT 0;
  END IF;
  
  -- current_week_start: UTC timestamp of when current week started (Sunday 00:01)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'current_week_start') THEN
    ALTER TABLE user_stats ADD COLUMN current_week_start timestamptz;
  END IF;
  
  -- pause_weekly_tracking: If true, don't reset weekly counts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'pause_weekly_tracking') THEN
    ALTER TABLE user_stats ADD COLUMN pause_weekly_tracking boolean DEFAULT false;
  END IF;
  
  -- last_card_learned_at: Timestamp of last "learned" card (rating >= 4)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'last_card_learned_at') THEN
    ALTER TABLE user_stats ADD COLUMN last_card_learned_at timestamptz;
  END IF;
END $$;

-- Create index for faster queries on weekly stats
CREATE INDEX IF NOT EXISTS idx_user_stats_current_week_cards ON user_stats(current_week_cards DESC);

-- ============================================================
-- DONE! Weekly stats columns added.
-- ============================================================








