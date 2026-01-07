/*
  # Fix Database Performance and Security Issues - Part 1

  1. Performance Improvements
    - Add indexes on all foreign key columns for better query performance
    - Optimize RLS policies to use SELECT wrapper for auth functions

  2. Security Improvements
    - Add RLS policies for tables missing policies

  3. Tables Affected
    - auto_mail_reports: Add index on user_id
    - instant_reports: Add index on user_id
    - master_upload_configurations: Add index on created_by
    - master_upload_details: Add index on upload_id
    - master_uploads: Add index on user_id
    - report_executions: Add index on user_id
    - resource_access: Add index on granted_by
    - upload_processing_logs: Add index on upload_id
    - accounts: Add RLS policies
    - purchase_data: Add RLS policies
    - sales_data: Add RLS policies
*/

-- =====================================================
-- PART 1: Add Missing Indexes on Foreign Keys
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_auto_mail_reports_user_id
ON auto_mail_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_instant_reports_user_id
ON instant_reports(user_id);

CREATE INDEX IF NOT EXISTS idx_master_upload_configurations_created_by
ON master_upload_configurations(created_by);

CREATE INDEX IF NOT EXISTS idx_master_upload_details_upload_id
ON master_upload_details(upload_id);

CREATE INDEX IF NOT EXISTS idx_master_uploads_user_id
ON master_uploads(user_id);

CREATE INDEX IF NOT EXISTS idx_report_executions_user_id
ON report_executions(user_id);

CREATE INDEX IF NOT EXISTS idx_resource_access_granted_by
ON resource_access(granted_by);

CREATE INDEX IF NOT EXISTS idx_upload_processing_logs_upload_id
ON upload_processing_logs(upload_id);

-- =====================================================
-- PART 2: Optimize RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view own execution history" ON report_executions;
CREATE POLICY "Users can view own execution history"
  ON report_executions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can view all email logs" ON email_logs;
CREATE POLICY "Admins can view all email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own upload details" ON master_upload_details;
DROP POLICY IF EXISTS "Admins can view all upload details" ON master_upload_details;

CREATE POLICY "Users can view own upload details"
  ON master_upload_details
  FOR SELECT
  TO authenticated
  USING (
    upload_id IN (
      SELECT id FROM master_uploads
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can view all upload details"
  ON master_upload_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can view own upload logs" ON upload_processing_logs;
DROP POLICY IF EXISTS "Admins can view all upload logs" ON upload_processing_logs;

CREATE POLICY "Users can view own upload logs"
  ON upload_processing_logs
  FOR SELECT
  TO authenticated
  USING (
    upload_id IN (
      SELECT id FROM master_uploads
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can view all upload logs"
  ON upload_processing_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all access control" ON access_control;
DROP POLICY IF EXISTS "Users can view own access control" ON access_control;
DROP POLICY IF EXISTS "Admins can manage access control" ON access_control;

CREATE POLICY "Admins can view all access control"
  ON access_control
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own access control"
  ON access_control
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can manage access control"
  ON access_control
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view system logs" ON system_logs;
CREATE POLICY "Admins can view system logs"
  ON system_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

-- =====================================================
-- PART 3: Add RLS Policies for Tables Without Policies
-- =====================================================

CREATE POLICY "Authenticated users can view accounts"
  ON accounts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage accounts"
  ON accounts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view purchase data"
  ON purchase_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage purchase data"
  ON purchase_data
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view sales data"
  ON sales_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage sales data"
  ON sales_data
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = (SELECT auth.uid())
      AND role = 'admin'
    )
  );