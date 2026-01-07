/*
  # Fix Scheduled Reports Trigger Function

  1. Problem
    - The trigger function cannot get Supabase URL and Service Role Key
    - Settings are not configured in database
    - Fallback to request.header.host doesn't work in cron context

  2. Solution
    - Use Supabase's internal environment variables
    - Properly construct the URL for Edge Function calls
    - Add better error logging for debugging

  3. Changes
    - Update trigger_scheduled_reports() function to use proper environment
    - Add logging to track function execution
*/

-- Drop and recreate the trigger function with proper configuration
CREATE OR REPLACE FUNCTION trigger_scheduled_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
  request_id bigint;
  project_ref text;
BEGIN
  -- Get the project reference from the database
  -- In Supabase, this is available as part of the connection
  project_ref := current_setting('app.settings.project_ref', true);
  
  -- Construct Supabase URL
  -- For hosted Supabase: https://<project-ref>.supabase.co
  IF project_ref IS NOT NULL THEN
    supabase_url := 'https://' || project_ref || '.supabase.co';
  ELSE
    -- Try to extract from current database connection
    supabase_url := current_setting('app.settings.api_url', true);
    
    -- If still null, try alternative methods
    IF supabase_url IS NULL THEN
      -- Use the vault to get the URL if stored there
      supabase_url := current_setting('supabase.url', true);
    END IF;
  END IF;
  
  -- Get service role key from settings
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- If still null, try vault
  IF service_role_key IS NULL THEN
    service_role_key := current_setting('supabase.service_role_key', true);
  END IF;
  
  -- Log the attempt
  RAISE NOTICE 'Attempting to trigger scheduled reports. URL: %, Has Key: %', 
    supabase_url, 
    CASE WHEN service_role_key IS NOT NULL THEN 'Yes' ELSE 'No' END;
  
  -- Make HTTP request to Edge Function using pg_net
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/process-scheduled-reports',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) INTO request_id;
    
    RAISE NOTICE 'Triggered scheduled reports processing. Request ID: %', request_id;
  ELSE
    RAISE WARNING 'Cannot trigger scheduled reports: Missing configuration. URL: %, Key: %',
      CASE WHEN supabase_url IS NULL THEN 'MISSING' ELSE 'OK' END,
      CASE WHEN service_role_key IS NULL THEN 'MISSING' ELSE 'OK' END;
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error triggering scheduled reports: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_scheduled_reports() TO postgres;

-- Now let's set the configuration using a simpler approach
-- We'll create a helper function that can be called to set these values
CREATE OR REPLACE FUNCTION set_supabase_config(
  p_url text,
  p_service_key text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Store in a configuration table
  CREATE TABLE IF NOT EXISTS supabase_config (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamptz DEFAULT now()
  );
  
  INSERT INTO supabase_config (key, value)
  VALUES ('supabase_url', p_url)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  
  INSERT INTO supabase_config (key, value)
  VALUES ('service_role_key', p_service_key)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  
  RAISE NOTICE 'Supabase configuration updated successfully';
END;
$$;

-- Create the config table
CREATE TABLE IF NOT EXISTS supabase_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- Update the trigger function to use the config table
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
  -- Get configuration from config table
  SELECT value INTO supabase_url 
  FROM supabase_config 
  WHERE key = 'supabase_url';
  
  SELECT value INTO service_role_key 
  FROM supabase_config 
  WHERE key = 'service_role_key';
  
  -- Log the attempt
  RAISE NOTICE 'Attempting to trigger scheduled reports at %', now();
  RAISE NOTICE 'URL configured: %, Key configured: %', 
    CASE WHEN supabase_url IS NOT NULL THEN 'Yes' ELSE 'No' END,
    CASE WHEN service_role_key IS NOT NULL THEN 'Yes' ELSE 'No' END;
  
  -- Make HTTP request to Edge Function using pg_net
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    SELECT net.http_post(
      url := supabase_url || '/functions/v1/process-scheduled-reports',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) INTO request_id;
    
    RAISE NOTICE 'Successfully triggered scheduled reports. Request ID: %', request_id;
  ELSE
    RAISE WARNING 'Cannot trigger scheduled reports: Configuration missing!';
    RAISE WARNING 'Please run: SELECT set_supabase_config(''your-url'', ''your-key'');';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error triggering scheduled reports: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Add RLS policies for config table
ALTER TABLE supabase_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only postgres can access config"
  ON supabase_config
  FOR ALL
  TO postgres
  USING (true)
  WITH CHECK (true);
