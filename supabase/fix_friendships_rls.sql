/*
  ============================================================
  FIX FRIENDSHIPS RLS POLICY
  ============================================================
  
  The original policy only allowed friend_id to see ACCEPTED friendships.
  This fix allows friend_id to also see PENDING requests (so they can accept them).
  
  Run this in your Supabase SQL Editor.
  ============================================================
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;

-- Create fixed policy that allows:
-- 1. user_id can see all their friendships (any status)
-- 2. friend_id can see pending requests (to accept/decline them)
-- 3. friend_id can see accepted friendships
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    (auth.uid() = friend_id AND status IN ('pending', 'accepted'))
  );

-- Verify the policy was created
SELECT 'Friendships RLS policy fixed! Recipients can now see pending requests.' as status;





