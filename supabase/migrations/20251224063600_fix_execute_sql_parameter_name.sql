/*
  # Fix execute_sql function parameter name

  1. Changes
    - Drop the existing execute_sql function
    - Recreate it with parameter name 'query' instead of 'query_text'
    - This matches how the function is being called in the frontend code

  2. Purpose
    - Resolve "Could not find the function public.execute_sql(query) in the schema cache" error
    - The function signature must match the parameter names used when calling it
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS execute_sql(text);

-- Recreate with correct parameter name
CREATE OR REPLACE FUNCTION execute_sql(query text)
RETURNS TABLE(result jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE format('SELECT row_to_json(t)::jsonb FROM (%s) t', query);
END;
$$;