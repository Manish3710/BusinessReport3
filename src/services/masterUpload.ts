import { supabase } from './supabase';
import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';

export interface MasterUploadConfig {
  id: string;
  config_id: string;
  name: string;
  description?: string;
  table_name: string;
  column_mapping: Record<string, string>;
  validation_rules?: any[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  is_primary_key: boolean;
  is_unique: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface UploadResult {
  success: boolean;
  total_rows: number;
  success_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    error: string;
    data: any;
  }>;
}

export const masterUploadService = {
  async getAllConfigurations(): Promise<MasterUploadConfig[]> {
    const { data, error } = await supabase
      .from('master_upload_configurations')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching configurations:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  async getConfigurationById(id: string): Promise<MasterUploadConfig | null> {
    const { data, error } = await supabase
      .from('master_upload_configurations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching configuration:', error);
      throw new Error(error.message);
    }

    return data;
  },

  async createConfiguration(config: Omit<MasterUploadConfig, 'id' | 'created_at' | 'updated_at'>): Promise<MasterUploadConfig> {
    const { data, error } = await supabase
      .from('master_upload_configurations')
      .insert({
        config_id: config.config_id,
        name: config.name,
        description: config.description,
        table_name: config.table_name,
        column_mapping: config.column_mapping,
        validation_rules: config.validation_rules || [],
        is_active: config.is_active,
        created_by: config.created_by
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating configuration:', error);
      throw new Error(error.message);
    }

    return data;
  },

  async updateConfiguration(id: string, updates: Partial<MasterUploadConfig>): Promise<MasterUploadConfig> {
    const { data, error } = await supabase
      .from('master_upload_configurations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating configuration:', error);
      throw new Error(error.message);
    }

    return data;
  },

  async deleteConfiguration(id: string): Promise<void> {
    const { error } = await supabase
      .from('master_upload_configurations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting configuration:', error);
      throw new Error(error.message);
    }
  },

  async getTableSchema(tableName: string): Promise<TableColumn[]> {
    try {
      const { data, error } = await supabase.rpc('get_table_schema', {
        p_table_name: tableName
      });

      if (error) {
        console.error('Error fetching table schema:', error);
        throw new Error(`Failed to get schema for table "${tableName}": ${error.message}`);
      }

      if (!data || data.length === 0) {
        throw new Error(`Table "${tableName}" not found or has no columns. Please verify the table name in your configuration.`);
      }

      return data;
    } catch (error: any) {
      console.error('Error in getTableSchema:', error);
      throw error;
    }
  },

  async getTableSampleData(tableName: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase.rpc('get_table_sample_data', {
        p_table_name: tableName
      });

      if (error) {
        console.error('Error fetching sample data:', error);
        return {};
      }

      if (!data) {
        return {};
      }

      const sampleData = typeof data === 'string' ? JSON.parse(data) : data;

      return sampleData || {};
    } catch (error: any) {
      console.error('Error in getTableSampleData:', error);
      return {};
    }
  },

  async generateSampleFile(config: MasterUploadConfig, format: 'csv' | 'excel'): Promise<Blob> {
    try {
      const headers = Object.keys(config.column_mapping);
      const rows: any[][] = [headers];

      let sampleData: Record<string, any> = {};
      try {
        sampleData = await this.getTableSampleData(config.table_name);
      } catch (error) {
        console.warn('Could not fetch sample data, generating empty template:', error);
      }

      if (sampleData && Object.keys(sampleData).length > 0) {
        const sampleRow = headers.map(excelCol => {
          const dbCol = config.column_mapping[excelCol];
          const value = sampleData[dbCol];
          if (value === null || value === undefined) return '';
          return String(value);
        });
        rows.push(sampleRow);
      }

      if (format === 'csv') {
        const csvContent = rows.map(row =>
          row.map(cell => {
            const cellStr = String(cell || '');
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(',')
        ).join('\n');

        return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      } else {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      }
    } catch (error: any) {
      console.error('Error generating sample file:', error);
      throw new Error(`Failed to generate template: ${error.message}`);
    }
  },

  async parseUploadFile(file: File, config: MasterUploadConfig): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });

          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData: any[] = XLSX.utils.sheet_to_json(firstSheet, {
            header: 1,
            raw: false,
            dateNF: 'yyyy-mm-dd'
          });

          if (jsonData.length === 0) {
            reject(new Error('File is empty. Please upload a file with data.'));
            return;
          }

          const headers = (jsonData[0] as string[]).map(h => (h || '').trim());
          const dataRows = jsonData.slice(1);

          if (dataRows.length === 0) {
            reject(new Error('File has headers but no data rows. Please add data to your file.'));
            return;
          }

          const expectedColumns = Object.keys(config.column_mapping);
          const missingColumns: string[] = [];
          const extraColumns: string[] = [];

          expectedColumns.forEach(expectedCol => {
            if (!headers.includes(expectedCol)) {
              missingColumns.push(expectedCol);
            }
          });

          headers.forEach(fileCol => {
            if (fileCol && !expectedColumns.includes(fileCol)) {
              extraColumns.push(fileCol);
            }
          });

          if (missingColumns.length > 0) {
            reject(new Error(
              `Column mismatch error!\n\n` +
              `Missing columns in your file: ${missingColumns.join(', ')}\n\n` +
              `Expected columns: ${expectedColumns.join(', ')}\n\n` +
              `Please download the template file and use the exact column names.`
            ));
            return;
          }

          if (extraColumns.length > 0) {
            console.warn('Extra columns found in file (will be ignored):', extraColumns);
          }

          const parsedData = dataRows
            .filter(row => row && row.length > 0 && row.some((cell: any) => cell !== null && cell !== undefined && cell !== ''))
            .map((row: any[]) => {
              const rowData: Record<string, any> = {};
              headers.forEach((header, index) => {
                if (header && expectedColumns.includes(header)) {
                  let value = row[index];

                  if (value !== undefined && value !== null && value !== '') {
                    if (typeof value === 'number' && value > 1000 && value < 100000) {
                      const excelEpoch = new Date(1899, 11, 30);
                      const date = new Date(excelEpoch.getTime() + value * 86400000);
                      if (!isNaN(date.getTime())) {
                        value = date.toISOString().split('T')[0];
                      }
                    }
                    rowData[header] = value;
                  } else {
                    rowData[header] = null;
                  }
                }
              });
              return rowData;
            });

          if (parsedData.length === 0) {
            reject(new Error('No valid data rows found in file after filtering empty rows.'));
            return;
          }

          resolve(parsedData);
        } catch (error: any) {
          console.error('Error parsing file:', error);
          reject(new Error(`Failed to parse file: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  },

  validateData(data: any[], config: MasterUploadConfig, schema: TableColumn[]): ValidationResult {
    const errors: string[] = [];
    const schemaMap = new Map(schema.map(col => [col.column_name, col]));

    if (data.length === 0) {
      errors.push('No data to validate. File contains no valid rows.');
      return { isValid: false, errors };
    }

    const emptyRowsFound: number[] = [];

    data.forEach((row, index) => {
      const rowNum = index + 2;
      let hasAnyValue = false;
      const rowErrors: string[] = [];

      Object.entries(config.column_mapping).forEach(([excelCol, dbCol]) => {
        const value = row[excelCol];
        const columnSchema = schemaMap.get(dbCol);

        if (!columnSchema) {
          rowErrors.push(`Column "${dbCol}" does not exist in table "${config.table_name}"`);
          return;
        }

        const isEmpty = value === undefined || value === null || value === '' || (typeof value === 'string' && value.trim() === '');

        if (!isEmpty) {
          hasAnyValue = true;
        }

        const isAutoGeneratedColumn = dbCol === 'id' || dbCol === 'created_at' || dbCol === 'updated_at';
        const hasDefaultValue = columnSchema.column_default !== null && columnSchema.column_default !== undefined;
        const isRequired = columnSchema.is_nullable === 'NO' && !hasDefaultValue && !isAutoGeneratedColumn;

        if (isRequired && isEmpty) {
          rowErrors.push(`"${excelCol}" is required and cannot be empty`);
        }

        if (!isEmpty && value !== null && value !== undefined) {
          const dataType = columnSchema.data_type.toLowerCase();
          const valueStr = String(value).trim();

          if ((dataType.includes('int') || dataType.includes('numeric') || dataType.includes('decimal')) && isNaN(Number(valueStr))) {
            rowErrors.push(`"${excelCol}" must be a number (got: "${value}")`);
          }

          if (dataType.includes('bool') && typeof value !== 'boolean' && !['true', 'false', '1', '0', 'yes', 'no'].includes(valueStr.toLowerCase())) {
            rowErrors.push(`"${excelCol}" must be a boolean value like true/false or 1/0 (got: "${value}")`);
          }

          if (dataType.includes('date') || dataType.includes('timestamp')) {
            const dateValue = new Date(value);
            if (isNaN(dateValue.getTime())) {
              rowErrors.push(`"${excelCol}" must be a valid date (got: "${value}")`);
            }
          }

          if (dataType.includes('varchar') || dataType.includes('char')) {
            const maxLengthMatch = columnSchema.data_type.match(/\((\d+)\)/);
            if (maxLengthMatch) {
              const maxLength = parseInt(maxLengthMatch[1], 10);
              if (valueStr.length > maxLength) {
                rowErrors.push(`"${excelCol}" exceeds maximum length of ${maxLength} characters (got ${valueStr.length} characters)`);
              }
            }
          }
        }
      });

      if (!hasAnyValue) {
        emptyRowsFound.push(rowNum);
      }

      if (rowErrors.length > 0) {
        errors.push(`Row ${rowNum}: ${rowErrors.join('; ')}`);
      }
    });

    if (emptyRowsFound.length > 0) {
      if (emptyRowsFound.length <= 5) {
        errors.push(`Empty rows found at: Row ${emptyRowsFound.join(', Row ')}`);
      } else {
        errors.push(`Found ${emptyRowsFound.length} empty rows (first few: Row ${emptyRowsFound.slice(0, 5).join(', Row ')})`);
      }
    }

    if (errors.length > 20) {
      const remainingErrors = errors.length - 20;
      return {
        isValid: false,
        errors: [...errors.slice(0, 20), `... and ${remainingErrors} more errors. Please fix the above errors first.`]
      };
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  async preprocessData(data: any[], config: MasterUploadConfig): Promise<any[]> {
    const hasPasswordColumn = Object.entries(config.column_mapping).some(
      ([_, dbCol]) => dbCol === 'password_hash'
    );

    if (!hasPasswordColumn || config.table_name !== 'users') {
      return data;
    }

    console.log('Processing passwords for user upload...');
    const passwordColumn = Object.entries(config.column_mapping).find(
      ([_, dbCol]) => dbCol === 'password_hash'
    )?.[0];

    if (!passwordColumn) return data;

    const processedData = await Promise.all(
      data.map(async (row) => {
        const newRow = { ...row };
        const password = row[passwordColumn];

        if (!password || password.toString().trim() === '') {
          newRow[passwordColumn] = 'ChangeMe123';
          console.log(`Row with ${row['Email'] || 'unknown'}: Using default password`);
        }

        const plainPassword = newRow[passwordColumn];
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        newRow[passwordColumn] = hashedPassword;

        return newRow;
      })
    );

    console.log('Password processing complete');
    return processedData;
  },

  async uploadData(config: MasterUploadConfig, data: any[], fileName: string, fileSize: number, userId: string): Promise<UploadResult> {
    let uploadRecordId: string | null = null;

    try {
      console.log('Uploading data to table:', config.table_name);
      console.log('Number of rows:', data.length);
      console.log('Column mapping:', config.column_mapping);
      console.log('Sample data:', data[0]);

      if (!config.table_name) {
        throw new Error('Table name is not specified in configuration.');
      }

      if (!config.column_mapping || Object.keys(config.column_mapping).length === 0) {
        throw new Error('Column mapping is not configured. Please check the upload configuration.');
      }

      const processedData = await this.preprocessData(data, config);

      const uploadId = `UPL${Date.now()}`;

      const { data: uploadRecord, error: uploadError } = await supabase
        .from('master_uploads')
        .insert({
          upload_id: uploadId,
          user_id: userId,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileName.endsWith('.csv') ? 'csv' : 'excel',
          total_records: data.length,
          processed_records: 0,
          failed_records: 0,
          status: 'processing'
        })
        .select()
        .single();

      if (uploadError) {
        console.error('Error creating upload record:', uploadError);
        throw new Error(`Failed to track upload in database: ${uploadError.message}`);
      }

      uploadRecordId = uploadRecord.id;
      console.log('Created upload record:', uploadRecordId);

      console.log('Calling bulk_insert_with_validation...');
      const { data: result, error } = await supabase.rpc('bulk_insert_with_validation', {
        p_table_name: config.table_name,
        p_data: processedData,
        p_column_mapping: config.column_mapping,
        p_on_conflict: 'update'
      });

      if (error) {
        console.error('Database error during bulk insert:', error);

        if (uploadRecordId) {
          await supabase
            .from('master_uploads')
            .update({
              status: 'failed',
              error_message: error.message,
              completed_at: new Date().toISOString()
            })
            .eq('id', uploadRecordId);
        }

        throw new Error(`Database error: ${error.message}${error.hint ? `\nHint: ${error.hint}` : ''}`);
      }

      if (!result) {
        throw new Error('No result returned from database. Upload may have failed silently.');
      }

      console.log('Upload result:', result);
      const uploadResult = result as UploadResult;

      if (uploadRecordId) {
        await supabase
          .from('master_uploads')
          .update({
            processed_records: uploadResult.success_count || 0,
            failed_records: uploadResult.error_count || 0,
            status: uploadResult.success ? 'completed' : 'failed',
            error_message: uploadResult.success ? null : 'Some records failed to insert',
            completed_at: new Date().toISOString()
          })
          .eq('id', uploadRecordId);
      }

      return uploadResult;
    } catch (error: any) {
      console.error('Error in uploadData:', error);

      if (uploadRecordId) {
        try {
          await supabase
            .from('master_uploads')
            .update({
              status: 'failed',
              error_message: error.message || 'Unknown error',
              completed_at: new Date().toISOString()
            })
            .eq('id', uploadRecordId);
        } catch (updateError) {
          console.error('Failed to update upload status:', updateError);
        }
      }

      throw error;
    }
  }
};
