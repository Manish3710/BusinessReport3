/*
  # Create table validation function

  ## Purpose
  This migration creates a function to list all available tables in the public schema.
  This is used by the instant reports feature to validate that tables referenced in
  user queries actually exist before executing them.

  ## Changes Made
  
  1. Functions Created
    - `get_available_tables()` - Returns list of all tables in public schema
    - Used for query validation before execution
  
  2. Security
    - Function runs with SECURITY DEFINER
    - Returns only table names, not table contents
    - Only accessible to authenticated users
*/

-- Create function to get list of available tables
CREATE OR REPLACE FUNCTION get_available_tables()
RETURNS TABLE(table_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT t.tablename::text
  FROM pg_catalog.pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_available_tables() TO authenticated;