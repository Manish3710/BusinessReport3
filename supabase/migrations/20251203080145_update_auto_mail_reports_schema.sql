/*
  # Update Auto Mail Reports Schema
  
  This migration updates the auto_mail_reports table to support:
  
  1. Email Configuration
    - Add mail_from column for sender email
    - Add mail_subject column for email subject
    - Add mail_body column for HTML email body
    - Rename query_template to query_text for consistency
    - Rename recipient_emails to mail_to for clarity
  
  2. Schedule Enhancements
    - Update schedule_frequency to include 'quarterly'
    - Add schedule_time with default '09:00' in IST
    - Store schedule_day for weekly/monthly/quarterly reports
  
  3. Execution Tracking
    - Add last_run_at to track last execution
    - Add next_run_at to track next scheduled run
    - Keep is_active for enabling/disabling reports
*/

-- Add new columns for email configuration
DO $$
BEGIN
  -- Add mail_from if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_mail_reports' AND column_name = 'mail_from'
  ) THEN
    ALTER TABLE auto_mail_reports ADD COLUMN mail_from text NOT NULL DEFAULT 'manishwakade10@gmail.com';
  END IF;

  -- Add mail_subject if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_mail_reports' AND column_name = 'mail_subject'
  ) THEN
    ALTER TABLE auto_mail_reports ADD COLUMN mail_subject text NOT NULL DEFAULT 'Report';
  END IF;

  -- Add mail_body if not exists (supports HTML)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_mail_reports' AND column_name = 'mail_body'
  ) THEN
    ALTER TABLE auto_mail_reports ADD COLUMN mail_body text DEFAULT 'Please find the attached report.';
  END IF;

  -- Add last_run_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_mail_reports' AND column_name = 'last_run_at'
  ) THEN
    ALTER TABLE auto_mail_reports ADD COLUMN last_run_at timestamptz;
  END IF;

  -- Add next_run_at if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_mail_reports' AND column_name = 'next_run_at'
  ) THEN
    ALTER TABLE auto_mail_reports ADD COLUMN next_run_at timestamptz;
  END IF;
END $$;

-- Drop old constraint on schedule_frequency if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'auto_mail_reports_schedule_frequency_check'
  ) THEN
    ALTER TABLE auto_mail_reports DROP CONSTRAINT auto_mail_reports_schedule_frequency_check;
  END IF;
END $$;

-- Add updated constraint with quarterly option
ALTER TABLE auto_mail_reports 
ADD CONSTRAINT auto_mail_reports_schedule_frequency_check 
CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly', 'quarterly'));

-- Rename columns for consistency (if needed)
DO $$
BEGIN
  -- Rename query_template to query_text if old name exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_mail_reports' AND column_name = 'query_template'
  ) THEN
    ALTER TABLE auto_mail_reports RENAME COLUMN query_template TO query_text;
  END IF;

  -- Rename recipient_emails to mail_to if old name exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_mail_reports' AND column_name = 'recipient_emails'
  ) THEN
    ALTER TABLE auto_mail_reports RENAME COLUMN recipient_emails TO mail_to;
  END IF;

  -- Remove default from last_sent_at if renamed exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'auto_mail_reports' AND column_name = 'last_sent_at'
  ) THEN
    ALTER TABLE auto_mail_reports DROP COLUMN last_sent_at;
  END IF;
END $$;

-- Update schedule_time default
ALTER TABLE auto_mail_reports 
ALTER COLUMN schedule_time SET DEFAULT '09:00';

-- Create index for scheduled report queries
CREATE INDEX IF NOT EXISTS idx_auto_mail_reports_next_run 
ON auto_mail_reports(next_run_at) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_auto_mail_reports_schedule 
ON auto_mail_reports(schedule_frequency, is_active);
