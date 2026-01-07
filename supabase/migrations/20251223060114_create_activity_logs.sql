/*
  # Create Activity Logs Table

  This migration creates a comprehensive activity logging system to track all user actions in the application.

  1. New Tables
    - `activity_logs`
      - `id` (uuid, primary key) - Unique identifier for each log entry
      - `user_id` (text) - ID of the user performing the action
      - `username` (text) - Username of the user
      - `activity_type` (text) - Type of activity (login, logout, create_report, etc.)
      - `activity_description` (text) - Detailed description of the activity
      - `resource_type` (text, nullable) - Type of resource affected (instant_report, automail_report, etc.)
      - `resource_id` (text, nullable) - ID of the resource affected
      - `ip_address` (text, nullable) - IP address of the user
      - `user_agent` (text, nullable) - Browser user agent string
      - `created_at` (timestamptz) - Timestamp when the activity occurred

  2. Security
    - Enable RLS on `activity_logs` table
    - Add policy for public access (authentication handled at application level)

  3. Indexes
    - Index on `user_id` for faster queries by user
    - Index on `activity_type` for filtering by activity type
    - Index on `created_at` for chronological queries
    - Index on `resource_type` for filtering by resource
*/

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  username text NOT NULL,
  activity_type text NOT NULL,
  activity_description text NOT NULL,
  resource_type text,
  resource_id text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public access for insert
CREATE POLICY "Allow insert activity logs"
  ON activity_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Allow public access for select
CREATE POLICY "Allow select activity logs"
  ON activity_logs
  FOR SELECT
  TO public
  USING (true);
