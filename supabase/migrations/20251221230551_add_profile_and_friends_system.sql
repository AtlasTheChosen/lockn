/*
  # Add Profile and Friends System

  1. Profile Updates
    - Add display_name, avatar_url, theme_preference, notification_prefs to user_profiles
    - Allow users to customize their profile appearance and settings

  2. New Tables
    - `friendships` table to manage friend relationships
      - Supports pending, accepted, and blocked statuses
      - Bidirectional friendship tracking
    - Includes timestamps for tracking when relationships were created/updated

  3. Storage
    - Create avatars bucket for profile pictures
    - Set up RLS policies for secure avatar access

  4. Security
    - Enable RLS on friendships table
    - Users can only manage their own friendships
    - Users can view accepted friendships
    - Avatar uploads restricted to authenticated users
    - Avatars publicly readable

  5. Indexes
    - Optimized queries for friend lookups
    - Fast status filtering
*/

-- Update user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN display_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN avatar_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'theme_preference'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN theme_preference text DEFAULT 'system';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'notification_prefs'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN notification_prefs jsonb DEFAULT '{"email": true, "push": false, "friend_requests": true, "streak_reminders": true}'::jsonb;
  END IF;
END $$;

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create indexes for friendships
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user_status ON friendships(user_id, status);

-- Enable RLS on friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendships

-- Users can view their own friendships and accepted friendships where they are the friend
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    (auth.uid() = friend_id AND status = 'accepted')
  );

-- Users can create friendship requests
CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Users can update their own friendships
CREATE POLICY "Users can update own friendships"
  ON friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete their own friendships
CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for avatar storage

-- Anyone can view avatars (public bucket)
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Authenticated users can upload avatars to their own folder
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own avatars
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatars
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_friendships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for friendships updated_at
DROP TRIGGER IF EXISTS friendships_updated_at ON friendships;
CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_friendships_updated_at();
