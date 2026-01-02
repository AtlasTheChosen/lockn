/*
  # Add Achievement Tracking Stats

  Adds missing columns to user_stats table for proper badge/achievement tracking:
  - tests_completed: Total number of tests completed by the user
  - perfect_test_streak: Consecutive perfect (100%) test scores
  - daily_goal_streak: Consecutive days meeting daily goal (10 cards)
  - ice_breaker_count: Number of times user unfroze their streak

  These stats are used by the achievement/badge system to award badges.
*/

-- Add new columns to user_stats for achievement tracking
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS tests_completed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS perfect_test_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_goal_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ice_breaker_count integer DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN user_stats.tests_completed IS 'Total number of stack tests completed';
COMMENT ON COLUMN user_stats.perfect_test_streak IS 'Current streak of consecutive perfect (100%) test scores';
COMMENT ON COLUMN user_stats.daily_goal_streak IS 'Current streak of consecutive days meeting daily goal (10 cards)';
COMMENT ON COLUMN user_stats.ice_breaker_count IS 'Number of times user completed an overdue test to unfreeze streak';

