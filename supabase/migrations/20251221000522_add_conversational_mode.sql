/*
  # Add Conversational Mode Feature

  ## Changes
  1. Add conversational_mode column to card_stacks
    - `conversational_mode` (boolean) - Determines if cards are shown in sequential order (dialogue flow) or randomized

  ## Description
  This adds support for a conversational mode toggle that affects how cards are presented during learning:
  - When enabled: Cards are shown in sequential order, like a back-and-forth dialogue
  - When disabled: Cards are shown in randomized/SRS order
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'card_stacks' AND column_name = 'conversational_mode'
  ) THEN
    ALTER TABLE card_stacks ADD COLUMN conversational_mode boolean DEFAULT false;
  END IF;
END $$;