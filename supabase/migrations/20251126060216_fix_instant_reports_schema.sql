/*
  # Fix instant_reports table schema

  ## Changes Made
  
  1. Schema Fixes
    - Drop and recreate `created_by` column as text (to store username instead of timestamp)
    - The column was incorrectly defined as timestamp but should reference who created the report
  
  2. Important Notes
    - This migration ensures the `created_by` field properly stores the username of the user who created the report
    - Existing data in `created_by` will be lost since it contains invalid timestamp data
    - The `user_id` column already exists and properly references the users table
*/

-- Drop the incorrectly typed created_by column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instant_reports' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE instant_reports DROP COLUMN created_by;
  END IF;
END $$;

-- Add created_by as text to store username
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'instant_reports' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE instant_reports ADD COLUMN created_by text;
  END IF;
END $$;