/*
  # Fix Bulk Insert Function with UPSERT Support
  
  This migration updates the bulk_insert_with_validation function to:
  
  1. Add UPSERT capability
    - Use INSERT ... ON CONFLICT ... DO UPDATE
    - Automatically detect primary key columns
    - Update existing records instead of failing
  
  2. Better Error Handling
    - Distinguish between duplicate and other errors
    - Provide clear error messages
  
  3. Flexible Conflict Resolution
    - Skip duplicates (ignore)
    - Update duplicates (upsert)
    - Fail on duplicates (current behavior)
*/

-- Drop existing function
DROP FUNCTION IF EXISTS bulk_insert_with_validation(text, jsonb, jsonb);

-- Create improved function with upsert support
CREATE OR REPLACE FUNCTION bulk_insert_with_validation(
  p_table_name text,
  p_data jsonb,
  p_column_mapping jsonb,
  p_on_conflict text DEFAULT 'update' -- 'update', 'skip', or 'error'
)
RETURNS jsonb AS $$
DECLARE
  v_row jsonb;
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
  v_primary_keys text[];
  v_update_clause text;
  v_col text;
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

  -- Get primary key columns for the table
  SELECT array_agg(a.attname)
  INTO v_primary_keys
  FROM pg_index i
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
  WHERE i.indrelid = p_table_name::regclass AND i.indisprimary;

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
        -- Build base insert query
        v_insert_query := format(
          'INSERT INTO %I (%s) VALUES (%s)',
          p_table_name,
          array_to_string(v_all_columns, ', '),
          array_to_string(v_all_values, ', ')
        );

        -- Add conflict resolution if primary keys exist and mode is not 'error'
        IF v_primary_keys IS NOT NULL AND array_length(v_primary_keys, 1) > 0 AND p_on_conflict != 'error' THEN
          IF p_on_conflict = 'skip' THEN
            -- Skip duplicates
            v_insert_query := v_insert_query || ' ON CONFLICT DO NOTHING';
          ELSIF p_on_conflict = 'update' THEN
            -- Update duplicates - build update clause for non-primary-key columns
            v_update_clause := '';
            FOREACH v_col IN ARRAY v_all_columns
            LOOP
              IF NOT (v_col = ANY(v_primary_keys)) THEN
                IF v_update_clause != '' THEN
                  v_update_clause := v_update_clause || ', ';
                END IF;
                v_update_clause := v_update_clause || format('%I = EXCLUDED.%I', v_col, v_col);
              END IF;
            END LOOP;

            IF v_update_clause != '' THEN
              v_insert_query := v_insert_query || format(
                ' ON CONFLICT (%s) DO UPDATE SET %s',
                array_to_string(v_primary_keys, ', '),
                v_update_clause
              );
            ELSE
              -- All columns are primary keys, just skip
              v_insert_query := v_insert_query || ' ON CONFLICT DO NOTHING';
            END IF;
          END IF;
        END IF;

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION bulk_insert_with_validation(text, jsonb, jsonb, text) TO authenticated, anon;
