/*
  ============================================================
  IDENTIFY UNUSED COLUMNS WITH MARKER APPROACH
  ============================================================
  
  Strategy:
  1. Set a marker value (69) in all numeric columns
  2. Set 'MARKER_69' in all text columns  
  3. Use the app normally (create stacks, learn cards, etc.)
  4. Run the check query to see which columns still have markers
  5. Those columns are NOT being used by the application!
  
  ============================================================
*/

-- ============================================================
-- PART A: SET MARKERS IN ALL COLUMNS
-- Run this FIRST, then use the app, then run PART B
-- ============================================================

-- Mark user_stats columns
UPDATE user_stats SET
  current_streak = 69,
  longest_streak = 69,
  total_cards_mastered = 69,
  total_stacks_completed = 69,
  total_reviews = 69,
  current_week_cards = 69,
  cards_mastered_today = 69,
  tests_completed = 69,
  perfect_test_streak = 69,
  daily_goal_streak = 69,
  ice_breaker_count = 69;

-- Mark legacy columns if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_stats' AND column_name = 'daily_cards_learned') THEN
    EXECUTE 'UPDATE user_stats SET daily_cards_learned = 69';
  END IF;
END $$;

SELECT 'user_stats marked with 69' as status;

-- Create a test card_stack with marker values
-- (This is different - we'll check column usage in existing code)
-- For card_stacks, we examine what columns ARE inserted/updated

-- ============================================================
-- PART B: CHECK WHICH COLUMNS STILL HAVE MARKERS
-- Run this AFTER using the app for a while
-- ============================================================

SELECT 'COLUMNS STILL WITH MARKER (69) - Potentially UNUSED:' as check_type;

-- Check user_stats
SELECT 
  'user_stats' as table_name,
  user_id,
  CASE WHEN current_streak = 69 THEN 'UNUSED: current_streak' ELSE NULL END as col1,
  CASE WHEN longest_streak = 69 THEN 'UNUSED: longest_streak' ELSE NULL END as col2,
  CASE WHEN total_cards_mastered = 69 THEN 'UNUSED: total_cards_mastered' ELSE NULL END as col3,
  CASE WHEN total_stacks_completed = 69 THEN 'UNUSED: total_stacks_completed' ELSE NULL END as col4,
  CASE WHEN total_reviews = 69 THEN 'UNUSED: total_reviews' ELSE NULL END as col5,
  CASE WHEN current_week_cards = 69 THEN 'UNUSED: current_week_cards' ELSE NULL END as col6,
  CASE WHEN cards_mastered_today = 69 THEN 'UNUSED: cards_mastered_today' ELSE NULL END as col7,
  CASE WHEN tests_completed = 69 THEN 'UNUSED: tests_completed' ELSE NULL END as col8,
  CASE WHEN perfect_test_streak = 69 THEN 'UNUSED: perfect_test_streak' ELSE NULL END as col9,
  CASE WHEN daily_goal_streak = 69 THEN 'UNUSED: daily_goal_streak' ELSE NULL END as col10,
  CASE WHEN ice_breaker_count = 69 THEN 'UNUSED: ice_breaker_count' ELSE NULL END as col11
FROM user_stats;

-- ============================================================
-- PART C: STATIC ANALYSIS - COLUMNS LIKELY UNUSED
-- Based on codebase grep analysis
-- ============================================================

SELECT 'STATIC ANALYSIS - Columns likely UNUSED based on codebase:' as analysis_type;

-- Flashcards columns NOT found in TypeScript types or code:
SELECT 'flashcards.phonetic' as column_name, 'Not in types.ts, no grep matches' as reason
UNION ALL
SELECT 'flashcards.notes', 'Not in types.ts, no grep matches'
UNION ALL
SELECT 'flashcards.difficulty_rating', 'Not in types.ts, only in schema creation'
UNION ALL
SELECT 'flashcards.times_reviewed', 'types.ts uses review_count instead'
UNION ALL
SELECT 'flashcards.times_correct', 'Not in types.ts, no usage found'
UNION ALL
SELECT 'flashcards.last_reviewed', 'types.ts uses last_reviewed_at instead'
UNION ALL
SELECT 'flashcards.next_review', 'types.ts uses next_review_date instead'
UNION ALL
-- Card stacks columns
SELECT 'card_stacks.mastery_percentage', 'Calculated from mastered_count/card_count'
UNION ALL
SELECT 'card_stacks.difficulty', 'Uses cefr_level instead'
UNION ALL
SELECT 'card_stacks.is_public', 'Social features not implemented'
UNION ALL
SELECT 'card_stacks.stack_size', 'Duplicate of card_count'
UNION ALL
SELECT 'card_stacks.scenario', 'Stored in title field'
UNION ALL
SELECT 'card_stacks.language', 'Uses target_language instead'
UNION ALL
SELECT 'card_stacks.total_cards', 'Duplicate of card_count'
UNION ALL
-- User stats columns  
SELECT 'user_stats.last_review_date', 'Uses last_activity_date instead'
UNION ALL
SELECT 'user_stats.daily_cards_learned', 'Replaced by cards_mastered_today'
UNION ALL
SELECT 'user_stats.daily_cards_date', 'Replaced by last_mastery_date';

-- ============================================================
-- PART D: GENERATE DROP STATEMENTS
-- Review these carefully before running!
-- ============================================================

SELECT 'GENERATED DROP STATEMENTS (review before running):' as action_type;

SELECT '-- Flashcards unused columns:' as sql_statement
UNION ALL
SELECT 'ALTER TABLE flashcards DROP COLUMN IF EXISTS phonetic;'
UNION ALL
SELECT 'ALTER TABLE flashcards DROP COLUMN IF EXISTS notes;'
UNION ALL
SELECT 'ALTER TABLE flashcards DROP COLUMN IF EXISTS difficulty_rating;'
UNION ALL
SELECT 'ALTER TABLE flashcards DROP COLUMN IF EXISTS times_reviewed;'
UNION ALL
SELECT 'ALTER TABLE flashcards DROP COLUMN IF EXISTS times_correct;'
UNION ALL
SELECT 'ALTER TABLE flashcards DROP COLUMN IF EXISTS last_reviewed;'
UNION ALL
SELECT 'ALTER TABLE flashcards DROP COLUMN IF EXISTS next_review;'
UNION ALL
SELECT ''
UNION ALL
SELECT '-- Card stacks unused columns:'
UNION ALL
SELECT 'ALTER TABLE card_stacks DROP COLUMN IF EXISTS mastery_percentage;'
UNION ALL
SELECT 'ALTER TABLE card_stacks DROP COLUMN IF EXISTS difficulty;'
UNION ALL
SELECT 'ALTER TABLE card_stacks DROP COLUMN IF EXISTS is_public;'
UNION ALL
SELECT 'ALTER TABLE card_stacks DROP COLUMN IF EXISTS stack_size;'
UNION ALL
SELECT 'ALTER TABLE card_stacks DROP COLUMN IF EXISTS scenario;'
UNION ALL
SELECT 'ALTER TABLE card_stacks DROP COLUMN IF EXISTS language;'
UNION ALL
SELECT 'ALTER TABLE card_stacks DROP COLUMN IF EXISTS total_cards;'
UNION ALL
SELECT ''
UNION ALL
SELECT '-- User stats unused columns:'
UNION ALL
SELECT 'ALTER TABLE user_stats DROP COLUMN IF EXISTS last_review_date;'
UNION ALL
SELECT 'ALTER TABLE user_stats DROP COLUMN IF EXISTS daily_cards_learned;'
UNION ALL
SELECT 'ALTER TABLE user_stats DROP COLUMN IF EXISTS daily_cards_date;';
