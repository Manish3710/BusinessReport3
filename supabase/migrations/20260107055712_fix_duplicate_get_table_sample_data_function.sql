/*
  # Fix duplicate get_table_sample_data function
  
  1. Problem
    - Two versions of get_table_sample_data exist causing function resolution error
    - One with single text parameter (correct)
    - One with text + optional integer parameter (causing ambiguity)
  
  2. Solution
    - Drop the incorrect version with p_limit parameter
    - Keep the correct version that returns single row sample data
  
  3. Impact
    - Fixes the "function is not unique" error
    - Ensures sample data is retrieved correctly in Master Upload
*/

DROP FUNCTION IF EXISTS public.get_table_sample_data(text, integer);
