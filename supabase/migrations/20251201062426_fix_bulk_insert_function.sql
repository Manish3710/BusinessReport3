-- Drop and recreate the bulk insert function with proper JSON handling
DROP FUNCTION IF EXISTS bulk_insert_with_validation(text, jsonb, jsonb);

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
  v_all_columns text[];
  v_all_values text[];
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = p_table_name
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Table %s does not exist', p_table_name),
      'total_rows', 0,
      'success_count', 0,
      'error_count', 0,
      'errors', '[]'::jsonb
    );
  END IF;

  -- Iterate through each row in the data array
  FOR v_row IN SELECT jsonb_array_elements(p_data)
  LOOP
    v_row_num := v_row_num + 1;
    v_all_columns := ARRAY[]::text[];
    v_all_values := ARRAY[]::text[];

    BEGIN
      -- Map Excel columns to database columns
      FOR v_key, v_value IN SELECT * FROM jsonb_each_text(v_row)
      LOOP
        -- Get the database column name from mapping
        v_db_column := p_column_mapping->>v_key;
        
        IF v_db_column IS NOT NULL AND v_db_column != '' THEN
          v_all_columns := array_append(v_all_columns, v_db_column);
          
          -- Handle null/empty values
          IF v_value IS NULL OR v_value = '' THEN
            v_all_values := array_append(v_all_values, 'NULL');
          ELSE
            v_all_values := array_append(v_all_values, quote_literal(v_value));
          END IF;
        END IF;
      END LOOP;

      -- Only insert if we have columns
      IF array_length(v_all_columns, 1) > 0 THEN
        v_insert_query := format(
          'INSERT INTO %I (%s) VALUES (%s)',
          p_table_name,
          array_to_string(v_all_columns, ', '),
          array_to_string(v_all_values, ', ')
        );

        -- Log the query for debugging
        RAISE NOTICE 'Executing: %', v_insert_query;

        EXECUTE v_insert_query;
        v_success_count := v_success_count + 1;
      ELSE
        v_error_count := v_error_count + 1;
        v_errors := v_errors || jsonb_build_object(
          'row', v_row_num,
          'error', 'No valid columns found in row',
          'data', v_row
        );
      END IF;

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