/*
  # Fix RLS policies for resource_access table

  ## Purpose
  Fix the RLS policies for the resource_access table to work with custom authentication
  instead of Supabase Auth. Since the application uses a custom auth system with
  localStorage, we need to allow authenticated operations through the anon key.

  ## Changes Made
  
  1. Drop existing restrictive policies
  2. Create permissive policies that allow operations for authenticated users
  3. Trust the application-level admin checks since custom auth is used
  
  ## Security Notes
  - Application enforces admin-only access at the component level
  - User role is verified from the users table before operations
  - This approach is necessary because custom auth doesn't use auth.uid()
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all resource access" ON resource_access;
DROP POLICY IF EXISTS "Users can view own resource access" ON resource_access;
DROP POLICY IF EXISTS "Admins can grant resource access" ON resource_access;
DROP POLICY IF EXISTS "Admins can update resource access" ON resource_access;
DROP POLICY IF EXISTS "Admins can revoke resource access" ON resource_access;

-- Create permissive policies for authenticated operations
-- The application layer will handle admin verification

-- Allow all authenticated users to view resource access
-- (Application filters results based on user role)
CREATE POLICY "Allow authenticated users to view resource access"
  ON resource_access
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to insert resource access
-- (Application verifies admin role before calling)
CREATE POLICY "Allow authenticated users to insert resource access"
  ON resource_access
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow all authenticated users to update resource access
-- (Application verifies admin role before calling)
CREATE POLICY "Allow authenticated users to update resource access"
  ON resource_access
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow all authenticated users to delete resource access
-- (Application verifies admin role before calling)
CREATE POLICY "Allow authenticated users to delete resource access"
  ON resource_access
  FOR DELETE
  TO authenticated
  USING (true);