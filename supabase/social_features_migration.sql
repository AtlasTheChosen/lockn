/*
  ============================================================
  SOCIAL FEATURES MIGRATION
  ============================================================
  
  Run this SQL in your Supabase SQL Editor.
  
  This adds:
  1. Bio and badges to user_profiles
  2. Activity feed table
  3. Challenges table
  4. Shared stacks table
  5. Proper RLS policies
  
  ============================================================
*/

-- ============================================================
-- 1. UPDATE USER_PROFILES TABLE
-- ============================================================

DO $$
BEGIN
  -- Add bio field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'bio') THEN
    ALTER TABLE user_profiles ADD COLUMN bio text;
  END IF;
  
  -- Add badges field (JSONB array of earned badges)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'badges') THEN
    ALTER TABLE user_profiles ADD COLUMN badges jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  -- Add languages_learning field (array of language codes)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'languages_learning') THEN
    ALTER TABLE user_profiles ADD COLUMN languages_learning text[] DEFAULT '{}';
  END IF;
  
  -- Add profile visibility setting
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'profile_public') THEN
    ALTER TABLE user_profiles ADD COLUMN profile_public boolean DEFAULT true;
  END IF;
END $$;

-- ============================================================
-- 2. CREATE ACTIVITY_FEED TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN (
    'stack_completed',
    'stack_created', 
    'test_passed',
    'streak_milestone',
    'cards_milestone',
    'challenge_won',
    'challenge_started',
    'friend_added',
    'badge_earned'
  )),
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Indexes for activity_feed
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON activity_feed(activity_type);

-- Enable RLS
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_feed
DROP POLICY IF EXISTS "Users can view public activities" ON activity_feed;
CREATE POLICY "Users can view public activities"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own activities" ON activity_feed;
CREATE POLICY "Users can create own activities"
  ON activity_feed FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own activities" ON activity_feed;
CREATE POLICY "Users can delete own activities"
  ON activity_feed FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- 3. CREATE CHALLENGES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenged_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_type text NOT NULL CHECK (challenge_type IN (
    'weekly_cards',
    'complete_stack',
    'streak_competition',
    'daily_cards'
  )),
  title text NOT NULL,
  description text,
  target_value integer DEFAULT 0,
  challenger_progress integer DEFAULT 0,
  challenged_progress integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'declined', 'cancelled')),
  winner_id uuid REFERENCES auth.users(id),
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for challenges
CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON challenges(challenged_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);

-- Enable RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for challenges
DROP POLICY IF EXISTS "Users can view own challenges" ON challenges;
CREATE POLICY "Users can view own challenges"
  ON challenges FOR SELECT
  TO authenticated
  USING (challenger_id = auth.uid() OR challenged_id = auth.uid());

DROP POLICY IF EXISTS "Users can create challenges" ON challenges;
CREATE POLICY "Users can create challenges"
  ON challenges FOR INSERT
  TO authenticated
  WITH CHECK (challenger_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own challenges" ON challenges;
CREATE POLICY "Users can update own challenges"
  ON challenges FOR UPDATE
  TO authenticated
  USING (challenger_id = auth.uid() OR challenged_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own challenges" ON challenges;
CREATE POLICY "Users can delete own challenges"
  ON challenges FOR DELETE
  TO authenticated
  USING (challenger_id = auth.uid());

-- ============================================================
-- 4. CREATE SHARED_STACKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS shared_stacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stack_id uuid NOT NULL REFERENCES card_stacks(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public boolean DEFAULT false,
  copy_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes for shared_stacks
CREATE INDEX IF NOT EXISTS idx_shared_stacks_stack ON shared_stacks(stack_id);
CREATE INDEX IF NOT EXISTS idx_shared_stacks_shared_by ON shared_stacks(shared_by);
CREATE INDEX IF NOT EXISTS idx_shared_stacks_shared_with ON shared_stacks(shared_with);
CREATE INDEX IF NOT EXISTS idx_shared_stacks_public ON shared_stacks(is_public) WHERE is_public = true;

-- Enable RLS
ALTER TABLE shared_stacks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_stacks
DROP POLICY IF EXISTS "Users can view public shared stacks" ON shared_stacks;
CREATE POLICY "Users can view public shared stacks"
  ON shared_stacks FOR SELECT
  TO authenticated
  USING (
    is_public = true OR 
    shared_by = auth.uid() OR 
    shared_with = auth.uid()
  );

DROP POLICY IF EXISTS "Users can share own stacks" ON shared_stacks;
CREATE POLICY "Users can share own stacks"
  ON shared_stacks FOR INSERT
  TO authenticated
  WITH CHECK (shared_by = auth.uid());

DROP POLICY IF EXISTS "Users can update own shared stacks" ON shared_stacks;
CREATE POLICY "Users can update own shared stacks"
  ON shared_stacks FOR UPDATE
  TO authenticated
  USING (shared_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete own shared stacks" ON shared_stacks;
CREATE POLICY "Users can delete own shared stacks"
  ON shared_stacks FOR DELETE
  TO authenticated
  USING (shared_by = auth.uid());

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Function to update challenges updated_at
CREATE OR REPLACE FUNCTION update_challenges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS challenges_updated_at ON challenges;
CREATE TRIGGER challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_challenges_updated_at();

-- ============================================================
-- 6. INITIALIZE EXISTING DATA
-- ============================================================

-- Set default values for existing users
UPDATE user_profiles
SET 
  bio = COALESCE(bio, ''),
  badges = COALESCE(badges, '[]'::jsonb),
  languages_learning = COALESCE(languages_learning, '{}'),
  profile_public = COALESCE(profile_public, true)
WHERE bio IS NULL OR badges IS NULL OR languages_learning IS NULL OR profile_public IS NULL;

-- ============================================================
-- DONE! Run this in Supabase SQL Editor.
-- ============================================================


