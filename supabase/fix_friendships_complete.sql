/*
  ============================================================
  COMPLETE FRIENDSHIPS FIX
  ============================================================
  
  Run this entire script in your Supabase SQL Editor to fix
  the friendships feature. This will:
  
  1. Ensure the friendships table exists with correct structure
  2. Fix all RLS policies for SELECT, INSERT, UPDATE, DELETE
  3. Enable RLS on the table
  
  ============================================================
*/

-- First, let's check if the table exists and create it if not
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Ensure RLS is enabled
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can insert friendships" ON friendships;
DROP POLICY IF EXISTS "Users can update own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;
DROP POLICY IF EXISTS "Allow users to view their friendships" ON friendships;
DROP POLICY IF EXISTS "Allow users to create friend requests" ON friendships;
DROP POLICY IF EXISTS "Allow users to update their friendships" ON friendships;
DROP POLICY IF EXISTS "Allow users to delete their friendships" ON friendships;

-- ============================================================
-- SELECT POLICY: Who can see which friendships
-- ============================================================
-- user_id can see ALL their friendships (pending they sent, accepted, blocked)
-- friend_id can see PENDING (to accept/decline) and ACCEPTED friendships
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR (auth.uid() = friend_id AND status IN ('pending', 'accepted'))
  );

-- ============================================================
-- INSERT POLICY: Who can create friend requests
-- ============================================================
-- Only the sender (user_id) can create a friendship request
CREATE POLICY "Users can insert friendships"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- UPDATE POLICY: Who can update friendships
-- ============================================================
-- user_id can update (e.g., to block)
-- friend_id can update (e.g., to accept a pending request)
CREATE POLICY "Users can update own friendships"
  ON friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

-- ============================================================
-- DELETE POLICY: Who can delete friendships
-- ============================================================
-- Either party can delete (unfriend, decline request, etc.)
CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- Verify setup
SELECT 
  'Friendships table and policies configured successfully!' as status,
  (SELECT COUNT(*) FROM friendships) as total_friendships,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'friendships') as policy_count;





