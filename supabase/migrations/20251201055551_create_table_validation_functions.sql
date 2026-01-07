-- Create functions for table schema introspection and data validation

-- Function to get table schema information
CREATE OR REPLACE FUNCTION get_table_schema(p_table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text,
  is_primary_key boolean,
  is_unique boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text,
    COALESCE((
      SELECT true
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = p_table_name
        AND tc.table_schema = 'public'
        AND kcu.column_name = c.column_name
    ), false) as is_primary_key,
    COALESCE((
      SELECT true
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_name = p_table_name
        AND tc.table_schema = 'public'
        AND kcu.column_name = c.column_name
    ), false) as is_unique
  FROM information_schema.columns c
  WHERE c.table_name = p_table_name
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get sample data from a table (first row or empty structure)
CREATE OR REPLACE FUNCTION get_table_sample_data(p_table_name text)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
  v_query text;
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    RAISE EXCEPTION 'Table % does not exist', p_table_name;
  END IF;

  -- Try to get first row
  v_query := format('SELECT row_to_json(t) FROM (SELECT * FROM %I LIMIT 1) t', p_table_name);
  EXECUTE v_query INTO v_result;

  -- If no data exists, return empty structure with column names
  IF v_result IS NULL THEN
    SELECT jsonb_object_agg(column_name, null)
    INTO v_result
    FROM information_schema.columns
    WHERE table_name = p_table_name AND table_schema = 'public';
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and insert bulk data with transaction control
CREATE OR REPLACE FUNCTION bulk_insert_with_validation(
  p_table_name text,
  p_data jsonb,
  p_column_mapping jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_row jsonb;
  v_mapped_row jsonb;
  v_insert_query text;
  v_columns text[];
  v_values text[];
  v_success_count integer := 0;
  v_error_count integer := 0;
  v_errors jsonb := '[]'::jsonb;
  v_row_num integer := 0;
  v_key text;
  v_value text;
  v_db_column text;
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Table %s does not exist', p_table_name)
    );
  END IF;

  -- Iterate through each row in the data array
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_data)
  LOOP
    v_row_num := v_row_num + 1;
    v_mapped_row := '{}'::jsonb;
    v_columns := ARRAY[]::text[];
    v_values := ARRAY[]::text[];

    BEGIN
      -- Map Excel columns to database columns
      FOR v_key, v_value IN SELECT * FROM jsonb_each_text(v_row)
      LOOP
        -- Get the database column name from mapping
        v_db_column := p_column_mapping->>v_key;
        
        IF v_db_column IS NOT NULL THEN
          v_mapped_row := v_mapped_row || jsonb_build_object(v_db_column, v_value);
        END IF;
      END LOOP;

      -- Build and execute insert query
      SELECT array_agg(key), array_agg(quote_literal(value))
      INTO v_columns, v_values
      FROM jsonb_each_text(v_mapped_row);

      v_insert_query := format(
        'INSERT INTO %I (%s) VALUES (%s)',
        p_table_name,
        array_to_string(v_columns, ', '),
        array_to_string(v_values, ', ')
      );

      EXECUTE v_insert_query;
      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
      v_errors := v_errors || jsonb_build_object(
        'row', v_row_num,
        'error', SQLERRM,
        'data', v_row
      );
    END;
  END LOOP;

  -- Return results
  RETURN jsonb_build_object(
    'success', v_error_count = 0,
    'total_rows', v_row_num,
    'success_count', v_success_count,
    'error_count', v_error_count,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;