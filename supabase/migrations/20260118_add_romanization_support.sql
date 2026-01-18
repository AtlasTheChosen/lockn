-- Migration: Add romanization support for non-Latin languages
-- This adds:
-- 1. romanization column to flashcards for phonetic pronunciation (romaji, pinyin, etc.)
-- 2. script_preference column to card_stacks for alphabet selection (hiragana, simplified, etc.)

-- Add romanization column to flashcards
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS romanization TEXT;

-- Add script_preference column to card_stacks
ALTER TABLE card_stacks ADD COLUMN IF NOT EXISTS script_preference TEXT;

-- Add comment for documentation
COMMENT ON COLUMN flashcards.romanization IS 'Phonetic pronunciation in Latin letters (e.g., romaji for Japanese, pinyin for Chinese)';
COMMENT ON COLUMN card_stacks.script_preference IS 'Writing system preference for non-Latin languages (e.g., hiragana, simplified, hangul)';
