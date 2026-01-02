/*
  ============================================================
  FLASHDASH COMPLETE DATABASE SCHEMA
  ============================================================
  
  Run this SQL in your Supabase SQL Editor to ensure all tables exist.
  This script is SAFE to run multiple times - it uses IF NOT EXISTS.
  
  Tables Required:
  1. user_profiles - User profile information
  2. user_stats - User statistics (streaks, cards mastered, etc.)
  3. card_stacks - Flashcard decks/stacks
  4. flashcards - Individual flashcards
  5. friendships - Friend relationships
  6. user_preferences - Theme and UI preferences
  7. generation_logs - AI generation logs
  8. leaderboard_entries - Leaderboard data
  
  ============================================================
*/

-- ============================================================
-- 1. USER_PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  avatar_url text,
  is_premium boolean DEFAULT false,
  is_admin boolean DEFAULT false,
  credits integer DEFAULT 3,
  theme_preference text DEFAULT 'system',
  notification_prefs jsonb DEFAULT '{"email": true, "push": false, "friend_requests": true, "streak_reminders": true}'::jsonb,
  username_public boolean DEFAULT true,
  profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'friends')),
  stack_sharing_default text DEFAULT 'private' CHECK (stack_sharing_default IN ('public', 'private', 'friends')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns to user_profiles if they don't exist
DO $$
BEGIN
  -- display_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'display_name') THEN
    ALTER TABLE user_profiles ADD COLUMN display_name text;
  END IF;
  
  -- avatar_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE user_profiles ADD COLUMN avatar_url text;
  END IF;
  
  -- is_premium
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_premium') THEN
    ALTER TABLE user_profiles ADD COLUMN is_premium boolean DEFAULT false;
  END IF;
  
  -- is_admin
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_admin') THEN
    ALTER TABLE user_profiles ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
  
  -- credits
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'credits') THEN
    ALTER TABLE user_profiles ADD COLUMN credits integer DEFAULT 3;
  END IF;
  
  -- theme_preference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'theme_preference') THEN
    ALTER TABLE user_profiles ADD COLUMN theme_preference text DEFAULT 'system';
  END IF;
  
  -- notification_prefs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'notification_prefs') THEN
    ALTER TABLE user_profiles ADD COLUMN notification_prefs jsonb DEFAULT '{"email": true, "push": false, "friend_requests": true, "streak_reminders": true}'::jsonb;
  END IF;
  
  -- username_public
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'username_public') THEN
    ALTER TABLE user_profiles ADD COLUMN username_public boolean DEFAULT true;
  END IF;
  
  -- profile_visibility
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'profile_visibility') THEN
    ALTER TABLE user_profiles ADD COLUMN profile_visibility text DEFAULT 'public';
  END IF;
  
  -- stack_sharing_default
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'stack_sharing_default') THEN
    ALTER TABLE user_profiles ADD COLUMN stack_sharing_default text DEFAULT 'private';
  END IF;
  
  -- created_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'created_at') THEN
    ALTER TABLE user_profiles ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  
  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE user_profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON user_profiles;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Allow viewing public profiles for leaderboard/friends
CREATE POLICY "Public profiles are viewable"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (profile_visibility = 'public' OR (select auth.uid()) = id);

-- ============================================================
-- 2. USER_STATS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  total_cards_mastered integer DEFAULT 0,
  total_stacks_completed integer DEFAULT 0,
  total_reviews integer DEFAULT 0,
  last_review_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'current_streak') THEN
    ALTER TABLE user_stats ADD COLUMN current_streak integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'longest_streak') THEN
    ALTER TABLE user_stats ADD COLUMN longest_streak integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'total_cards_mastered') THEN
    ALTER TABLE user_stats ADD COLUMN total_cards_mastered integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'total_stacks_completed') THEN
    ALTER TABLE user_stats ADD COLUMN total_stacks_completed integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'total_reviews') THEN
    ALTER TABLE user_stats ADD COLUMN total_reviews integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'last_review_date') THEN
    ALTER TABLE user_stats ADD COLUMN last_review_date date;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;
DROP POLICY IF EXISTS "Stats viewable for leaderboard" ON user_stats;

CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Allow viewing stats for leaderboard
CREATE POLICY "Stats viewable for leaderboard"
  ON user_stats FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 3. CARD_STACKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS card_stacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target_language text,
  native_language text,
  difficulty text CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  cefr_level text,
  card_count integer DEFAULT 0,
  mastery_percentage integer DEFAULT 0,
  is_public boolean DEFAULT false,
  conversational_mode boolean DEFAULT false,
  user_mistakes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_stacks' AND column_name = 'conversational_mode') THEN
    ALTER TABLE card_stacks ADD COLUMN conversational_mode boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_stacks' AND column_name = 'cefr_level') THEN
    ALTER TABLE card_stacks ADD COLUMN cefr_level text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_stacks' AND column_name = 'user_mistakes') THEN
    ALTER TABLE card_stacks ADD COLUMN user_mistakes text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'card_stacks' AND column_name = 'mastery_percentage') THEN
    ALTER TABLE card_stacks ADD COLUMN mastery_percentage integer DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE card_stacks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own stacks" ON card_stacks;
DROP POLICY IF EXISTS "Users can insert own stacks" ON card_stacks;
DROP POLICY IF EXISTS "Users can update own stacks" ON card_stacks;
DROP POLICY IF EXISTS "Users can delete own stacks" ON card_stacks;

CREATE POLICY "Users can view own stacks"
  ON card_stacks FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own stacks"
  ON card_stacks FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own stacks"
  ON card_stacks FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own stacks"
  ON card_stacks FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- 4. FLASHCARDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid NOT NULL REFERENCES card_stacks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_phrase text NOT NULL,
  native_translation text NOT NULL,
  example_sentence text,
  tone_advice text,
  phonetic text,
  example_sentence text,
  notes text,
  difficulty_rating integer DEFAULT 0,
  times_reviewed integer DEFAULT 0,
  times_correct integer DEFAULT 0,
  last_reviewed timestamptz,
  next_review timestamptz,
  ease_factor numeric DEFAULT 2.5,
  interval_days integer DEFAULT 0,
  card_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add missing columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'card_order') THEN
    ALTER TABLE flashcards ADD COLUMN card_order integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'difficulty_rating') THEN
    ALTER TABLE flashcards ADD COLUMN difficulty_rating integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'ease_factor') THEN
    ALTER TABLE flashcards ADD COLUMN ease_factor numeric DEFAULT 2.5;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flashcards' AND column_name = 'interval_days') THEN
    ALTER TABLE flashcards ADD COLUMN interval_days integer DEFAULT 0;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own flashcards" ON flashcards;
DROP POLICY IF EXISTS "Users can insert own flashcards" ON flashcards;
DROP POLICY IF EXISTS "Users can update own flashcards" ON flashcards;
DROP POLICY IF EXISTS "Users can delete own flashcards" ON flashcards;

CREATE POLICY "Users can view own flashcards"
  ON flashcards FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own flashcards"
  ON flashcards FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own flashcards"
  ON flashcards FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own flashcards"
  ON flashcards FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- 5. FRIENDSHIPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;

CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = user_id OR 
    ((select auth.uid()) = friend_id AND status = 'accepted')
  );

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id AND status = 'pending');

CREATE POLICY "Users can update own friendships"
  ON friendships FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id OR (select auth.uid()) = friend_id)
  WITH CHECK ((select auth.uid()) = user_id OR (select auth.uid()) = friend_id);

CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id OR (select auth.uid()) = friend_id);

-- ============================================================
-- 6. USER_PREFERENCES TABLE (MISSING - CAUSING 404 ERRORS!)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  theme_id text DEFAULT 'midnight-black',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================
-- 7. GENERATION_LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stack_id uuid REFERENCES card_stacks(id) ON DELETE SET NULL,
  prompt text,
  card_count integer,
  model_used text,
  tokens_used integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own logs" ON generation_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON generation_logs;

CREATE POLICY "Users can view own logs"
  ON generation_logs FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own logs"
  ON generation_logs FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================
-- 8. LEADERBOARD_ENTRIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer DEFAULT 0,
  rank integer,
  period text CHECK (period IN ('daily', 'weekly', 'monthly', 'all_time')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Leaderboard entries are publicly viewable" ON leaderboard_entries;
DROP POLICY IF EXISTS "Users can insert own leaderboard entry" ON leaderboard_entries;
DROP POLICY IF EXISTS "Users can update own leaderboard entry" ON leaderboard_entries;

CREATE POLICY "Leaderboard entries are publicly viewable"
  ON leaderboard_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own leaderboard entry"
  ON leaderboard_entries FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own leaderboard entry"
  ON leaderboard_entries FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================
-- 9. STORAGE BUCKET FOR AVATARS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (if not exists)
DO $$
BEGIN
  -- These might already exist, so we use exception handling
  BEGIN
    CREATE POLICY "Avatars are publicly accessible"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'avatars');
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    CREATE POLICY "Users can upload own avatar"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    CREATE POLICY "Users can update own avatar"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    CREATE POLICY "Users can delete own avatar"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
      );
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ============================================================
-- 10. INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_card_stacks_user_id ON card_stacks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_stack_id ON flashcards(stack_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_user_id ON generation_logs(user_id);

-- ============================================================
-- DONE! All tables should now exist with proper structure.
-- ============================================================

-- Verify tables exist
SELECT 'Tables verified:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_profiles', 
  'user_stats', 
  'card_stacks', 
  'flashcards', 
  'friendships', 
  'user_preferences', 
  'generation_logs', 
  'leaderboard_entries'
)
ORDER BY table_name;








