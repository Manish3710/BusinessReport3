/*
  # Fix Scheduled Reports Trigger Function
  
  1. Problem
    - trigger_scheduled_reports() function uses PostgreSQL settings that aren't configured
    - Should read from supabase_config table instead
    - Function needs to properly retrieve and use the stored configuration
  
  2. Solution
    - Update function to read Supabase URL and Service Role Key from supabase_config table
    - Add proper error handling and logging
    - Ensure function makes HTTP request to process-scheduled-reports edge function
*/

DROP FUNCTION IF EXISTS public.trigger_scheduled_reports();

CREATE OR REPLACE FUNCTION public.trigger_scheduled_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url text;
  v_service_role_key text;
  v_request_id bigint;
BEGIN
  SELECT value INTO v_supabase_url FROM supabase_config WHERE key = 'supabase_url';
  SELECT value INTO v_service_role_key FROM supabase_config WHERE key = 'service_role_key';
  
  IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
    RAISE WARNING 'Scheduled reports trigger: Configuration incomplete. URL: %, Key: %', 
      CASE WHEN v_supabase_url IS NULL THEN 'MISSING' ELSE 'OK' END,
      CASE WHEN v_service_role_key IS NULL THEN 'MISSING' ELSE 'OK' END;
    RETURN;
  END IF;
  
  BEGIN
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/process-scheduled-reports',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_role_key
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) INTO v_request_id;
    
    RAISE NOTICE 'Scheduled reports processing triggered. Request ID: %', v_request_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error triggering scheduled reports: %', SQLERRM;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.trigger_scheduled_reports() TO postgres, authenticated, anon;
