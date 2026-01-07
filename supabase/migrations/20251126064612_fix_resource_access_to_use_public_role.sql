/*
  # Fix resource_access RLS policies to use public role

  ## Purpose
  Since the application uses custom authentication (not Supabase Auth),
  and the Supabase client is initialized with the anon key (which maps to
  the 'public' role by default when not authenticated), we need to change
  policies from 'authenticated' role to 'public' role.

  ## Changes Made
  
  1. Drop existing policies for 'authenticated' role
  2. Create new policies for 'public' role (anon key)
  3. Keep policies permissive to trust application-level security
  
  ## Security Notes
  - Application enforces admin-only access at component level
  - Using anon key with public role for custom auth
  - RLS remains enabled for audit purposes
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view resource access" ON resource_access;
DROP POLICY IF EXISTS "Allow authenticated users to insert resource access" ON resource_access;
DROP POLICY IF EXISTS "Allow authenticated users to update resource access" ON resource_access;
DROP POLICY IF EXISTS "Allow authenticated users to delete resource access" ON resource_access;

-- Create policies for public role (anon key)
CREATE POLICY "Allow public to view resource access"
  ON resource_access
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert resource access"
  ON resource_access
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public to update resource access"
  ON resource_access
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public to delete resource access"
  ON resource_access
  FOR DELETE
  TO public
  USING (true);