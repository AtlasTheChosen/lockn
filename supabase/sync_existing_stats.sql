/*
  ============================================================
  SYNC EXISTING CARD STATS TO STREAK/WEEKLY TRACKING
  ============================================================
  
  Run this SQL in Supabase SQL Editor to sync your existing 
  test results with the streak and weekly tracking system.
  
  Cards are only counted when they're answered correctly 
  during a TEST, not from review ratings.
  
  ============================================================
*/

-- Step 1: Count total cards mastered per user (from test_notes - passed cards)
-- This counts all cards that have been passed in any test
UPDATE user_stats us
SET total_cards_mastered = COALESCE((
  SELECT SUM(
    jsonb_array_length(
      COALESCE(
        (SELECT jsonb_agg(elem) FROM jsonb_array_elements(cs.test_notes) elem WHERE (elem->>'passed')::boolean = true),
        '[]'::jsonb
      )
    )
  )
  FROM card_stacks cs
  WHERE cs.user_id = us.user_id
  AND cs.test_notes IS NOT NULL
  AND jsonb_array_length(cs.test_notes) > 0
), 0);

-- Step 2: Count cards from tests taken THIS WEEK
UPDATE user_stats us
SET 
  current_week_cards = COALESCE((
    SELECT SUM(
      jsonb_array_length(
        COALESCE(
          (SELECT jsonb_agg(elem) FROM jsonb_array_elements(cs.test_notes) elem WHERE (elem->>'passed')::boolean = true),
          '[]'::jsonb
        )
      )
    )
    FROM card_stacks cs
    WHERE cs.user_id = us.user_id
    AND cs.test_notes IS NOT NULL
    AND jsonb_array_length(cs.test_notes) > 0
    AND cs.last_test_date >= date_trunc('week', CURRENT_DATE)
  ), 0),
  current_week_start = date_trunc('week', CURRENT_DATE)::timestamptz;

-- Step 3: Count cards from tests taken TODAY
UPDATE user_stats us
SET 
  daily_cards_learned = COALESCE((
    SELECT SUM(
      jsonb_array_length(
        COALESCE(
          (SELECT jsonb_agg(elem) FROM jsonb_array_elements(cs.test_notes) elem WHERE (elem->>'passed')::boolean = true),
          '[]'::jsonb
        )
      )
    )
    FROM card_stacks cs
    WHERE cs.user_id = us.user_id
    AND cs.test_notes IS NOT NULL
    AND jsonb_array_length(cs.test_notes) > 0
    AND DATE(cs.last_test_date) = CURRENT_DATE
  ), 0),
  daily_cards_date = CURRENT_DATE;

-- Step 4: Set streak to 1 if user has 10+ cards from tests today
UPDATE user_stats
SET 
  current_streak = GREATEST(COALESCE(current_streak, 0), 1),
  longest_streak = GREATEST(COALESCE(longest_streak, 0), 1)
WHERE daily_cards_learned >= 10;

-- Step 5: Update mastered_count on card_stacks (cards rated know or really know during review)
UPDATE card_stacks cs
SET mastered_count = COALESCE((
  SELECT COUNT(*)
  FROM flashcards f
  WHERE f.stack_id = cs.id
  AND (f.user_rating >= 4 OR f.mastery_level >= 4)
), 0);

-- Step 6: Capitalize existing stack titles
UPDATE card_stacks
SET title = INITCAP(title)
WHERE title != INITCAP(title);

-- Step 7: Initialize streak tracking defaults
UPDATE user_stats
SET 
  streak_frozen = COALESCE(streak_frozen, false),
  streak_frozen_stacks = COALESCE(streak_frozen_stacks, '[]'::jsonb),
  daily_cards_learned = COALESCE(daily_cards_learned, 0),
  current_week_cards = COALESCE(current_week_cards, 0),
  total_cards_mastered = COALESCE(total_cards_mastered, 0);

-- Step 8: Verify the updates
SELECT 
  'User Stats' as info,
  up.display_name,
  us.current_streak as streak,
  us.daily_cards_learned as "Today (test)",
  us.current_week_cards as "This Week (test)",
  us.total_cards_mastered as "Total (test)"
FROM user_stats us
JOIN user_profiles up ON us.user_id = up.id;

SELECT
  'Stack Stats' as info,
  cs.title,
  cs.card_count as total,
  cs.mastered_count as "Mastered (review)",
  cs.test_progress as "Test %",
  CASE WHEN cs.test_notes IS NOT NULL 
    THEN jsonb_array_length(cs.test_notes) 
    ELSE 0 
  END as "Test Notes"
FROM card_stacks cs
ORDER BY cs.created_at DESC;

/*
  ============================================================
  DONE! Your stats should now be synced.
  
  Note: Weekly/Total Cards only count cards answered 
  correctly during a TEST, not from review ratings.
  
  Refresh your dashboard to see the updated values.
  ============================================================
*/
