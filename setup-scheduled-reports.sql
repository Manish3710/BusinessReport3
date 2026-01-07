-- Setup Script for Scheduled Reports
-- This script configures the cron job to call your Edge Function

-- IMPORTANT: Replace 'YOUR_SERVICE_ROLE_KEY_HERE' with your actual Supabase Service Role Key
-- You can find this in: Supabase Dashboard > Project Settings > API > service_role key (secret)

SELECT set_supabase_config(
  'https://ykmczghsytgpkayhkmsp.supabase.co',
  'YOUR_SERVICE_ROLE_KEY_HERE'
);

-- After running this, verify the configuration:
SELECT * FROM supabase_config;

-- You can also manually test the trigger function:
SELECT trigger_scheduled_reports();

-- Check cron job status:
SELECT * FROM cron.job WHERE jobname = 'process-scheduled-reports';

-- To see recent cron job runs:
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-scheduled-reports')
ORDER BY start_time DESC
LIMIT 10;
