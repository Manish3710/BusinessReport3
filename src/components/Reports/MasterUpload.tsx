import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Plus,
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  File,
  AlertCircle,
  Loader2,
  Table as TableIcon
} from 'lucide-react';
import { masterUploadService, type MasterUploadConfig, type TableColumn } from '../../services/masterUpload';
import { supabase } from '../../services/supabase';
import { activityLogger } from '../../services/activityLogger';
import ConfirmModal from '../common/ConfirmModal';

interface RealDataTableProps {
  config: MasterUploadConfig;
}

const RealDataTable: React.FC<RealDataTableProps> = ({ config }) => {
  const [sampleData, setSampleData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await masterUploadService.getTableSampleData(config.table_name);
        setSampleData(data);
      } catch (error) {
        console.error('Error fetching sample data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [config.table_name]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600 mr-2" />
        <span className="text-xs text-gray-500">Loading table data...</span>
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-1 px-2 font-medium text-gray-700">Excel Column</th>
          <th className="text-left py-1 px-2 font-medium text-gray-700">DB Column</th>
          <th className="text-left py-1 px-2 font-medium text-gray-700">Sample Value</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(config.column_mapping).map(([excelCol, dbCol]) => {
          const rawValue = sampleData[dbCol];
          let displayValue = 'N/A';

          if (rawValue !== null && rawValue !== undefined && rawValue !== '') {
            const strValue = String(rawValue);
            displayValue = strValue.length > 20 ? `${strValue.substring(0, 20)}...` : strValue;
          }

          return (
            <tr key={excelCol} className="border-b border-gray-100">
              <td className="py-1 px-2 text-gray-600 font-medium">{excelCol}</td>
              <td className="py-1 px-2 text-gray-600 font-mono text-xs">{dbCol}</td>
              <td className={`py-1 px-2 ${displayValue === 'N/A' ? 'text-gray-400' : 'text-gray-600'}`}>
                {displayValue}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const MasterUpload: React.FC = () => {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<MasterUploadConfig | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResults, setUploadResults] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tableName: '',
    columns: ''
  });

  const [configs, setConfigs] = useState<MasterUploadConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTableSchema, setSelectedTableSchema] = useState<TableColumn[]>([]);
  const [userAccessLevels, setUserAccessLevels] = useState<Map<string, string>>(new Map());
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadConfigurations();
  }, [user]);

  const loadConfigurations = async () => {
    try {
      setLoading(true);
      const allConfigs = await masterUploadService.getAllConfigurations();

      if (user?.role === 'admin') {
        setConfigs(allConfigs);
      } else {
        const { data: accessData } = await supabase
          .from('resource_access')
          .select('resource_id, access_level')
          .eq('user_id', user?.id)
          .eq('resource_type', 'master_upload');

        const accessibleIds = (accessData || []).map((a: any) => a.resource_id);
        const accessMap = new Map(accessData?.map((a: any) => [a.resource_id, a.access_level]) || []);
        setUserAccessLevels(accessMap);

        const accessibleConfigs = allConfigs.filter(config =>
          accessibleIds.includes(config.id)
        );

        setConfigs(accessibleConfigs);
      }
    } catch (error: any) {
      console.error('Error loading configurations:', error);
      setError(error.message || 'Failed to load configurations');
    } finally {
      setLoading(false);
    }
  };

  const loadTableSchema = async (tableName: string) => {
    try {
      const schema = await masterUploadService.getTableSchema(tableName);
      setSelectedTableSchema(schema);
    } catch (error: any) {
      console.error('Error loading table schema:', error);
      setError(error.message || 'Failed to load table schema');
    }
  };

  const handleTableNameChange = async (tableName: string) => {
    setFormData({ ...formData, tableName });
    if (tableName) {
      await loadTableSchema(tableName);
    } else {
      setSelectedTableSchema([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.columns.trim()) {
      setError('Column mapping is required');
      return;
    }

    try {
      const columnPairs = formData.columns.split(',').map(col => col.trim());
      const columnMapping: Record<string, string> = {};

      columnPairs.forEach(pair => {
        const [displayName, dbColumn] = pair.split(':').map(s => s.trim());
        if (displayName && dbColumn) {
          columnMapping[displayName] = dbColumn;
        } else {
          throw new Error('Invalid column mapping format');
        }
      });

      const configData = {
        config_id: `MU${Date.now()}`,
        name: formData.name,
        description: formData.description,
        table_name: formData.tableName,
        column_mapping: columnMapping,
        validation_rules: [],
        is_active: true,
        created_by: user?.id || ''
      };

      if (selectedConfig) {
        await masterUploadService.updateConfiguration(selectedConfig.id, configData);
        setSuccess('Upload configuration updated successfully!');
      } else {
        await masterUploadService.createConfiguration(configData);
        setSuccess('Upload configuration created successfully!');
      }

      await loadConfigurations();
      setShowCreateModal(false);
      setSelectedConfig(null);
      setFormData({ name: '', description: '', tableName: '', columns: '' });

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Invalid column mapping format. Use: "Display Name:db_column, ..."');
    }
  };

  const editConfig = (config: MasterUploadConfig) => {
    setSelectedConfig(config);
    const columnsString = Object.entries(config.column_mapping)
      .map(([display, db]) => `${display}:${db}`)
      .join(', ');

    setFormData({
      name: config.name,
      description: config.description || '',
      tableName: config.table_name,
      columns: columnsString
    });
    setShowCreateModal(true);
    setError('');
  };

  const deleteConfig = (configId: string) => {
    setConfigToDelete(configId);
    setShowConfirmDelete(true);
  };

  const confirmDeleteConfig = async () => {
    if (!configToDelete) return;

    try {
      await masterUploadService.deleteConfiguration(configToDelete);
      await loadConfigurations();
      setSuccess('Upload configuration deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to delete configuration');
    } finally {
      setConfigToDelete(null);
    }
  };

  const openUploadModal = (config: MasterUploadConfig) => {
    setSelectedConfig(config);
    setShowUploadModal(true);
    setSelectedFile(null);
    setUploadResults(null);
    setError('');
    setSuccess('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
        setError('Please select an Excel file (.xlsx, .xls) or CSV file (.csv)');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError('File size cannot exceed 10MB');
        return;
      }

      setSelectedFile(file);
      setError('');
    }
  };

  const processUpload = async () => {
    if (!selectedFile || !selectedConfig) return;

    setError('');
    setSuccess('');
    setIsProcessing(true);
    setUploadResults(null);

    try {
      console.log('Step 1: Parsing file...');
      const parsedData = await masterUploadService.parseUploadFile(selectedFile, selectedConfig);
      console.log('Parsed data:', parsedData.length, 'rows');
      console.log('Sample parsed row:', parsedData[0]);

      if (parsedData.length === 0) {
        setError('No data found in file. Please ensure your file contains data rows below the header.');
        setShowErrorModal(true);
        setIsProcessing(false);
        return;
      }

      console.log('Step 2: Loading table schema...');
      const schema = await masterUploadService.getTableSchema(selectedConfig.table_name);
      console.log('Table schema loaded:', schema.length, 'columns');

      if (schema.length === 0) {
        throw new Error(`Table "${selectedConfig.table_name}" not found or has no columns. Please verify the table name.`);
      }

      console.log('Step 3: Validating data...');
      const validation = masterUploadService.validateData(parsedData, selectedConfig, schema);

      if (!validation.isValid) {
        console.error('Validation failed with errors:', validation.errors);
        const errorCount = validation.errors.length;
        const displayErrors = validation.errors.slice(0, 15);
        const errorMessage = displayErrors.join('\n');
        const additionalErrors = errorCount > 15
          ? `\n\n... and ${errorCount - 15} more validation errors.`
          : '';

        setError(
          `Validation Failed (${errorCount} error${errorCount > 1 ? 's' : ''}):\n\n${errorMessage}${additionalErrors}\n\n` +
          `Please fix these errors and try again.`
        );
        setShowErrorModal(true);
        setIsProcessing(false);
        return;
      }

      console.log('Step 4: Uploading data to database...');
      const result = await masterUploadService.uploadData(
        selectedConfig,
        parsedData,
        selectedFile.name,
        selectedFile.size,
        user?.id || ''
      );

      console.log('Upload result:', result);
      setUploadResults(result);

      if (result.success && result.error_count === 0) {
        setSuccess(`✓ Upload successful! ${result.success_count} record(s) inserted into "${selectedConfig.table_name}".`);

        await activityLogger.logDataUpload(selectedConfig.table_name, result.success_count);

        setSelectedFile(null);
      } else if (result.error_count > 0) {
        setError(`Upload completed with errors: ${result.success_count} successful, ${result.error_count} failed. Review error details below.`);

        if (result.success_count > 0) {
          await activityLogger.logDataUpload(selectedConfig.table_name, result.success_count);
        }
      } else {
        throw new Error('Upload failed with unknown error. Please check the logs.');
      }

    } catch (error: any) {
      console.error('Upload error details:', error);
      const errorMessage = error.message || 'Upload failed due to an unknown error.';

      if (errorMessage.includes('Column mismatch')) {
        setError(`Column Mismatch Error:\n\n${errorMessage}`);
      } else if (errorMessage.includes('File is empty') || errorMessage.includes('no data rows')) {
        setError(`Empty File Error:\n\n${errorMessage}`);
      } else if (errorMessage.includes('Failed to parse')) {
        setError(`File Parsing Error:\n\n${errorMessage}\n\nPlease ensure:\n- File is a valid Excel or CSV file\n- File is not corrupted\n- Column names are in the first row`);
      } else {
        setError(`Upload Failed:\n\n${errorMessage}\n\nPlease check:\n- File format is correct (.xlsx, .xls, or .csv)\n- Column names match exactly (case-sensitive)\n- Data types are valid\n- All required fields are filled`);
      }
      setShowErrorModal(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSample = async (config: MasterUploadConfig, format: 'csv' | 'excel') => {
    try {
      const blob = await masterUploadService.generateSampleFile(config, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.table_name}_template.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setError(error.message || 'Failed to download sample file');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
        <span className="text-gray-600">Loading master uploads...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Master Upload</h1>
          <p className="text-sm sm:text-base text-gray-600">Bulk upload data to database tables</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setSelectedConfig(null);
              setFormData({ name: '', description: '', tableName: '', columns: '' });
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Upload Configuration
          </button>
        )}
      </div>


      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {configs.map((config) => (
          <div key={config.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">{config.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Table: <span className="font-mono text-gray-700">{config.table_name}</span>
                  </p>
                  {config.description && (
                    <p className="text-xs text-gray-500 mt-1">{config.description}</p>
                  )}

                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Column Mapping & Sample Data:</p>
                    <div className="bg-gray-50 rounded-md p-3 max-h-40 overflow-y-auto">
                      <RealDataTable config={config} />
                    </div>
                  </div>
                </div>

                <div className={`w-3 h-3 rounded-full flex-shrink-0 ml-4 ${
                  config.is_active ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>

              <div className="mt-6 flex flex-col space-y-2">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={() => downloadSample(config, 'csv')}
                    className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    CSV Template
                  </button>

                  <button
                    onClick={() => downloadSample(config, 'excel')}
                    className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Excel Template
                  </button>

                  {(() => {
                    const accessLevel = user?.role === 'admin' ? 'execute' : userAccessLevels.get(config.id);
                    const canUpload = accessLevel === 'execute' || accessLevel === 'write';

                    return (
                      <button
                        onClick={() => openUploadModal(config)}
                        disabled={!canUpload}
                        className={`flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded transition-colors duration-200 ${
                          canUpload
                            ? 'text-white bg-green-600 hover:bg-green-700'
                            : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                        }`}
                        title={!canUpload ? 'Read-only access: Cannot upload data' : 'Upload Data'}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Upload Data
                      </button>
                    );
                  })()}
                </div>
                {(() => {
                  const accessLevel = user?.role === 'admin' ? 'execute' : userAccessLevels.get(config.id);
                  const canUpload = accessLevel === 'execute' || accessLevel === 'write';

                  if (!canUpload) {
                    return (
                      <div className="text-center">
                        <span className="text-xs text-gray-500 italic">Read-only access</span>
                      </div>
                    );
                  }
                  return null;
                })()}

                {user?.role === 'admin' && (
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => editConfig(config)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      title="Edit Configuration"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteConfig(config.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors duration-200"
                      title="Delete Configuration"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {configs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <TableIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No upload configurations</h3>
          <p className="mt-1 text-sm text-gray-500">
            {user?.role === 'admin'
              ? 'Get started by creating a new upload configuration.'
              : 'No upload configurations have been shared with you. Contact your administrator for access.'}
          </p>
          {user?.role === 'admin' && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Configuration
              </button>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto border shadow-lg rounded-md bg-white max-w-2xl">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedConfig ? 'Edit Upload Configuration' : 'Create Upload Configuration'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Configuration Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Product Master Upload"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Upload product data to the products table"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Database Table Name</label>
                  <input
                    type="text"
                    required
                    value={formData.tableName}
                    onChange={(e) => handleTableNameChange(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="sales_data"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the exact table name from your database</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Column Mapping</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Format: Excel Column Name:database_column, ... (e.g., "Invoice No:invoice_no, Customer Name:customer_name")
                  </p>
                  <textarea
                    required
                    rows={4}
                    value={formData.columns}
                    onChange={(e) => setFormData({ ...formData, columns: e.target.value })}
                    placeholder="Invoice No:invoice_no, Customer Name:customer_name, Amount:amount"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    {selectedConfig ? 'Update Configuration' : 'Create Configuration'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedConfig(null);
                      setError('');
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && selectedConfig && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto border shadow-lg rounded-md bg-white max-w-4xl">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Upload Data: {selectedConfig.name}
              </h3>

              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Important Instructions</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        1. Download the template file first<br />
                        2. Fill in your data (keep the headers unchanged)<br />
                        3. Upload the completed file<br />
                        4. All validations must pass for data to be inserted
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File (Excel or CSV)
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <File className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                          <span>Upload a file</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileSelect}
                            disabled={isProcessing}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">Excel or CSV files only (max 10MB)</p>
                    </div>
                  </div>

                  {selectedFile && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </p>
                    </div>
                  )}
                </div>

                {uploadResults && (
                  <div className="max-h-96 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Upload Results</h4>
                    <div className="bg-gray-50 p-3 rounded-md mb-3">
                      <p className="text-sm text-gray-700">
                        Total Rows: {uploadResults.total_rows} |
                        Success: <span className="text-green-600 font-medium">{uploadResults.success_count}</span> |
                        Failed: <span className="text-red-600 font-medium">{uploadResults.error_count}</span>
                      </p>
                    </div>
                    {uploadResults.errors && uploadResults.errors.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-red-700">Errors:</p>
                        {uploadResults.errors.map((error: any, index: number) => (
                          <div key={index} className="p-2 rounded-md border bg-red-50 border-red-200">
                            <div className="flex items-start">
                              <AlertTriangle className="h-4 w-4 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="text-sm text-red-700">
                                  Row {error.row}: {error.error}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    onClick={() => downloadSample(selectedConfig, 'csv')}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200 inline-flex items-center justify-center"
                    disabled={isProcessing}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV Template
                  </button>
                  <button
                    onClick={() => downloadSample(selectedConfig, 'excel')}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 inline-flex items-center justify-center"
                    disabled={isProcessing}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel Template
                  </button>
                  <button
                    onClick={processUpload}
                    disabled={!selectedFile || isProcessing}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 inline-flex items-center justify-center"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Process Upload
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setError('');
                      setSuccess('');
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors duration-200"
                    disabled={isProcessing}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => {
          setShowConfirmDelete(false);
          setConfigToDelete(null);
        }}
        onConfirm={confirmDeleteConfig}
        title="Delete Upload Configuration"
        message="Are you sure you want to delete this upload configuration? This action cannot be undone."
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      {showErrorModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowErrorModal(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Validation Error
                    </h3>
                    <div className="mt-4">
                      <div className="bg-red-50 border border-red-200 rounded-md p-4 max-h-96 overflow-y-auto">
                        <pre className="text-xs text-red-700 whitespace-pre-wrap font-mono leading-relaxed">
                          {error}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setShowErrorModal(false);
                    setError('');
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterUpload;
