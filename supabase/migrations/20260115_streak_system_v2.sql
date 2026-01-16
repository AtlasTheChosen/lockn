/*
  ============================================================
  STREAK SYSTEM V2 - COMPREHENSIVE MIGRATION
  ============================================================
  
  This migration implements the new streak system with:
  - 5 cards/day requirement (changed from 10)
  - Timezone-aware deadline tracking
  - 2-hour grace period after display deadline
  - Stack locking when contributing to streak
  - Separate tests table with can_unfreeze logic
  - Legacy vs current test distinction
  
  Run this SQL in your Supabase SQL Editor.
  Safe to run multiple times - uses IF NOT EXISTS.
  
  ============================================================
*/

-- ============================================================
-- 1. UPDATE USER_STATS TABLE
-- ============================================================

-- Add timezone column for user-specific deadline calculations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'timezone') THEN
    ALTER TABLE user_stats ADD COLUMN timezone text DEFAULT 'UTC';
  END IF;
END $$;

-- Add cards_mastered_today (replaces/supplements daily_cards_learned for new 5-card system)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'cards_mastered_today') THEN
    ALTER TABLE user_stats ADD COLUMN cards_mastered_today integer DEFAULT 0;
  END IF;
END $$;

-- Add last_mastery_date for tracking which day user last mastered cards
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'last_mastery_date') THEN
    ALTER TABLE user_stats ADD COLUMN last_mastery_date date;
  END IF;
END $$;

-- Add streak_deadline (actual expiration with grace period)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'streak_deadline') THEN
    ALTER TABLE user_stats ADD COLUMN streak_deadline timestamptz;
  END IF;
END $$;

-- Add display_deadline (what user sees - 11:59pm)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'display_deadline') THEN
    ALTER TABLE user_stats ADD COLUMN display_deadline timestamptz;
  END IF;
END $$;

-- Ensure streak_frozen exists (may already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_stats' AND column_name = 'streak_frozen') THEN
    ALTER TABLE user_stats ADD COLUMN streak_frozen boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- 2. UPDATE CARD_STACKS TABLE
-- ============================================================

-- Add status column for stack lifecycle tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'card_stacks' AND column_name = 'status') THEN
    ALTER TABLE card_stacks ADD COLUMN status text DEFAULT 'in_progress';
  END IF;
END $$;

-- Add check constraint for status values (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'card_stacks_status_check'
  ) THEN
    ALTER TABLE card_stacks ADD CONSTRAINT card_stacks_status_check 
      CHECK (status IN ('in_progress', 'pending_test', 'completed'));
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Add contributed_to_streak (stack locking flag)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'card_stacks' AND column_name = 'contributed_to_streak') THEN
    ALTER TABLE card_stacks ADD COLUMN contributed_to_streak boolean DEFAULT false;
  END IF;
END $$;

-- Ensure cards_mastered exists on card_stacks (may already exist as mastered_count)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'card_stacks' AND column_name = 'cards_mastered') THEN
    -- Check if mastered_count exists, if so we'll use that
    IF EXISTS (SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'card_stacks' AND column_name = 'mastered_count') THEN
      -- Create cards_mastered as alias/copy of mastered_count
      ALTER TABLE card_stacks ADD COLUMN cards_mastered integer DEFAULT 0;
      UPDATE card_stacks SET cards_mastered = COALESCE(mastered_count, 0);
    ELSE
      ALTER TABLE card_stacks ADD COLUMN cards_mastered integer DEFAULT 0;
    END IF;
  END IF;
END $$;

-- ============================================================
-- 3. CREATE STACK_TESTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS stack_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stack_id uuid NOT NULL REFERENCES card_stacks(id) ON DELETE CASCADE,
  stack_size integer NOT NULL,
  all_cards_mastered_at timestamptz NOT NULL,
  test_deadline timestamptz NOT NULL,
  display_deadline timestamptz NOT NULL,
  test_status text DEFAULT 'pending' CHECK (test_status IN ('pending', 'passed', 'failed')),
  has_frozen_streak boolean DEFAULT false,
  can_unfreeze_streak boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(stack_id)
);

-- Create indexes for stack_tests
CREATE INDEX IF NOT EXISTS idx_stack_tests_user_id ON stack_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_stack_tests_stack_id ON stack_tests(stack_id);
CREATE INDEX IF NOT EXISTS idx_stack_tests_status ON stack_tests(test_status);
CREATE INDEX IF NOT EXISTS idx_stack_tests_deadline ON stack_tests(test_deadline);

-- Enable RLS on stack_tests
ALTER TABLE stack_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stack_tests
DROP POLICY IF EXISTS "Users can view own tests" ON stack_tests;
CREATE POLICY "Users can view own tests"
  ON stack_tests FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own tests" ON stack_tests;
CREATE POLICY "Users can insert own tests"
  ON stack_tests FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own tests" ON stack_tests;
CREATE POLICY "Users can update own tests"
  ON stack_tests FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own tests" ON stack_tests;
CREATE POLICY "Users can delete own tests"
  ON stack_tests FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- 4. MIGRATE EXISTING TEST DATA
-- ============================================================

-- Migrate existing test_deadline data from card_stacks to stack_tests
INSERT INTO stack_tests (user_id, stack_id, stack_size, all_cards_mastered_at, test_deadline, display_deadline, test_status, can_unfreeze_streak)
SELECT 
  cs.user_id,
  cs.id as stack_id,
  COALESCE(cs.card_count, 10) as stack_size,
  COALESCE(cs.mastery_reached_at, cs.test_deadline - interval '2 days', now()) as all_cards_mastered_at,
  cs.test_deadline,
  cs.test_deadline - interval '2 hours' as display_deadline,
  CASE 
    WHEN cs.test_progress = 100 THEN 'passed'
    ELSE 'pending'
  END as test_status,
  -- If user has streak > 0, tests are current; otherwise legacy
  CASE 
    WHEN us.current_streak > 0 THEN true
    ELSE false
  END as can_unfreeze_streak
FROM card_stacks cs
LEFT JOIN user_stats us ON cs.user_id = us.user_id
WHERE cs.test_deadline IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM stack_tests st WHERE st.stack_id = cs.id)
ON CONFLICT (stack_id) DO NOTHING;

-- Update stack status based on existing data
UPDATE card_stacks cs
SET status = CASE
  WHEN cs.test_progress = 100 THEN 'completed'
  WHEN cs.test_deadline IS NOT NULL THEN 'pending_test'
  ELSE 'in_progress'
END
WHERE cs.status IS NULL OR cs.status = 'in_progress';

-- ============================================================
-- 5. INITIALIZE DEFAULT VALUES
-- ============================================================

-- Set default timezone for users who don't have one
UPDATE user_stats SET timezone = 'UTC' WHERE timezone IS NULL;

-- Initialize cards_mastered_today from daily_cards_learned if available
UPDATE user_stats 
SET cards_mastered_today = COALESCE(daily_cards_learned, 0)
WHERE cards_mastered_today IS NULL OR cards_mastered_today = 0;

-- Set default contributed_to_streak = false for all stacks
UPDATE card_stacks SET contributed_to_streak = false WHERE contributed_to_streak IS NULL;

-- Sync cards_mastered with mastered_count where applicable
UPDATE card_stacks 
SET cards_mastered = COALESCE(mastered_count, 0)
WHERE cards_mastered IS NULL OR cards_mastered = 0;

-- ============================================================
-- 6. VERIFY MIGRATION
-- ============================================================

SELECT 'Migration completed successfully' as status;

-- Show summary of changes
SELECT 
  'user_stats columns' as check_type,
  COUNT(*) as total_users,
  COUNT(timezone) as has_timezone,
  COUNT(cards_mastered_today) as has_cards_mastered_today,
  COUNT(streak_deadline) as has_streak_deadline
FROM user_stats;

SELECT 
  'card_stacks status' as check_type,
  status,
  COUNT(*) as count
FROM card_stacks
GROUP BY status;

SELECT 
  'stack_tests' as check_type,
  test_status,
  COUNT(*) as count,
  SUM(CASE WHEN can_unfreeze_streak THEN 1 ELSE 0 END) as can_unfreeze_count
FROM stack_tests
GROUP BY test_status;
