/*
  # Fix remaining tables to use public role

  ## Purpose
  Change auto_mail_reports and master_uploads policies from 'authenticated'
  role to 'public' role to work with custom authentication using anon key.

  ## Changes Made
  
  1. Fix auto_mail_reports policies (authenticated → public)
  2. Fix master_uploads policies (authenticated → public)
  
  ## Note
  instant_reports and users already use public role
*/

-- Fix auto_mail_reports
DROP POLICY IF EXISTS "Allow authenticated users to view auto mail reports" ON auto_mail_reports;
DROP POLICY IF EXISTS "Allow authenticated users to create auto mail reports" ON auto_mail_reports;
DROP POLICY IF EXISTS "Allow authenticated users to update auto mail reports" ON auto_mail_reports;
DROP POLICY IF EXISTS "Allow authenticated users to delete auto mail reports" ON auto_mail_reports;

CREATE POLICY "Allow public to view auto mail reports"
  ON auto_mail_reports FOR SELECT TO public USING (true);

CREATE POLICY "Allow public to create auto mail reports"
  ON auto_mail_reports FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public to update auto mail reports"
  ON auto_mail_reports FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete auto mail reports"
  ON auto_mail_reports FOR DELETE TO public USING (true);

-- Fix master_uploads
DROP POLICY IF EXISTS "Allow authenticated users to view uploads" ON master_uploads;
DROP POLICY IF EXISTS "Allow authenticated users to create uploads" ON master_uploads;
DROP POLICY IF EXISTS "Allow authenticated users to update uploads" ON master_uploads;
DROP POLICY IF EXISTS "Allow authenticated users to delete uploads" ON master_uploads;

CREATE POLICY "Allow public to view uploads"
  ON master_uploads FOR SELECT TO public USING (true);

CREATE POLICY "Allow public to create uploads"
  ON master_uploads FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public to update uploads"
  ON master_uploads FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public to delete uploads"
  ON master_uploads FOR DELETE TO public USING (true);