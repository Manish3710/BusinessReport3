/*
  # Fix all RLS policies for custom authentication

  ## Purpose
  Update RLS policies across all tables to work with custom authentication
  instead of Supabase Auth (auth.uid()).

  ## Changes Made
  
  1. Fix auto_mail_reports policies
  2. Fix master_uploads policies
  3. Keep instant_reports and users as-is (already permissive)
  
  ## Security Notes
  - Application enforces role-based access at the component level
  - User authentication is managed through custom system
  - RLS is kept enabled but policies are permissive to trust application logic
*/

-- Fix auto_mail_reports policies
DROP POLICY IF EXISTS "Users can view own auto mail reports" ON auto_mail_reports;
DROP POLICY IF EXISTS "Users can create own auto mail reports" ON auto_mail_reports;
DROP POLICY IF EXISTS "Users can update own auto mail reports" ON auto_mail_reports;
DROP POLICY IF EXISTS "Users can delete own auto mail reports" ON auto_mail_reports;

CREATE POLICY "Allow authenticated users to view auto mail reports"
  ON auto_mail_reports
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create auto mail reports"
  ON auto_mail_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update auto mail reports"
  ON auto_mail_reports
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete auto mail reports"
  ON auto_mail_reports
  FOR DELETE
  TO authenticated
  USING (true);

-- Fix master_uploads policies
DROP POLICY IF EXISTS "Users can view own uploads" ON master_uploads;
DROP POLICY IF EXISTS "Admins can view all uploads" ON master_uploads;
DROP POLICY IF EXISTS "Users can create uploads" ON master_uploads;
DROP POLICY IF EXISTS "Users can update own uploads" ON master_uploads;
DROP POLICY IF EXISTS "Users can delete own uploads" ON master_uploads;

CREATE POLICY "Allow authenticated users to view uploads"
  ON master_uploads
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to create uploads"
  ON master_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update uploads"
  ON master_uploads
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete uploads"
  ON master_uploads
  FOR DELETE
  TO authenticated
  USING (true);