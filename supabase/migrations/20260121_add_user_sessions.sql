/*
  # Add User Sessions Table for Single Device Limit

  1. New Table
    - `user_sessions` table to track active sessions per user
    - Only one valid session allowed per user at a time
    - New login invalidates all previous sessions

  2. Columns
    - id: Primary key
    - user_id: Reference to auth.users
    - session_token: Unique token for session validation
    - device_info: JSON with browser, OS, screen info
    - ip_address: Client IP for audit trail
    - created_at: When session was created
    - last_active_at: Last activity timestamp
    - is_valid: Whether session is still active

  3. Security
    - RLS enabled
    - Users can only manage their own sessions
    - Sessions auto-invalidate when new one is created
*/

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  device_info jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now(),
  is_valid boolean DEFAULT true,
  invalidated_at timestamptz,
  invalidated_reason text
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_valid ON user_sessions(user_id, is_valid) WHERE is_valid = true;

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create sessions for themselves
CREATE POLICY "Users can create own sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions (for invalidation)
CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to invalidate all other sessions when a new one is created
CREATE OR REPLACE FUNCTION invalidate_other_sessions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Invalidate all other valid sessions for this user
  UPDATE user_sessions
  SET 
    is_valid = false,
    invalidated_at = now(),
    invalidated_reason = 'new_session_created'
  WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_valid = true;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-invalidate other sessions on new session insert
DROP TRIGGER IF EXISTS trigger_invalidate_other_sessions ON user_sessions;
CREATE TRIGGER trigger_invalidate_other_sessions
  AFTER INSERT ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_other_sessions();

-- Function to check if a session is valid (can be called from client)
CREATE OR REPLACE FUNCTION check_session_valid(p_session_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_valid boolean;
BEGIN
  SELECT is_valid INTO v_is_valid
  FROM user_sessions
  WHERE session_token = p_session_token
    AND user_id = auth.uid();
  
  -- If no session found or session is invalid, return false
  IF v_is_valid IS NULL OR v_is_valid = false THEN
    RETURN false;
  END IF;
  
  -- Update last_active_at timestamp
  UPDATE user_sessions
  SET last_active_at = now()
  WHERE session_token = p_session_token
    AND user_id = auth.uid();
  
  RETURN true;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_session_valid(text) TO authenticated;

-- Clean up old invalidated sessions (older than 30 days)
-- This can be run periodically via a cron job
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE is_valid = false
    AND invalidated_at < now() - interval '30 days';
END;
$$;
