/*
  # Create Cron Job for Scheduled Reports

  1. Setup
    - Enables pg_cron extension if not already enabled
    - Creates a cron job that runs every minute to process scheduled reports
  
  2. Cron Job Details
    - Runs every minute (* * * * *)
    - Calls the process-scheduled-reports Edge Function
    - Uses pg_net to make HTTP requests to the Edge Function
  
  3. Notes
    - The cron job will automatically check for reports that need to be sent
    - Reports are sent based on their next_run timestamp
    - After sending, the next_run timestamp is updated for the next scheduled run
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing cron job if it exists
SELECT cron.unschedule('process-scheduled-reports') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-reports'
);

-- Create a function to call the Edge Function
CREATE OR REPLACE FUNCTION trigger_scheduled_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  request_id bigint;
BEGIN
  -- Get Supabase URL and Service Role Key
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If settings are not configured, use default (will work in Supabase hosted environment)
  IF supabase_url IS NULL THEN
    supabase_url := 'https://' || current_setting('request.header.host', true);
  END IF;
  
  -- Make HTTP request to Edge Function using pg_net
  SELECT net.http_post(
    url := supabase_url || '/functions/v1/process-scheduled-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, current_setting('request.jwt.claim.sub', true))
    ),
    body := '{}'::jsonb
  ) INTO request_id;
  
  RAISE NOTICE 'Triggered scheduled reports processing. Request ID: %', request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error triggering scheduled reports: %', SQLERRM;
END;
$$;

-- Schedule the cron job to run every minute
SELECT cron.schedule(
  'process-scheduled-reports',
  '* * * * *', -- Every minute
  $$SELECT trigger_scheduled_reports();$$
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_scheduled_reports() TO postgres;
