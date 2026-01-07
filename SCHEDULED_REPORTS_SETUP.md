# Scheduled Reports Setup Guide

## Problem
Your scheduled reports aren't sending emails automatically, but "Run Now" works fine.

## Root Cause
The cron job needs your Supabase **Service Role Key** to call the Edge Function. This key is currently not configured in the database.

## Solution - Quick Setup (3 Steps)

### Step 1: Get Your Service Role Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **ykmczghsytgpkayhkmsp**
3. Go to **Project Settings** (gear icon in sidebar)
4. Click on **API** section
5. Find **service_role** key (it says "secret" - click to reveal)
6. Copy this key (starts with `eyJ...`)

### Step 2: Configure the Database

1. In Supabase Dashboard, go to **SQL Editor**
2. Run this SQL command (replace `YOUR_KEY_HERE` with the key from Step 1):

```sql
INSERT INTO supabase_config (key, value)
VALUES ('service_role_key', 'YOUR_KEY_HERE')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

### Step 3: Verify Setup

Run this test command in SQL Editor:

```sql
SELECT * FROM test_scheduled_reports();
```

You should see:
- `status`: "READY"
- `message`: "Configuration complete. Cron job will run every 5 minutes."
- `url_configured`: true
- `key_configured`: true

## How It Works Now

✅ **Cron Schedule**: Every 5 minutes, the system checks for reports that need to be sent

✅ **Automatic Sending**: Reports will be sent at their scheduled time automatically

✅ **Run Now Button**: Still works as before for immediate testing

## Checking Scheduled Reports Status

### View Next Scheduled Run:
```sql
SELECT id, report_name, is_active,
       next_run_at AT TIME ZONE 'Asia/Kolkata' as next_run_ist,
       last_run_at AT TIME ZONE 'Asia/Kolkata' as last_run_ist
FROM auto_mail_reports
WHERE is_active = true;
```

### Check Cron Job Status:
```sql
SELECT * FROM cron.job WHERE jobname = 'process-scheduled-reports';
```

### View Recent Cron Executions:
```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-scheduled-reports')
ORDER BY start_time DESC
LIMIT 10;
```

## Troubleshooting

### Reports Still Not Sending?

1. **Check if reports are active:**
```sql
SELECT id, report_name, is_active FROM auto_mail_reports;
```

2. **Verify next_run_at is in the past:**
```sql
SELECT id, report_name,
       next_run_at,
       now() as current_time,
       next_run_at < now() as should_run
FROM auto_mail_reports
WHERE is_active = true;
```

3. **Manually trigger the cron function:**
```sql
SELECT trigger_scheduled_reports();
```

4. **Check Edge Function logs:**
   - Go to Supabase Dashboard
   - Navigate to **Edge Functions** > **process-scheduled-reports**
   - Click **Logs** to see execution details

### Common Issues

**Issue**: "Configuration missing" warning in logs
- **Solution**: Make sure you completed Step 2 above with your actual service role key

**Issue**: next_run_at is in the future
- **Solution**: Wait for the scheduled time, or use "Run Now" button to test immediately

**Issue**: Edge Function times out
- **Solution**: Check your SQL query in the report - it might be too slow

## Security Note

⚠️ The Service Role Key is sensitive and bypasses Row Level Security. It's stored securely in the database and only accessible to the cron job function. Never share this key or commit it to your code repository.

## Need Help?

If you're still having issues after following these steps, check:
1. Edge Function logs in Supabase Dashboard
2. Your email configuration (GMAIL_USER and GMAIL_APP_PASSWORD)
3. Database logs for any error messages
