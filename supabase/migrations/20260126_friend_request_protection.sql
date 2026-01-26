-- ============================================================
-- FRIEND REQUEST PROTECTION
-- ============================================================
-- 1. Privacy settings for who can send friend requests
-- 2. Rate limiting tracking
-- 3. Auto-expire old pending requests
-- ============================================================

-- Add friend request privacy setting to user_profiles
-- Options: 'everyone' (default), 'friends_of_friends', 'nobody'
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS friend_request_privacy text DEFAULT 'everyone';

-- Add constraint to ensure valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_friend_request_privacy'
  ) THEN
    ALTER TABLE user_profiles 
    ADD CONSTRAINT valid_friend_request_privacy 
    CHECK (friend_request_privacy IN ('everyone', 'friends_of_friends', 'nobody'));
  END IF;
END $$;

-- Add rate limiting columns to user_stats
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS friend_requests_sent_today integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS friend_request_reset_date date;

-- Create index for efficient pending request queries
CREATE INDEX IF NOT EXISTS idx_friendships_pending_created 
ON friendships(created_at) 
WHERE status = 'pending';

-- Function to auto-expire old pending friend requests (older than 14 days)
CREATE OR REPLACE FUNCTION expire_old_friend_requests()
RETURNS integer AS $$
DECLARE
  expired_count integer;
BEGIN
  -- Delete pending requests older than 14 days
  WITH deleted AS (
    DELETE FROM friendships
    WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '14 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM deleted;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily friend request counts (call this daily via cron)
CREATE OR REPLACE FUNCTION reset_daily_friend_request_counts()
RETURNS void AS $$
BEGIN
  UPDATE user_stats
  SET friend_requests_sent_today = 0,
      friend_request_reset_date = CURRENT_DATE
  WHERE friend_request_reset_date IS NULL 
     OR friend_request_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Run cleanup on existing old pending requests
SELECT expire_old_friend_requests();
