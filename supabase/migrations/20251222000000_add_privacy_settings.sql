/*
  # Add Privacy Settings to User Profiles

  ## Changes
  1. Add username_public column - controls if username is visible to others
  2. Add profile_visibility column - controls who can see the profile (public/private/friends)
  3. Add stack_sharing_default column - default sharing setting for new stacks

  ## Notes
  - username_public defaults to true for existing users
  - profile_visibility defaults to 'public' for existing users
  - stack_sharing_default defaults to 'private' for existing users
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'username_public'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN username_public boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'profile_visibility'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'friends'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stack_sharing_default'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stack_sharing_default text DEFAULT 'private' CHECK (stack_sharing_default IN ('public', 'private', 'friends'));
  END IF;
END $$;



