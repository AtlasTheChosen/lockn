/*
  # Fix Function Search Paths for Security

  ## Changes
  Updates the search_path configuration for database functions to prevent 
  search path hijacking attacks.

  ### Functions Updated
  - handle_new_user: Set secure search_path
  - update_updated_at_column: Set secure search_path

  ## Security Impact
  - Prevents potential privilege escalation via search_path manipulation
  - Follows PostgreSQL security best practices
  - Ensures functions use explicit schema references
*/

-- Recreate handle_new_user function with secure search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.leaderboard_entries (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  RETURN NEW;
END;
$$;

-- Recreate update_updated_at_column function with secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
