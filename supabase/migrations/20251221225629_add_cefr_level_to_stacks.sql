/*
  # Add CEFR level to card stacks

  1. Changes
    - Add `cefr_level` text column to `card_stacks` table
    - This stores the difficulty level of the stack (A1, A2, B1, B2, C1, C2)
    - Used for weighted rank calculations

  2. Structure
    - cefr_level: Text column with CEFR level (A1-C2)
    - Default to 'B1' for existing stacks
    - Indexed for performance on queries

  3. Notes
    - CEFR levels represent Common European Framework of Reference
    - Used to weight stack difficulty in user progress calculations
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'card_stacks' AND column_name = 'cefr_level'
  ) THEN
    ALTER TABLE card_stacks ADD COLUMN cefr_level text DEFAULT 'B1';
    CREATE INDEX IF NOT EXISTS idx_card_stacks_cefr_level ON card_stacks(cefr_level);
  END IF;
END $$;
