/*
  ============================================================
  QUICK RESET - Clear All User Data
  ============================================================
  
  Simple script to delete ALL user data while preserving accounts.
  Run this when you need a clean slate for testing.
  
  PRESERVES:
  - auth.users (login accounts)
  - user_profiles (identity: email, display_name, avatar)
  - user_preferences (theme settings)
  
  DELETES:
  - All flashcards
  - All card stacks  
  - All tests
  - All stats (resets to 0)
  - All friendships
  - All generation logs
  - All leaderboard entries
  
  ============================================================
*/

-- Step 1: Delete all learning data
TRUNCATE TABLE flashcards CASCADE;
TRUNCATE TABLE stack_tests CASCADE;
TRUNCATE TABLE card_stacks CASCADE;
TRUNCATE TABLE generation_logs CASCADE;
TRUNCATE TABLE leaderboard_entries CASCADE;
TRUNCATE TABLE friendships CASCADE;

-- Step 2: Reset user_stats (delete and let app recreate on login)
DELETE FROM user_stats;

-- Step 3: Reset user_profiles progress fields
UPDATE user_profiles SET
  badges = '[]'::jsonb,
  has_seen_streak_tutorial = false,
  daily_generations_count = 0,
  updated_at = now();

-- Verify
SELECT 'RESET COMPLETE' as status;
SELECT 
  'Remaining users: ' || (SELECT COUNT(*) FROM user_profiles)::text as info
UNION ALL
SELECT 
  'Card stacks: ' || (SELECT COUNT(*) FROM card_stacks)::text
UNION ALL  
SELECT
  'Flashcards: ' || (SELECT COUNT(*) FROM flashcards)::text
UNION ALL
SELECT
  'User stats: ' || (SELECT COUNT(*) FROM user_stats)::text;

/*
  ⚠️ AUDIO FILES NOT DELETED BY THIS SCRIPT!
  
  To also delete audio files from Supabase Storage:
  - Use /admin page "Reset Data" button (handles audio automatically), OR
  - Call POST /api/cleanup-audio, OR
  - Manually delete files in Supabase Dashboard > Storage > audio bucket
*/
