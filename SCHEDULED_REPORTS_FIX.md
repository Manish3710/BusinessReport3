# Fix Scheduled Reports - Complete Setup Guide

## Problem
Scheduled reports are not being sent automatically because:
1. Service Role Key is not configured in the database
2. Gmail App Password environment variable is not set

## Solution - Follow These Steps

### Step 1: Configure Service Role Key

Run this SQL query in your Supabase SQL Editor:

```sql
-- Add your service role key to the configuration
INSERT INTO supabase_config (key, value)
VALUES ('service_role_key', 'YOUR_SERVICE_ROLE_KEY_HERE')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
```

**Where to find your Service Role Key:**
1. Go to Supabase Dashboard
2. Navigate to: Settings → API
3. Copy the `service_role` key (NOT the anon key)
4. Replace `YOUR_SERVICE_ROLE_KEY_HERE` in the SQL above

### Step 2: Configure Gmail App Password

You need to set the Gmail App Password as an environment variable for the edge functions.

**Option A: Using Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard
2. Navigate to: Edge Functions → Settings
3. Add a new environment variable:
   - Name: `GMAIL_APP_PASSWORD`
   - Value: Your Gmail App Password
4. Add another environment variable:
   - Name: `GMAIL_USER`
   - Value: manishwakade10@gmail.com

**Option B: Using Supabase CLI (if you have it installed)**
```bash
supabase secrets set GMAIL_APP_PASSWORD=your_gmail_app_password
supabase secrets set GMAIL_USER=manishwakade10@gmail.com
```

**How to get Gmail App Password:**
1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to Security
3. Enable 2-Step Verification (if not already enabled)
4. Search for "App Passwords"
5. Create a new app password for "Mail"
6. Copy the generated password (it will be shown only once)

### Step 3: Verify Configuration

Run this test query in Supabase SQL Editor:

```sql
SELECT * FROM test_scheduled_reports();
```

This will show you if everything is configured correctly.

### Step 4: Check Cron Job Status

The cron job runs every 5 minutes. To check if it's active:

```sql
SELECT * FROM cron.job WHERE jobname = 'process-scheduled-reports';
```

### Step 5: Test Immediately

To test a scheduled report right away (without waiting for the cron job):
1. Go to Auto Mail Reports page
2. Click the "Run Now" (Play button) on any report
3. Check if you receive the email

### Step 6: Manual Trigger (Optional)

You can manually trigger the scheduled reports processor:

```sql
SELECT trigger_scheduled_reports();
```

Check the logs to see if it worked.

## Current Status

Your scheduled reports:
- **Users Data**: Daily at 12:32 IST - Next run at 2025-12-09 07:02:00 UTC (12:32 IST)
- **accounts report**: Daily at 13:27 IST - Next run was 2025-12-04 (needs update)

## How It Works

1. **Cron Job**: Runs every 5 minutes automatically
2. **Checks**: Looks for reports where `next_run_at <= current_time` and `is_active = true`
3. **Executes**: Runs the SQL query and generates CSV
4. **Sends**: Emails the CSV attachment to recipients
5. **Updates**: Sets `last_run_at` and calculates new `next_run_at`

## Troubleshooting

If reports still don't send:

1. **Check Edge Function Logs:**
   - Go to Supabase Dashboard → Edge Functions
   - Click on `process-scheduled-reports`
   - View the logs to see errors

2. **Verify Email Configuration:**
   - Make sure GMAIL_APP_PASSWORD is set correctly
   - Test by clicking "Run Now" on a report

3. **Check Database Logs:**
   ```sql
   SELECT * FROM pg_stat_statements WHERE query LIKE '%trigger_scheduled_reports%';
   ```

4. **Verify Time Zones:**
   - All times in database are stored in UTC
   - Frontend displays in IST (UTC + 5:30)
   - Make sure `next_run_at` is in the past for immediate testing

## Quick Test

After completing Steps 1 and 2, update a report's next_run_at to now:

```sql
UPDATE auto_mail_reports
SET next_run_at = now()
WHERE report_name = 'Users Data';
```

Wait 5 minutes (or less) for the cron job to pick it up, or manually trigger:

```sql
SELECT trigger_scheduled_reports();
```

You should receive an email within 1-2 minutes!
