/*
  # Create Diagnostic Functions for Scheduled Reports
  
  1. Functions Created
    - check_scheduled_reports_config(): Check if all configuration is in place
    - test_email_sending(): Test if email sending works
    - fix_overdue_reports(): Update overdue reports to run soon
  
  2. Purpose
    - Help diagnose why scheduled reports aren't working
    - Provide easy testing and fixing tools
*/

-- Function to check configuration status
CREATE OR REPLACE FUNCTION check_scheduled_reports_config()
RETURNS TABLE(
  component text,
  status text,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text;
  v_key text;
  v_gmail_configured boolean := false;
  v_cron_exists boolean := false;
  v_reports_count integer;
  v_active_reports_count integer;
  v_overdue_reports_count integer;
BEGIN
  -- Check supabase_url
  SELECT value INTO v_url FROM supabase_config WHERE key = 'supabase_url';
  RETURN QUERY SELECT 
    'Supabase URL'::text,
    CASE WHEN v_url IS NOT NULL THEN 'OK'::text ELSE 'MISSING'::text END,
    COALESCE(v_url, 'Not configured')::text;
  
  -- Check service_role_key
  SELECT value INTO v_key FROM supabase_config WHERE key = 'service_role_key';
  RETURN QUERY SELECT 
    'Service Role Key'::text,
    CASE WHEN v_key IS NOT NULL THEN 'OK'::text ELSE 'MISSING'::text END,
    CASE WHEN v_key IS NOT NULL THEN 'Configured (hidden)'::text ELSE 'Not configured - THIS IS THE PROBLEM!'::text END;
  
  -- Check cron job
  SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-reports') INTO v_cron_exists;
  RETURN QUERY SELECT 
    'Cron Job'::text,
    CASE WHEN v_cron_exists THEN 'ACTIVE'::text ELSE 'MISSING'::text END,
    CASE WHEN v_cron_exists THEN 'Running every 5 minutes'::text ELSE 'Not scheduled'::text END;
  
  -- Check reports
  SELECT COUNT(*) INTO v_reports_count FROM auto_mail_reports;
  SELECT COUNT(*) INTO v_active_reports_count FROM auto_mail_reports WHERE is_active = true;
  SELECT COUNT(*) INTO v_overdue_reports_count FROM auto_mail_reports 
    WHERE is_active = true AND next_run_at <= now();
  
  RETURN QUERY SELECT 
    'Total Reports'::text,
    'INFO'::text,
    v_reports_count::text || ' total, ' || v_active_reports_count::text || ' active';
  
  RETURN QUERY SELECT 
    'Overdue Reports'::text,
    CASE WHEN v_overdue_reports_count > 0 THEN 'PENDING'::text ELSE 'NONE'::text END,
    v_overdue_reports_count::text || ' reports waiting to be sent';
  
  -- Overall status
  RETURN QUERY SELECT 
    '=== OVERALL STATUS ==='::text,
    CASE 
      WHEN v_url IS NULL OR v_key IS NULL THEN 'NOT READY'::text
      WHEN NOT v_cron_exists THEN 'CRON MISSING'::text
      ELSE 'READY'::text 
    END,
    CASE 
      WHEN v_url IS NULL OR v_key IS NULL THEN 'Configuration incomplete - see missing items above'::text
      WHEN NOT v_cron_exists THEN 'Cron job not scheduled'::text
      ELSE 'System is ready to send scheduled reports'::text 
    END;
END;
$$;

-- Function to fix overdue reports
CREATE OR REPLACE FUNCTION fix_overdue_reports()
RETURNS TABLE(
  report_name text,
  old_next_run timestamptz,
  new_next_run timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE auto_mail_reports
  SET next_run_at = now() + interval '1 minute'
  WHERE is_active = true AND next_run_at < now() - interval '1 day'
  RETURNING 
    auto_mail_reports.report_name,
    auto_mail_reports.next_run_at - interval '1 minute' as old_next_run,
    auto_mail_reports.next_run_at as new_next_run;
END;
$$;

-- Function to manually test email sending
CREATE OR REPLACE FUNCTION test_email_function()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text;
  v_key text;
  v_request_id bigint;
  v_result jsonb;
BEGIN
  -- Get configuration
  SELECT value INTO v_url FROM supabase_config WHERE key = 'supabase_url';
  SELECT value INTO v_key FROM supabase_config WHERE key = 'service_role_key';
  
  IF v_url IS NULL OR v_key IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Configuration not complete',
      'url_configured', v_url IS NOT NULL,
      'key_configured', v_key IS NOT NULL
    );
  END IF;
  
  -- Try to call the edge function
  BEGIN
    SELECT net.http_post(
      url := v_url || '/functions/v1/process-scheduled-reports',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_key
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    ) INTO v_request_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Test request sent successfully',
      'request_id', v_request_id,
      'note', 'Check Edge Function logs in Supabase Dashboard for results'
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'sqlstate', SQLSTATE
      );
  END;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_scheduled_reports_config() TO postgres, authenticated;
GRANT EXECUTE ON FUNCTION fix_overdue_reports() TO postgres, authenticated;
GRANT EXECUTE ON FUNCTION test_email_function() TO postgres, authenticated;
