-- Add grammar_breakdown column to flashcards table for caching AI grammar analysis
-- This allows instant loading of breakdowns instead of generating on-demand

ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS grammar_breakdown JSONB DEFAULT NULL;

-- Add index for faster lookups on cards that need caching
CREATE INDEX IF NOT EXISTS idx_flashcards_needs_cache 
ON flashcards (stack_id) 
WHERE grammar_breakdown IS NULL OR audio_url IS NULL;

-- Comment for documentation
COMMENT ON COLUMN flashcards.grammar_breakdown IS 'Cached AI grammar breakdown JSON: {wordBreakdown, grammarPattern, patternExamples, cognateHint, commonMistake, memoryTrick}';
