/*
  # Optimize RLS Policies for Performance

  ## Changes
  This migration optimizes all Row Level Security policies by wrapping auth function calls 
  in SELECT statements to prevent re-evaluation for each row.
  
  ### Tables Updated
  - user_profiles
  - card_stacks
  - flashcards
  - user_stats
  - generation_logs
  - leaderboard_entries

  ## Performance Impact
  - Reduces CPU usage for queries by caching auth.uid() result
  - Improves query performance at scale
  - Follows Supabase best practices

  ## Security
  - No security changes - only performance optimization
  - All policies maintain the same access control logic
*/

-- Drop existing policies and recreate with optimized auth calls

-- ============================================
-- USER_PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

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

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles
      WHERE id = (select auth.uid()) AND is_admin = true
    )
  );

-- ============================================
-- CARD_STACKS TABLE
-- ============================================

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

-- ============================================
-- FLASHCARDS TABLE
-- ============================================

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

-- ============================================
-- USER_STATS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON user_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON user_stats;

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

-- ============================================
-- GENERATION_LOGS TABLE
-- ============================================

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

-- ============================================
-- LEADERBOARD_ENTRIES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can insert own leaderboard entry" ON leaderboard_entries;
DROP POLICY IF EXISTS "Users can update own leaderboard entry" ON leaderboard_entries;

CREATE POLICY "Users can insert own leaderboard entry"
  ON leaderboard_entries FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own leaderboard entry"
  ON leaderboard_entries FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);
