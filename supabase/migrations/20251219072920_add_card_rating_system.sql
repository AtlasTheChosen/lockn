/*
  # Add 5-Level Rating System to Flashcards

  ## Changes
  1. Add user_rating column to flashcards table
    - Stores the user's self-rating (1-5 scale)
    - 1 = Really Don't Know (highest priority)
    - 2 = Don't Know
    - 3 = Neutral
    - 4 = Kinda Know
    - 5 = Really Know (lowest priority)
  
  2. Add stack_size column to card_stacks table
    - Stores the target size selected by user during generation
    - Default to 15 for existing stacks

  ## Notes
  - The existing SM-2 fields (ease_factor, interval_days) remain for backwards compatibility
  - The new rating system will take priority for review scheduling
  - Lower ratings = more frequent reviews
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcards' AND column_name = 'user_rating'
  ) THEN
    ALTER TABLE flashcards ADD COLUMN user_rating integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'card_stacks' AND column_name = 'stack_size'
  ) THEN
    ALTER TABLE card_stacks ADD COLUMN stack_size integer DEFAULT 15;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'card_stacks' AND column_name = 'scenario'
  ) THEN
    ALTER TABLE card_stacks ADD COLUMN scenario text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'card_stacks' AND column_name = 'language'
  ) THEN
    ALTER TABLE card_stacks ADD COLUMN language text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'card_stacks' AND column_name = 'total_cards'
  ) THEN
    ALTER TABLE card_stacks ADD COLUMN total_cards integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'card_stacks' AND column_name = 'mastered_count'
  ) THEN
    ALTER TABLE card_stacks ADD COLUMN mastered_count integer DEFAULT 0;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flashcards_user_rating ON flashcards(user_rating);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review_date);