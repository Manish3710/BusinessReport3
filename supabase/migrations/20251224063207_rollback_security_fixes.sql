/*
  # Rollback Security and Performance Fixes

  1. Removes Added Indexes
    - Drop all foreign key indexes that were added

  2. Reverts RLS Policies
    - Restore original RLS policies without SELECT wrappers
    - Remove RLS policies added for accounts, purchase_data, sales_data

  3. Reverts Functions
    - Restore original functions without SET search_path
*/

-- =====================================================
-- PART 1: Drop Added Indexes
-- =====================================================

DROP INDEX IF EXISTS idx_auto_mail_reports_user_id;
DROP INDEX IF EXISTS idx_instant_reports_user_id;
DROP INDEX IF EXISTS idx_master_upload_configurations_created_by;
DROP INDEX IF EXISTS idx_master_upload_details_upload_id;
DROP INDEX IF EXISTS idx_master_uploads_user_id;
DROP INDEX IF EXISTS idx_report_executions_user_id;
DROP INDEX IF EXISTS idx_resource_access_granted_by;
DROP INDEX IF EXISTS idx_upload_processing_logs_upload_id;

-- =====================================================
-- PART 2: Revert RLS Policies
-- =====================================================

-- Revert report_executions policy
DROP POLICY IF EXISTS "Users can view own execution history" ON report_executions;
CREATE POLICY "Users can view own execution history"
  ON report_executions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Revert email_logs policy
DROP POLICY IF EXISTS "Admins can view all email logs" ON email_logs;
CREATE POLICY "Admins can view all email logs"
  ON email_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Revert master_upload_details policies
DROP POLICY IF EXISTS "Users can view own upload details" ON master_upload_details;
DROP POLICY IF EXISTS "Admins can view all upload details" ON master_upload_details;

CREATE POLICY "Users can view own upload details"
  ON master_upload_details
  FOR SELECT
  TO authenticated
  USING (
    upload_id IN (
      SELECT id FROM master_uploads
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all upload details"
  ON master_upload_details
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Revert upload_processing_logs policies
DROP POLICY IF EXISTS "Users can view own upload logs" ON upload_processing_logs;
DROP POLICY IF EXISTS "Admins can view all upload logs" ON upload_processing_logs;

CREATE POLICY "Users can view own upload logs"
  ON upload_processing_logs
  FOR SELECT
  TO authenticated
  USING (
    upload_id IN (
      SELECT id FROM master_uploads
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all upload logs"
  ON upload_processing_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Revert access_control policies
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
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own access control"
  ON access_control
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage access control"
  ON access_control
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Revert system_logs policy
DROP POLICY IF EXISTS "Admins can view system logs" ON system_logs;
CREATE POLICY "Admins can view system logs"
  ON system_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- PART 3: Remove Added Policies for accounts, purchase_data, sales_data
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view accounts" ON accounts;
DROP POLICY IF EXISTS "Admins can manage accounts" ON accounts;

DROP POLICY IF EXISTS "Authenticated users can view purchase data" ON purchase_data;
DROP POLICY IF EXISTS "Admins can manage purchase data" ON purchase_data;

DROP POLICY IF EXISTS "Authenticated users can view sales data" ON sales_data;
DROP POLICY IF EXISTS "Admins can manage sales data" ON sales_data;

-- =====================================================
-- PART 4: Revert Functions (Remove SET search_path)
-- =====================================================

-- Drop and recreate functions without SET search_path
DROP FUNCTION IF EXISTS execute_sql(text);
DROP FUNCTION IF EXISTS bulk_insert_with_validation(text, jsonb, text[]);
DROP FUNCTION IF EXISTS get_available_tables();
DROP FUNCTION IF EXISTS get_table_schema(text);
DROP FUNCTION IF EXISTS get_table_sample_data(text, int);
DROP FUNCTION IF EXISTS log_activity(uuid, text, text, text, jsonb);
DROP FUNCTION IF EXISTS get_recent_activities(uuid, int);
DROP FUNCTION IF EXISTS set_supabase_config(text, text);
DROP FUNCTION IF EXISTS trigger_scheduled_reports();
DROP FUNCTION IF EXISTS cleanup_old_activity_logs(integer);
DROP FUNCTION IF EXISTS test_scheduled_reports();
DROP FUNCTION IF EXISTS check_scheduled_reports_config();
DROP FUNCTION IF EXISTS fix_overdue_reports();
DROP FUNCTION IF EXISTS test_email_function();
DROP FUNCTION IF EXISTS test_report_email(uuid);

-- Recreate functions without SET search_path (original versions)

CREATE FUNCTION execute_sql(query_text text)
RETURNS TABLE(result jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE format('SELECT row_to_json(t)::jsonb FROM (%s) t', query_text);
END;
$$;

CREATE FUNCTION bulk_insert_with_validation(
  p_table_name text,
  p_data jsonb,
  p_upsert_columns text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_query text;
  v_conflict_clause text := '';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Table %s does not exist', p_table_name)
    );
  END IF;

  IF p_upsert_columns IS NOT NULL AND array_length(p_upsert_columns, 1) > 0 THEN
    v_conflict_clause := format(
      'ON CONFLICT (%s) DO UPDATE SET %s',
      array_to_string(p_upsert_columns, ', '),
      (
        SELECT string_agg(
          format('%I = EXCLUDED.%I', col, col),
          ', '
        )
        FROM unnest(p_upsert_columns) AS col
      )
    );
  END IF;

  v_query := format(
    'INSERT INTO %I SELECT * FROM jsonb_to_recordset($1) AS x %s',
    p_table_name,
    v_conflict_clause
  );

  EXECUTE v_query USING p_data;

  RETURN jsonb_build_object(
    'success', true,
    'rows_affected', jsonb_array_length(p_data)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

CREATE FUNCTION get_available_tables()
RETURNS TABLE(table_name text, column_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.table_name::text,
    COUNT(c.column_name)
  FROM information_schema.tables t
  LEFT JOIN information_schema.columns c
    ON t.table_name = c.table_name
    AND t.table_schema = c.table_schema
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  GROUP BY t.table_name
  ORDER BY t.table_name;
END;
$$;

CREATE FUNCTION get_table_schema(p_table_name text)
RETURNS TABLE(
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
  ORDER BY c.ordinal_position;
END;
$$;

CREATE FUNCTION get_table_sample_data(p_table_name text, p_limit int DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  EXECUTE format(
    'SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM %I LIMIT $1) t',
    p_table_name
  ) INTO v_result USING p_limit;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

CREATE FUNCTION log_activity(
  p_user_id uuid,
  p_activity_type text,
  p_resource_type text,
  p_resource_id text,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO activity_logs (
    user_id,
    activity_type,
    resource_type,
    resource_id,
    details
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_resource_type,
    p_resource_id,
    p_details
  );
END;
$$;

CREATE FUNCTION get_recent_activities(
  p_user_id uuid DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  activity_type text,
  resource_type text,
  resource_id text,
  details jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN QUERY
    SELECT
      a.id,
      a.user_id,
      a.activity_type,
      a.resource_type,
      a.resource_id,
      a.details,
      a.created_at
    FROM activity_logs a
    ORDER BY a.created_at DESC
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT
      a.id,
      a.user_id,
      a.activity_type,
      a.resource_type,
      a.resource_id,
      a.details,
      a.created_at
    FROM activity_logs a
    WHERE a.user_id = p_user_id
    ORDER BY a.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$;

CREATE FUNCTION set_supabase_config(config_key text, config_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('supabase.' || config_key, config_value, false);
END;
$$;

CREATE FUNCTION trigger_scheduled_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_function_url text;
  v_service_role_key text;
  v_result record;
BEGIN
  v_function_url := current_setting('supabase.function_url', true);
  v_service_role_key := current_setting('supabase.service_role_key', true);

  SELECT * INTO v_result FROM net.http_post(
    url := v_function_url || '/functions/v1/process-scheduled-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := '{}'::jsonb
  );
END;
$$;

CREATE FUNCTION cleanup_old_activity_logs(days_to_keep integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM activity_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE FUNCTION test_scheduled_reports()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_result jsonb;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM auto_mail_reports
  WHERE is_active = true
    AND next_run_date <= NOW();

  v_result := jsonb_build_object(
    'overdue_reports', v_count,
    'timestamp', NOW()
  );

  RETURN v_result;
END;
$$;

CREATE FUNCTION check_scheduled_reports_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_function_url text;
  v_service_role_key text;
  v_result jsonb;
BEGIN
  v_function_url := current_setting('supabase.function_url', true);
  v_service_role_key := current_setting('supabase.service_role_key', true);

  v_result := jsonb_build_object(
    'function_url', COALESCE(v_function_url, 'NOT SET'),
    'service_role_key', CASE
      WHEN v_service_role_key IS NOT NULL THEN 'SET'
      ELSE 'NOT SET'
    END
  );

  RETURN v_result;
END;
$$;

CREATE FUNCTION fix_overdue_reports()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE auto_mail_reports
  SET next_run_date = CASE
    WHEN schedule_type = 'daily' THEN NOW() + interval '1 day'
    WHEN schedule_type = 'weekly' THEN NOW() + interval '1 week'
    WHEN schedule_type = 'monthly' THEN NOW() + interval '1 month'
    ELSE next_run_date
  END
  WHERE is_active = true
    AND next_run_date < NOW() - interval '1 day';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'updated_count', v_updated,
    'timestamp', NOW()
  );
END;
$$;

CREATE FUNCTION test_email_function()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_function_url text;
  v_service_role_key text;
  v_result record;
BEGIN
  v_function_url := current_setting('supabase.function_url', true);
  v_service_role_key := current_setting('supabase.service_role_key', true);

  SELECT * INTO v_result FROM net.http_post(
    url := v_function_url || '/functions/v1/send-report-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'to', 'test@example.com',
      'subject', 'Test Email',
      'body', 'This is a test email'
    )
  );

  RETURN jsonb_build_object(
    'status', v_result.status,
    'response', v_result.content::jsonb
  );
END;
$$;

CREATE FUNCTION test_report_email(report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_function_url text;
  v_service_role_key text;
  v_result record;
BEGIN
  v_function_url := current_setting('supabase.function_url', true);
  v_service_role_key := current_setting('supabase.service_role_key', true);

  SELECT * INTO v_result FROM net.http_post(
    url := v_function_url || '/functions/v1/send-report-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object('report_id', report_id)
  );

  RETURN jsonb_build_object(
    'status', v_result.status,
    'response', v_result.content::jsonb
  );
END;
$$;