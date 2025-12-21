/*
  # Add user mistakes tracking to card stacks

  1. Changes
    - Add `user_mistakes` JSONB column to `card_stacks` table
    - This will store mistakes made during learning sessions

  2. Structure
    - user_mistakes: Array of mistake objects, each containing:
      - card_id: The flashcard ID
      - target_phrase: The correct phrase
      - user_answer: What the user typed
      - correct_answer: The correct translation
      - timestamp: When the mistake was made
      - mistake_type: Type of error (typo, grammar, vocabulary, etc.)

  3. Notes
    - JSONB type allows flexible storage and efficient querying
    - Default to empty array for new stacks
    - Indexed for performance on large datasets
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'card_stacks' AND column_name = 'user_mistakes'
  ) THEN
    ALTER TABLE card_stacks ADD COLUMN user_mistakes JSONB DEFAULT '[]'::jsonb;
    CREATE INDEX IF NOT EXISTS idx_card_stacks_user_mistakes ON card_stacks USING gin(user_mistakes);
  END IF;
END $$;
