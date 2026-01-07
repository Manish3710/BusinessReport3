/*
  # Fix Scheduled Reports with Environment Variables
  
  1. Problem
    - Trigger function needs Supabase URL and Service Role Key
    - These should be available in Supabase's environment
    
  2. Solution
    - Use direct URL construction from known project
    - Make the configuration easier to set
    - Provide fallback mechanism
*/

-- Simpler approach: Insert the configuration directly
-- This will use the known project URL from the environment
DO $$
DECLARE
  project_url text := 'https://ykmczghsytgpkayhkmsp.supabase.co';
BEGIN
  -- Create config table if not exists
  CREATE TABLE IF NOT EXISTS supabase_config (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamptz DEFAULT now()
  );
  
  -- Insert URL
  INSERT INTO supabase_config (key, value)
  VALUES ('supabase_url', project_url)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  
  RAISE NOTICE 'Supabase URL configured: %', project_url;
  RAISE NOTICE 'IMPORTANT: You still need to set the service_role_key!';
  RAISE NOTICE 'Run this in SQL Editor: INSERT INTO supabase_config (key, value) VALUES (''service_role_key'', ''YOUR_SERVICE_ROLE_KEY'') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;';
END $$;

-- Let's also try to make the cron job more robust
-- Update to run every 5 minutes instead of every minute to reduce load
SELECT cron.unschedule('process-scheduled-reports');

SELECT cron.schedule(
  'process-scheduled-reports',
  '*/5 * * * *', -- Every 5 minutes
  $$SELECT trigger_scheduled_reports();$$
);

-- Create a manual test function that users can call
CREATE OR REPLACE FUNCTION test_scheduled_reports()
RETURNS TABLE(
  status text,
  message text,
  url_configured boolean,
  key_configured boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text;
  v_key text;
  v_request_id bigint;
BEGIN
  -- Check configuration
  SELECT value INTO v_url FROM supabase_config WHERE key = 'supabase_url';
  SELECT value INTO v_key FROM supabase_config WHERE key = 'service_role_key';
  
  -- Return configuration status
  RETURN QUERY SELECT 
    CASE 
      WHEN v_url IS NOT NULL AND v_key IS NOT NULL THEN 'READY'::text
      ELSE 'NOT_CONFIGURED'::text
    END,
    CASE 
      WHEN v_url IS NULL THEN 'Supabase URL not configured'::text
      WHEN v_key IS NULL THEN 'Service Role Key not configured'::text
      ELSE 'Configuration complete. Cron job will run every 5 minutes.'::text
    END,
    v_url IS NOT NULL,
    v_key IS NOT NULL;
    
  -- If configured, try to trigger
  IF v_url IS NOT NULL AND v_key IS NOT NULL THEN
    BEGIN
      SELECT net.http_post(
        url := v_url || '/functions/v1/process-scheduled-reports',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      ) INTO v_request_id;
      
      RAISE NOTICE 'Test request sent. Request ID: %', v_request_id;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Test request failed: %', SQLERRM;
    END;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION test_scheduled_reports() TO postgres, authenticated;
