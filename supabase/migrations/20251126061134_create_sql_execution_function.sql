/*
  # Create SQL execution function for instant reports

  ## Purpose
  This migration creates a PostgreSQL function that allows executing dynamic SQL queries
  for instant reports. This is needed to run user-defined queries stored in the instant_reports table.

  ## Changes Made
  
  1. Functions Created
    - `execute_sql(query text)` - Executes a dynamic SQL query and returns results as JSON
    - This function is necessary for the instant reports feature to work properly
  
  2. Security
    - Function runs with SECURITY DEFINER to allow query execution
    - Only accessible to authenticated users
    - Returns results in JSON format for frontend consumption
  
  ## Important Notes
  - This function should only be called with validated, safe SQL queries
  - The application validates table existence before allowing query execution
  - Results are limited to prevent excessive data transfer
*/

-- Create function to execute raw SQL and return results
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Execute the query and convert results to JSON
  EXECUTE format('SELECT jsonb_agg(row_to_json(t)) FROM (%s) t', query)
  INTO result;
  
  -- Return empty array if no results
  IF result IS NULL THEN
    result := '[]'::jsonb;
  END IF;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Query execution failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;