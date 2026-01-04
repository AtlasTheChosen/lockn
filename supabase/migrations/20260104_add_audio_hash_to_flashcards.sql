/*
  # Add Audio Hash Column to Flashcards
  
  This migration adds an audio_hash column to track which cached audio files
  are used by each flashcard. This enables:
  - Cross-user audio sharing (same word = same cached file)
  - Batch cleanup of orphaned audio files
  
  The hash is computed as: md5(text-language-voiceGender)
*/

-- Add audio_hash column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'flashcards' AND column_name = 'audio_hash'
  ) THEN
    ALTER TABLE flashcards ADD COLUMN audio_hash text;
  END IF;
END $$;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_flashcards_audio_hash ON flashcards(audio_hash);

-- Add comment explaining the column
COMMENT ON COLUMN flashcards.audio_hash IS 'MD5 hash of text-language-gender used to identify cached audio file in storage';

