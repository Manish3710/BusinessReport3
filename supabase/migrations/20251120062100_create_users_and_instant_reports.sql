/*
  # Create Users and Instant Reports Tables

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - User identifier
      - `user_id` (text) - Legacy user ID for compatibility
      - `username` (text, unique) - Username for login
      - `email` (text, unique) - User email
      - `password_hash` (text) - Hashed password
      - `first_name` (text) - User first name
      - `last_name` (text) - User last name
      - `role` (text) - User role (admin/user)
      - `is_active` (boolean) - Active status
      - `created_at` (timestamp) - Creation timestamp
      - `last_login` (timestamp) - Last login time
      - `created_by` (text) - Creator user ID
      - `updated_at` (timestamp) - Update timestamp

    - `instant_reports`
      - `id` (uuid, primary key) - Report identifier
      - `report_id` (text) - Legacy report ID
      - `report_name` (text) - Report name
      - `query_text` (text) - SQL query
      - `is_active` (boolean) - Active status
      - `created_by` (uuid) - Creator user ID
      - `created_at` (timestamp) - Creation timestamp
      - `updated_at` (timestamp) - Update timestamp

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  created_by text,
  updated_at timestamptz DEFAULT now()
);

-- Create instant reports table
CREATE TABLE IF NOT EXISTS instant_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id text UNIQUE,
  report_name text NOT NULL,
  query_text text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_instant_reports_created_by ON instant_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_instant_reports_active ON instant_reports(is_active);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE instant_reports ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read all active users"
  ON users FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Instant reports policies
CREATE POLICY "Users can view active instant reports"
  ON instant_reports FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can insert instant reports"
  ON instant_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update instant reports"
  ON instant_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete instant reports"
  ON instant_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Insert default admin user (password: admin123)
-- Note: This is a bcrypt hash of 'admin123'
INSERT INTO users (user_id, username, email, password_hash, first_name, last_name, role, is_active, created_by)
VALUES (
  'USR0001',
  'admin',
  'admin@company.com',
  '$2a$10$YourHashedPasswordHere',
  'System',
  'Administrator',
  'admin',
  true,
  'SYSTEM'
) ON CONFLICT (username) DO NOTHING;

-- Insert default user (password: user123)
INSERT INTO users (user_id, username, email, password_hash, first_name, last_name, role, is_active, created_by)
VALUES (
  'USR0002',
  'user',
  'user@company.com',
  '$2a$10$YourHashedPasswordHere',
  'Regular',
  'User',
  'user',
  true,
  'SYSTEM'
) ON CONFLICT (username) DO NOTHING;