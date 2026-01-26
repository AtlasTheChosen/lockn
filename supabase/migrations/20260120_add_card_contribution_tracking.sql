-- ============================================================
-- ADD PER-CARD STREAK CONTRIBUTION TRACKING
-- ============================================================
-- This migration adds tracking for which specific cards contributed
-- to the daily streak, enabling proper card-specific locking and
-- downgrade impact checks.
-- ============================================================

-- Add contributed_to_streak_date column to flashcards table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'flashcards' 
    AND column_name = 'contributed_to_streak_date'
  ) THEN
    ALTER TABLE flashcards 
    ADD COLUMN contributed_to_streak_date date;
  END IF;
END $$;

-- Add index for efficient queries on contributed cards
CREATE INDEX IF NOT EXISTS idx_flashcards_contributed_date 
ON flashcards(contributed_to_streak_date) 
WHERE contributed_to_streak_date IS NOT NULL;

-- Add index for user-specific queries
CREATE INDEX IF NOT EXISTS idx_flashcards_user_contributed 
ON flashcards(user_id, contributed_to_streak_date) 
WHERE contributed_to_streak_date IS NOT NULL;
