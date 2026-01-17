/*
  ============================================================
  FULL USER DATA RESET + COLUMN CLEANUP
  ============================================================
  
  This script:
  1. DELETES all user-generated data (stacks, flashcards, tests, etc.)
  2. RESETS user_stats to default values  
  3. RESETS user_profiles (keeps auth account, resets stats-related fields)
  4. IDENTIFIES and OPTIONALLY REMOVES unused columns
  
  Run this in Supabase SQL Editor.
  
  ⚠️ WARNING: This is DESTRUCTIVE! All user learning data will be lost.
  Users will keep their email login but lose all progress.
  
  ============================================================
*/

-- ============================================================
-- STEP 1: DELETE ALL USER-GENERATED DATA
-- ============================================================

-- Delete all flashcards (cascade from stacks won't work if we want to be explicit)
DELETE FROM flashcards;
SELECT 'Deleted all flashcards' as status, COUNT(*) as deleted_count FROM flashcards;

-- Delete all stack tests
DELETE FROM stack_tests;
SELECT 'Deleted all stack_tests' as status;

-- Delete all card stacks
DELETE FROM card_stacks;
SELECT 'Deleted all card_stacks' as status;

-- Delete all generation logs
DELETE FROM generation_logs;
SELECT 'Deleted all generation_logs' as status;

-- Delete all leaderboard entries
DELETE FROM leaderboard_entries;
SELECT 'Deleted all leaderboard_entries' as status;

-- Delete all friendships
DELETE FROM friendships;
SELECT 'Deleted all friendships' as status;

-- Delete all activity feed items (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_feed') THEN
    EXECUTE 'DELETE FROM activity_feed';
  END IF;
END $$;

-- Delete all challenges (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenges') THEN
    EXECUTE 'DELETE FROM challenges';
  END IF;
END $$;

-- Delete all shared stacks (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shared_stacks') THEN
    EXECUTE 'DELETE FROM shared_stacks';
  END IF;
END $$;

SELECT 'STEP 1 COMPLETE: All user-generated data deleted' as status;

-- ============================================================
-- STEP 2: RESET USER_STATS TO DEFAULTS
-- ============================================================

-- Reset all user_stats to fresh state (but keep the records)
UPDATE user_stats SET
  -- Core streak fields
  current_streak = 0,
  longest_streak = 0,
  streak_frozen = false,
  streak_deadline = NULL,
  display_deadline = NULL,
  
  -- Daily tracking
  cards_mastered_today = 0,
  last_mastery_date = NULL,
  streak_awarded_today = false,
  
  -- Totals
  total_cards_mastered = 0,
  total_stacks_completed = 0,
  total_reviews = 0,
  
  -- Weekly tracking
  current_week_cards = 0,
  current_week_start = NULL,
  last_card_learned_at = NULL,
  last_activity_date = NULL,
  
  -- Achievement tracking
  tests_completed = 0,
  perfect_test_streak = 0,
  daily_goal_streak = 0,
  ice_breaker_count = 0,
  
  -- Timezone (keep user's preference)
  -- timezone = timezone,
  
  -- Reset legacy columns if they exist (set to 0/null)
  streak_frozen_stacks = '[]'::jsonb,
  
  updated_at = now();

-- Also try to reset any columns that might exist
DO $$
BEGIN
  -- Reset daily_cards_learned if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'daily_cards_learned') THEN
    EXECUTE 'UPDATE user_stats SET daily_cards_learned = 0';
  END IF;
  
  -- Reset daily_cards_date if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'daily_cards_date') THEN
    EXECUTE 'UPDATE user_stats SET daily_cards_date = NULL';
  END IF;
  
  -- Reset last_review_date if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'last_review_date') THEN
    EXECUTE 'UPDATE user_stats SET last_review_date = NULL';
  END IF;
END $$;

SELECT 'STEP 2 COMPLETE: All user_stats reset to defaults' as status;

-- ============================================================
-- STEP 3: RESET USER_PROFILES (keep identity, reset progress)
-- ============================================================

-- Reset profile fields related to progress/achievements
UPDATE user_profiles SET
  -- Reset badges (earned achievements)
  badges = '[]'::jsonb,
  
  -- Reset generation count
  daily_generations_count = 0,
  daily_generations_reset_at = now(),
  
  -- Keep: display_name, avatar_url, email, is_premium, is_admin
  -- Keep: theme_preference, notification_prefs, profile_visibility
  -- Keep: languages_learning (but could reset if desired)
  
  -- Reset tutorial flag so they see it again
  has_seen_streak_tutorial = false,
  
  updated_at = now();

SELECT 'STEP 3 COMPLETE: User profiles reset (kept identity)' as status;

-- ============================================================
-- STEP 4: IDENTIFY UNUSED COLUMNS
-- ============================================================

-- This query shows all columns in each table so you can identify unused ones
-- Columns with "69" marker would be actively used (manual testing approach)

SELECT 'COLUMN AUDIT - user_stats' as table_name;
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_stats'
ORDER BY ordinal_position;

SELECT 'COLUMN AUDIT - card_stacks' as table_name;
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'card_stacks'
ORDER BY ordinal_position;

SELECT 'COLUMN AUDIT - flashcards' as table_name;
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'flashcards'
ORDER BY ordinal_position;

SELECT 'COLUMN AUDIT - user_profiles' as table_name;
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- ============================================================
-- STEP 5: DROP KNOWN UNUSED COLUMNS (OPTIONAL - RUN SEPARATELY)
-- ============================================================
-- Based on codebase analysis, these columns appear to be UNUSED:
-- Uncomment and run AFTER verifying they're truly not needed

/*
-- FLASHCARDS - unused columns:
ALTER TABLE flashcards DROP COLUMN IF EXISTS phonetic;
ALTER TABLE flashcards DROP COLUMN IF EXISTS notes;
ALTER TABLE flashcards DROP COLUMN IF EXISTS difficulty_rating;
ALTER TABLE flashcards DROP COLUMN IF EXISTS times_reviewed;
ALTER TABLE flashcards DROP COLUMN IF EXISTS times_correct;
ALTER TABLE flashcards DROP COLUMN IF EXISTS last_reviewed;  -- uses last_reviewed_at instead
ALTER TABLE flashcards DROP COLUMN IF EXISTS next_review;    -- uses next_review_date instead

-- CARD_STACKS - unused columns:
ALTER TABLE card_stacks DROP COLUMN IF EXISTS mastery_percentage;  -- uses mastered_count/card_count
ALTER TABLE card_stacks DROP COLUMN IF EXISTS difficulty;          -- uses cefr_level instead
ALTER TABLE card_stacks DROP COLUMN IF EXISTS is_public;           -- not used in current UI
ALTER TABLE card_stacks DROP COLUMN IF EXISTS stack_size;          -- uses card_count
ALTER TABLE card_stacks DROP COLUMN IF EXISTS scenario;            -- stored in title
ALTER TABLE card_stacks DROP COLUMN IF EXISTS language;            -- uses target_language
ALTER TABLE card_stacks DROP COLUMN IF EXISTS total_cards;         -- uses card_count

-- USER_STATS - unused columns:
ALTER TABLE user_stats DROP COLUMN IF EXISTS last_review_date;     -- uses last_activity_date
ALTER TABLE user_stats DROP COLUMN IF EXISTS daily_cards_learned;  -- uses cards_mastered_today
ALTER TABLE user_stats DROP COLUMN IF EXISTS daily_cards_date;     -- uses last_mastery_date
*/

SELECT 'DATA RESET COMPLETE!' as final_status;
SELECT 
  (SELECT COUNT(*) FROM user_profiles) as user_count,
  (SELECT COUNT(*) FROM user_stats) as stats_count,
  (SELECT COUNT(*) FROM card_stacks) as stacks_count,
  (SELECT COUNT(*) FROM flashcards) as flashcards_count;

/*
  ============================================================
  IMPORTANT: AUDIO CLEANUP
  ============================================================
  
  This SQL script does NOT delete audio files from Supabase Storage.
  Audio files (.mp3) are stored in the "audio" bucket and must be
  cleaned up separately.
  
  Options to clean up audio:
  
  1. Use Admin Page (Recommended):
     Go to /admin and click "Reset Data" - it handles audio cleanup automatically
  
  2. Call API manually:
     POST /api/cleanup-audio
     (requires CLEANUP_API_KEY or admin auth)
  
  3. Manual Storage cleanup:
     Go to Supabase Dashboard > Storage > audio bucket > Delete all files
  
  ============================================================
*/
