-- Migration: Add character breakdown for non-Latin scripts
-- This adds character-by-character pronunciation breakdown for learning individual letters

-- Add character_breakdown column to flashcards (JSONB array of {character, romanization, name?})
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS character_breakdown JSONB;

-- Add comment for documentation
COMMENT ON COLUMN flashcards.character_breakdown IS 'Character-by-character pronunciation breakdown for non-Latin scripts (e.g., [{character: "П", romanization: "P"}])';

-- Create index for efficient querying (optional, for future features)
CREATE INDEX IF NOT EXISTS idx_flashcards_character_breakdown ON flashcards USING GIN (character_breakdown) WHERE character_breakdown IS NOT NULL;
