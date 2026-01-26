/*
  # Add Billing Interval to User Profiles

  ## Changes
  - Add billing_interval column to track whether user is on monthly or annual subscription
  - Allows users to switch between monthly and annual plans without double charging

  ## Notes
  - Column is nullable to support existing users
  - Will be populated by webhook when subscription is created/updated
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'billing_interval'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN billing_interval text CHECK (billing_interval IN ('monthly', 'annual'));
  END IF;
END $$;
