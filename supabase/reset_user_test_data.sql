-- ============================================================
-- RESET USER TEST DATA
-- ============================================================
-- This script clears all card stacks and resets streak/stats
-- for a specific user to allow fresh testing of the gamification system.
--
-- USAGE: Replace 'YOUR_USER_ID' with the actual user UUID
-- ============================================================

-- Step 1: Delete all card stacks for the user
-- (Flashcards will be deleted automatically via CASCADE)
DELETE FROM card_stacks 
WHERE user_id = 'YOUR_USER_ID';

-- Step 2: Reset user stats to fresh state
UPDATE user_stats SET
  -- Streak tracking
  current_streak = 0,
  longest_streak = 0,
  daily_cards_learned = 0,
  daily_cards_date = NULL,
  last_activity_date = NULL,
  
  -- Streak freeze tracking
  streak_frozen = false,
  streak_frozen_stacks = '[]'::jsonb,
  
  -- Weekly tracking
  current_week_cards = 0,
  current_week_start = NULL,
  weekly_cards_history = '[]'::jsonb,
  
  -- Totals
  total_mastered = 0,
  total_reviews = 0,
  total_cards_mastered = 0,
  total_stacks_completed = 0,
  
  -- Achievement tracking
  tests_completed = 0,
  perfect_test_streak = 0,
  daily_goal_streak = 0,
  ice_breaker_count = 0
  
WHERE user_id = 'YOUR_USER_ID';

-- Step 3: Verify the reset
SELECT 
  user_id,
  current_streak,
  streak_frozen,
  streak_frozen_stacks,
  daily_cards_learned,
  total_mastered
FROM user_stats 
WHERE user_id = 'YOUR_USER_ID';

-- ============================================================
-- STREAK RULES REFERENCE
-- ============================================================
-- 1. DAILY REQUIREMENT: Rate 10 cards as "Kinda Know" or better
-- 2. STREAK INCREMENT: When you hit 10 cards AND streak is NOT frozen
-- 3. TEST DEADLINE: After mastering all cards in a stack:
--    - Small stacks (10 cards): 2 days
--    - Medium stacks (25+ cards): 5 days  
--    - Large stacks (50+ cards): 10 days
-- 4. STREAK FREEZE: Triggered when test deadline passes
--    - Streak cannot grow while frozen
--    - IMPORTANT: Daily 10-card requirement STILL applies!
--    - Missing daily cards = streak resets to 0 (even while frozen)
-- 5. UNFREEZE: Complete the overdue test
--    - Removes stack from frozen_stacks
--    - If no more frozen stacks, streak_frozen = false
--    - Resume growing streak from current value
-- ============================================================

