-- Add audio_url column to flashcards for caching ElevenLabs TTS audio
ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS audio_url text;

-- Create storage bucket for audio files (run in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true);

-- Policy to allow authenticated users to upload audio
-- CREATE POLICY "Users can upload audio" ON storage.objects
--   FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'audio');

-- Policy to allow public read of audio files
-- CREATE POLICY "Public can read audio" ON storage.objects
--   FOR SELECT TO public
--   USING (bucket_id = 'audio');

COMMENT ON COLUMN flashcards.audio_url IS 'Cached TTS audio URL from Supabase Storage to avoid repeated ElevenLabs API calls';

