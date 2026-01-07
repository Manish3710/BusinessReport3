/*
  # Fix RLS Policies for Instant Reports

  1. Update Policies
    - Allow admin users to view all reports
    - Allow users to create, update, and delete their own reports
    - Simplified policy checking based on user role from the users table

  2. Security
    - RLS remains enabled
    - Admins can access all data
    - Regular users can only see their own data
*/

DROP POLICY IF EXISTS "Users can view own reports" ON instant_reports;
DROP POLICY IF EXISTS "Users can create own reports" ON instant_reports;
DROP POLICY IF EXISTS "Users can update own reports" ON instant_reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON instant_reports;

CREATE POLICY "Admins can view all reports, users can view own"
  ON instant_reports FOR SELECT
  TO authenticated, anon
  USING (
    (user_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    ))
  );

CREATE POLICY "Admins can create and users can create own reports"
  ON instant_reports FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    (user_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    ))
  );

CREATE POLICY "Admins can update all, users can update own"
  ON instant_reports FOR UPDATE
  TO authenticated, anon
  USING (
    (user_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    ))
  )
  WITH CHECK (
    (user_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    ))
  );

CREATE POLICY "Admins can delete all, users can delete own"
  ON instant_reports FOR DELETE
  TO authenticated, anon
  USING (
    (user_id = auth.uid()) OR
    (EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    ))
  );
