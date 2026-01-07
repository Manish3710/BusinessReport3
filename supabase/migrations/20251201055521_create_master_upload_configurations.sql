-- Create Master Upload Configurations Table
-- This table stores reusable upload configurations
-- Admin creates configurations mapping Excel columns to DB table columns
-- Users download sample templates and upload data based on these configs

CREATE TABLE IF NOT EXISTS master_upload_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  table_name text NOT NULL,
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_rules jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE master_upload_configurations ENABLE ROW LEVEL SECURITY;

-- Allow all users to view configurations
CREATE POLICY "Allow all users to view upload configurations"
  ON master_upload_configurations FOR SELECT
  TO public
  USING (true);

-- Allow all users to create configurations
CREATE POLICY "Allow all users to create upload configurations"
  ON master_upload_configurations FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow all users to update configurations
CREATE POLICY "Allow all users to update upload configurations"
  ON master_upload_configurations FOR UPDATE
  TO public
  USING (true);

-- Allow all users to delete configurations
CREATE POLICY "Allow all users to delete upload configurations"
  ON master_upload_configurations FOR DELETE
  TO public
  USING (true);