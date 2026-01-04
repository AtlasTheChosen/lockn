-- ============================================================
-- BACKFILL MASTERED CARD STATS
-- Calculates total_cards_mastered, current_week_cards from existing test data
-- ============================================================

-- Step 1: Calculate total_cards_mastered for each user
-- Based on cards that passed tests (test_progress * card_count)
WITH user_mastered AS (
  SELECT 
    user_id,
    SUM(
      CASE 
        WHEN test_progress IS NOT NULL AND card_count > 0 
        THEN ROUND((test_progress::numeric / 100) * card_count)
        ELSE 0 
      END
    )::integer AS calculated_total_mastered
  FROM card_stacks
  GROUP BY user_id
)
UPDATE user_stats
SET total_cards_mastered = COALESCE(um.calculated_total_mastered, 0)
FROM user_mastered um
WHERE user_stats.user_id = um.user_id;

-- Step 2: Calculate current_week_cards for tests taken this week
-- Week starts on Sunday
WITH week_cards AS (
  SELECT 
    user_id,
    SUM(
      CASE 
        WHEN test_progress IS NOT NULL AND card_count > 0 
          AND last_test_date >= date_trunc('week', CURRENT_DATE)
        THEN ROUND((test_progress::numeric / 100) * card_count)
        ELSE 0 
      END
    )::integer AS cards_this_week
  FROM card_stacks
  GROUP BY user_id
)
UPDATE user_stats
SET 
  current_week_cards = COALESCE(wc.cards_this_week, 0),
  current_week_start = date_trunc('week', CURRENT_DATE)::text
FROM week_cards wc
WHERE user_stats.user_id = wc.user_id;

-- Step 3: Initialize weekly_cards_history if empty
-- Build history from past test data grouped by week
WITH weekly_history AS (
  SELECT 
    user_id,
    date_trunc('week', last_test_date::date)::date AS week_start,
    SUM(
      CASE 
        WHEN test_progress IS NOT NULL AND card_count > 0 
        THEN ROUND((test_progress::numeric / 100) * card_count)
        ELSE 0 
      END
    )::integer AS week_count
  FROM card_stacks
  WHERE last_test_date IS NOT NULL
    AND last_test_date < date_trunc('week', CURRENT_DATE) -- Only past weeks
  GROUP BY user_id, date_trunc('week', last_test_date::date)
  ORDER BY week_start DESC
),
user_history AS (
  SELECT 
    user_id,
    jsonb_agg(
      jsonb_build_object(
        'week', to_char(week_start, 'IYYY-"W"IW'),
        'count', week_count,
        'reset_at', week_start::text
      )
      ORDER BY week_start DESC
    ) AS history
  FROM weekly_history
  GROUP BY user_id
)
UPDATE user_stats
SET weekly_cards_history = COALESCE(uh.history, '[]'::jsonb)
FROM user_history uh
WHERE user_stats.user_id = uh.user_id
  AND (user_stats.weekly_cards_history IS NULL OR user_stats.weekly_cards_history = '[]'::jsonb);

-- Step 4: Ensure all users have initialized values
UPDATE user_stats
SET 
  total_cards_mastered = COALESCE(total_cards_mastered, 0),
  current_week_cards = COALESCE(current_week_cards, 0),
  weekly_cards_history = COALESCE(weekly_cards_history, '[]'::jsonb),
  current_week_start = COALESCE(current_week_start, date_trunc('week', CURRENT_DATE)::text)
WHERE total_cards_mastered IS NULL 
   OR current_week_cards IS NULL 
   OR weekly_cards_history IS NULL;

-- Step 5: Verify the results
SELECT 
  up.display_name,
  us.total_cards_mastered,
  us.current_week_cards,
  jsonb_array_length(us.weekly_cards_history) AS weeks_in_history,
  us.current_streak
FROM user_stats us
JOIN user_profiles up ON us.user_id = up.id
ORDER BY us.total_cards_mastered DESC;

