/*
  # Create resource access control table

  ## Purpose
  This migration creates a table to manage user access to specific resources
  (reports, uploads, etc.) with different permission levels.

  ## Changes Made
  
  1. New Tables
    - `resource_access` - Stores user permissions for specific resources
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to users)
      - `resource_type` (text) - Type of resource (auto_mail, instant_report, master_upload)
      - `resource_id` (uuid) - ID of the specific resource
      - `access_level` (text) - Permission level (read, write, execute)
      - `granted_by` (uuid, FK to users) - User who granted this access
      - `granted_at` (timestamp) - When access was granted
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on resource_access table
    - Add policies for admins to manage access
    - Add policies for users to view their own access
  
  3. Constraints
    - Unique constraint on (user_id, resource_type, resource_id)
    - Check constraint for valid resource_type values
    - Check constraint for valid access_level values
*/

-- Create resource_access table
CREATE TABLE IF NOT EXISTS resource_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK (resource_type IN ('auto_mail', 'instant_report', 'master_upload')),
  resource_id uuid NOT NULL,
  access_level text NOT NULL CHECK (access_level IN ('read', 'write', 'execute')),
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  granted_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, resource_type, resource_id)
);

-- Enable RLS
ALTER TABLE resource_access ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all resource access
CREATE POLICY "Admins can view all resource access"
  ON resource_access
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Users can view their own resource access
CREATE POLICY "Users can view own resource access"
  ON resource_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Admins can insert resource access
CREATE POLICY "Admins can grant resource access"
  ON resource_access
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can update resource access
CREATE POLICY "Admins can update resource access"
  ON resource_access
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Admins can delete resource access
CREATE POLICY "Admins can revoke resource access"
  ON resource_access
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_resource_access_user_id ON resource_access(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_access_resource ON resource_access(resource_type, resource_id);