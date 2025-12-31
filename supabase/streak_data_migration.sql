/*
  ============================================================
  ONE-TIME DATA MIGRATION: Initialize Streak Data
  ============================================================
  
  Run this SQL in your Supabase SQL Editor AFTER running streak_migration.sql
  
  This will:
  1. Count existing learned cards (rated 4 or 5) per user
  2. Initialize daily_cards_learned and streak based on existing data
  3. Set test deadlines for stacks that are at 100% mastery
  
  ============================================================
*/

-- Step 1: Update daily_cards_learned based on total cards learned today
-- (This assumes cards rated today should count toward today's streak)
UPDATE user_stats us
SET 
  daily_cards_learned = COALESCE((
    SELECT COUNT(*)
    FROM flashcards f
    JOIN card_stacks cs ON f.stack_id = cs.id
    WHERE cs.user_id = us.user_id
    AND f.user_rating >= 4
    AND DATE(f.last_reviewed_at) = CURRENT_DATE
  ), 0),
  daily_cards_date = CURRENT_DATE
WHERE EXISTS (
  SELECT 1 FROM flashcards f
  JOIN card_stacks cs ON f.stack_id = cs.id
  WHERE cs.user_id = us.user_id
);

-- Step 2: Set current_streak to 1 for users who have learned 10+ cards
-- (Give them credit for starting their streak)
UPDATE user_stats
SET current_streak = GREATEST(current_streak, 1),
    longest_streak = GREATEST(longest_streak, 1)
WHERE daily_cards_learned >= 10
AND current_streak = 0;

-- Step 3: Set mastery_reached_at and test_deadline for stacks at 100% mastery
-- that haven't taken the test yet
UPDATE card_stacks
SET 
  mastery_reached_at = COALESCE(mastery_reached_at, updated_at, created_at),
  test_deadline = COALESCE(
    test_deadline,
    (COALESCE(updated_at, created_at) + 
      CASE 
        WHEN card_count >= 50 THEN INTERVAL '10 days'
        WHEN card_count >= 25 THEN INTERVAL '5 days'
        ELSE INTERVAL '2 days'
      END
    )
  )
WHERE mastered_count = card_count
AND card_count > 0
AND (test_progress IS NULL OR test_progress < 100)
AND mastery_reached_at IS NULL;

-- Step 4: Initialize streak_frozen to false and empty array for all users
UPDATE user_stats
SET 
  streak_frozen = COALESCE(streak_frozen, false),
  streak_frozen_stacks = COALESCE(streak_frozen_stacks, '[]'::jsonb)
WHERE streak_frozen IS NULL OR streak_frozen_stacks IS NULL;

-- Step 5: Verify the updates (this will show you the results)
SELECT 
  up.display_name,
  us.current_streak,
  us.daily_cards_learned,
  us.daily_cards_date,
  us.streak_frozen,
  us.total_cards_mastered
FROM user_stats us
JOIN user_profiles up ON us.user_id = up.id;

-- Show stacks with pending test deadlines
SELECT 
  cs.title,
  cs.card_count,
  cs.mastered_count,
  cs.test_progress,
  cs.mastery_reached_at,
  cs.test_deadline,
  CASE 
    WHEN cs.test_deadline < NOW() THEN 'OVERDUE'
    ELSE CONCAT(EXTRACT(DAY FROM (cs.test_deadline - NOW())), ' days left')
  END as status
FROM card_stacks cs
WHERE cs.mastery_reached_at IS NOT NULL
AND (cs.test_progress IS NULL OR cs.test_progress < 100)
ORDER BY cs.test_deadline;

/*
  ============================================================
  DONE! Your streak data has been initialized.
  
  - Users with 10+ cards learned today now have a 1-day streak
  - Stacks at 100% mastery now have test deadlines
  - Streak frozen status initialized
  ============================================================
*/




