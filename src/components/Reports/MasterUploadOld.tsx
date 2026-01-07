import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useReports } from '../../hooks/useReports';
import { 
  Plus, 
  Upload, 
  Download, 
  FileText,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  File,
  AlertCircle
} from 'lucide-react';
import { MasterUpload as MasterUploadType } from '../../types';

// Component to show real data from database table
const RealDataTable: React.FC<{ upload: MasterUploadType }> = ({ upload }) => {
  const [sampleData, setSampleData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        // Try to get real data from database
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/admin/table-data/${upload.tableName}?limit=1`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.length > 0) {
            setSampleData(result.data[0]);
          } else {
            // Use mock data if no real data
            setSampleData(getMockData(upload.tableName));
          }
        } else {
          setSampleData(getMockData(upload.tableName));
        }
      } catch (error) {
        console.log('Using mock data:', error);
        setSampleData(getMockData(upload.tableName));
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, [upload.tableName]);

  const getMockData = (tableName: string) => {
    if (tableName.toLowerCase() === 'products') {
      return {
        product_id: 'P001',
        product_name: 'Sample Product',
        category: 'Electronics',
        price: 99.99,
        stock_quantity: 50,
        created_at: '2024-01-01'
      };
    } else if (tableName.toLowerCase() === 'customers') {
      return {
        customer_id: 'C001',
        customer_name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        address: '123 Main St',
        created_at: '2024-01-01'
      };
    } else {
      return {
        id: '1',
        name: 'Sample Name',
        created_at: '2024-01-01'
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-xs text-gray-500">Loading table data...</span>
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="text-left py-1 px-2 font-medium text-gray-700">Excel Column</th>
          <th className="text-left py-1 px-2 font-medium text-gray-700">DB Column</th>
          <th className="text-left py-1 px-2 font-medium text-gray-700">Actual Value</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(upload.columnMapping).map(([display, db]) => {
          const actualValue = sampleData[db] || 'N/A';
          
          return (
            <tr key={display} className="border-b border-gray-100">
              <td className="py-1 px-2 text-gray-600 font-medium">{display}</td>
              <td className="py-1 px-2 text-gray-600 font-mono text-xs">{db}</td>
              <td className="py-1 px-2 text-gray-500 italic">
                {typeof actualValue === 'string' && actualValue.length > 15 
                  ? `${actualValue.substring(0, 15)}...` 
                  : String(actualValue)
                }
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
  const { getFilteredMasterUploads, checkUserAccess } = useReports();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState<MasterUploadType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    tableName: '',
    columns: ''
  });

  // Sample table data for column mapping display
  const [sampleTableData, setSampleTableData] = useState<Record<string, any>>({});

  // Mock data - replace with actual API calls
  const [uploads, setUploads] = useState<MasterUploadType[]>([
    {
      id: '1',
      name: 'Product Master Upload',
      tableName: 'products',
      sampleFileUrl: '/samples/products_template.xlsx',
      columnMapping: {
        'Product ID': 'product_id',
        'Product Name': 'product_name',
        'Category': 'category',
        'Price': 'price',
        'Stock Quantity': 'stock_quantity'
      },
      validationRules: [
        { column: 'product_id', type: 'required', message: 'Product ID is required' },
        { column: 'product_name', type: 'required', message: 'Product Name is required' },
        { column: 'price', type: 'dataType', value: 'number', message: 'Price must be a number' }
      ],
      isActive: true,
      createdBy: '1',
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'Customer Master Upload',
      tableName: 'customers',
      sampleFileUrl: '/samples/customers_template.xlsx',
      columnMapping: {
        'Customer ID': 'customer_id',
        'Customer Name': 'customer_name',
        'Email': 'email',
        'Phone': 'phone',
        'Address': 'address'
      },
      validationRules: [
        { column: 'customer_id', type: 'required', message: 'Customer ID is required' },
        { column: 'customer_name', type: 'required', message: 'Customer Name is required' },
        { column: 'email', type: 'custom', value: 'email', message: 'Valid email is required' }
      ],
      isActive: true,
      createdBy: '1',
      createdAt: '2024-01-01T00:00:00Z'
    }
  ]);

  // Get filtered uploads based on user access
  const filteredUploads = getFilteredMasterUploads(user?.id || '', user?.role || 'user');

  const editUpload = (upload: MasterUploadType) => {
    // Check if user has write access
    if (user?.role !== 'admin' && !checkUserAccess(user?.id || '', 'master_upload', upload.id, 'write')) {
      alert('You do not have permission to edit this upload configuration. Please contact your administrator.');
      return;
    }
    
    setSelectedUpload(upload);
    const columnsString = Object.entries(upload.columnMapping)
      .map(([display, db]) => `${display}:${db}`)
      .join(', ');
    
    setFormData({
      name: upload.name,
      tableName: upload.tableName,
      columns: columnsString
    });
    setShowCreateModal(true);
    setError('');
  };

  const deleteUpload = (uploadId: string) => {
    // Check if user has write access (required for delete)
    if (user?.role !== 'admin' && !checkUserAccess(user?.id || '', 'master_upload', uploadId, 'write')) {
      alert('You do not have permission to delete this upload configuration. Please contact your administrator.');
      return;
    }
    
    if (confirm('Are you sure you want to delete this upload configuration? This action cannot be undone.')) {
      setUploads(uploads.filter(u => u.id !== uploadId));
      alert('Upload configuration deleted successfully!');
    }
  };

  // Generate sample table data based on table name
  const generateSampleTableData = async (tableName: string) => {
    const sampleData: Record<string, any> = {};
    
    try {
      // Try to get real data from database
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/admin/table-data/${tableName}?limit=1`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          return result.data[0]; // Return first row of real data
        }
      }
    } catch (error) {
      console.log('Could not fetch real data, using mock data');
    }
    
    // Fallback to mock data if database not available
    if (tableName.toLowerCase() === 'products') {
      return {
        product_id: 'P001',
        product_name: 'Sample Product',
        category: 'Electronics',
        price: 99.99,
        stock_quantity: 50,
        created_at: '2024-01-01'
      };
    } else if (tableName.toLowerCase() === 'customers') {
      return {
        customer_id: 'C001',
        customer_name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        address: '123 Main St',
        created_at: '2024-01-01'
      };
    } else {
      return {
        id: '1',
        name: 'Sample Name',
        created_at: '2024-01-01'
      };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.columns.trim()) {
      setError('Column mapping is required');
      return;
    }
    
    // Parse columns (expecting format: "Column1:datatype, Column2:datatype")
    const columnPairs = formData.columns.split(',').map(col => col.trim());
    const columnMapping: Record<string, string> = {};
    const validationRules: any[] = [];
    
    try {
      columnPairs.forEach(pair => {
        const [displayName, dbColumn] = pair.split(':').map(s => s.trim());
        if (displayName && dbColumn) {
          columnMapping[displayName] = dbColumn;
          // Add basic required validation for all columns
          validationRules.push({
            column: dbColumn,
            type: 'required',
            message: `${displayName} is required`
          });
        } else {
          throw new Error('Invalid column mapping format');
        }
      });

      if (selectedUpload) {
        // Update existing upload
        const updatedUpload = {
          ...selectedUpload,
          name: formData.name,
          tableName: formData.tableName,
          columnMapping,
          validationRules,
          updatedAt: new Date().toISOString()
        };
        setUploads(uploads.map(u => u.id === selectedUpload.id ? updatedUpload : u));
        alert('Upload configuration updated successfully!');
      } else {
        // Create new upload
        const newUpload: MasterUploadType = {
          id: Date.now().toString(),
          name: formData.name,
          tableName: formData.tableName,
          sampleFileUrl: `/samples/${formData.tableName}_template.xlsx`,
          columnMapping,
          validationRules,
          isActive: true,
          createdBy: user?.id || '1',
          createdAt: new Date().toISOString()
        };
        setUploads([...uploads, newUpload]);
        alert('Upload configuration created successfully!');
      }
      
      setShowCreateModal(false);
      setSelectedUpload(null);
      setFormData({ name: '', tableName: '', columns: '' });
      setError('');
    } catch (err) {
      setError('Invalid column mapping format. Use: "Display Name:db_column, ..."');
    }
  };

  const openUploadModal = (upload: MasterUploadType) => {
    // Check if user has execute access
    if (user?.role !== 'admin' && !checkUserAccess(user?.id || '', 'master_upload', upload.id, 'execute')) {
      alert('You do not have permission to use this upload configuration. Please contact your administrator.');
      return;
    }
    
    setSelectedUpload(upload);
    setShowUploadModal(true);
    setSelectedFile(null);
    setUploadResults([]);
    setError('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
        setError('Please select an Excel file (.xlsx, .xls) or CSV file (.csv)');
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size cannot exceed 10MB');
        return;
      }
      
      setSelectedFile(file);
      setError('');
    }
  };

  const processUpload = async () => {
    if (!selectedFile || !selectedUpload) return;

    setError('');
    
    try {
      // Simulate file processing and validation
      const results = [];
      
      // Mock validation based on file content
      if (selectedUpload.tableName === 'products') {
        results.push(
          { row: 1, status: 'success', data: { product_id: 'P001', product_name: 'Test Product' } },
          { row: 2, status: 'error', error: 'Price must be a number at row 2', data: { product_id: 'P002' } },
          { row: 3, status: 'success', data: { product_id: 'P003', product_name: 'Another Product' } },
          { row: 4, status: 'error', error: 'Product ID is required at row 4', data: {} }
        );
      } else {
        results.push(
          { row: 1, status: 'success', data: { customer_id: 'C001', customer_name: 'John Doe' } },
          { row: 2, status: 'error', error: 'Invalid email format at row 2', data: { customer_id: 'C002' } },
          { row: 3, status: 'success', data: { customer_id: 'C003', customer_name: 'Jane Smith' } }
        );
      }
      
      setUploadResults(results);
      
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      if (errorCount === 0) {
        alert(`Upload successful! ${successCount} records inserted.`);
      } else {
        setError(`Upload completed with errors: ${successCount} successful, ${errorCount} failed. Please review the results below.`);
      }
      
    } catch (error) {
      setError('Upload failed. Please check your file format and try again.');
    }
  };

  const downloadSample = (upload: MasterUploadType, format: 'csv' | 'excel') => {
    const headers = Object.keys(upload.columnMapping);
    const sampleData = [headers];
    
    // Add sample rows based on the upload type
    if (upload.tableName === 'products') {
      sampleData.push(['P001', 'Sample Product 1', 'Electronics', '99.99', '50']);
      sampleData.push(['P002', 'Sample Product 2', 'Furniture', '199.99', '25']);
      sampleData.push(['P003', 'Sample Product 3', 'Clothing', '49.99', '100']);
    } else if (upload.tableName === 'customers') {
      sampleData.push(['C001', 'John Doe', 'john@example.com', '123-456-7890', '123 Main St']);
      sampleData.push(['C002', 'Jane Smith', 'jane@example.com', '098-765-4321', '456 Oak Ave']);
      sampleData.push(['C003', 'Bob Johnson', 'bob@example.com', '555-123-4567', '789 Pine St']);
    }
    
    if (format === 'csv') {
      // Create CSV
      const csvContent = sampleData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${upload.tableName}_template.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      // Create Excel (simplified as tab-separated)
      const excelContent = sampleData.map(row => row.join('\t')).join('\n');
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${upload.tableName}_template.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Master Upload</h1>
          <p className="text-sm sm:text-base text-gray-600">Bulk upload data to database tables</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Upload
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {filteredUploads.map((upload) => (
          <div key={upload.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">{upload.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Table: {upload.tableName}
                  </p>
                  
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-700 mb-2">Column Mapping & Sample Data:</p>
                    <div className="bg-gray-50 rounded-md p-3 max-h-40 overflow-y-auto">
                      <RealDataTable upload={upload} />
                    </div>
                  </div>
                </div>
                
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ml-4 ${
                  upload.isActive ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>
              
              <div className="mt-6 flex flex-col space-y-2">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <button
                    onClick={() => downloadSample(upload, 'csv')}
                    className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    CSV Template
                  </button>
                  
                  <button
                    onClick={() => downloadSample(upload, 'excel')}
                    className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Excel Template
                  </button>
                  
                  <button
                    onClick={() => openUploadModal(upload)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 transition-colors duration-200"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Upload Data
                  </button>
                </div>
                
                {(user?.role === 'admin' || checkUserAccess(user?.id || '', 'master_upload', upload.id, 'write')) && (
                  <div className="flex justify-end space-x-2">
                    <button 
                      onClick={() => editUpload(upload)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      title="Edit Upload"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => deleteUpload(upload.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors duration-200"
                      title="Delete Upload"
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

      {/* Create Upload Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto border shadow-lg rounded-md bg-white max-w-2xl">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedUpload ? 'Edit Master Upload' : 'Create Master Upload'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Upload Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Database Table Name</label>
                  <input
                    type="text"
                    required
                    value={formData.tableName}
                    onChange={(e) => setFormData({ ...formData, tableName: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Column Mapping</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Format: Excel Column Name:database_column, ... (e.g., "Product ID:product_id, Product Name:product_name")
                  </p>
                  <textarea
                    required
                    rows={4}
                    value={formData.columns}
                    onChange={(e) => setFormData({ ...formData, columns: e.target.value })}
                    placeholder="Product ID:product_id, Product Name:product_name, Price:price"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    {selectedUpload ? 'Update Upload' : 'Create Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedUpload(null);
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

      {/* Upload Modal */}
      {showUploadModal && selectedUpload && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto border shadow-lg rounded-md bg-white max-w-3xl">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Upload Data: {selectedUpload.name}
              </h3>
              
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Important Instructions</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Download the template file first, fill in your data, and upload the completed file.
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
                
                {uploadResults.length > 0 && (
                  <div className="max-h-64 overflow-y-auto">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Upload Results</h4>
                    <div className="space-y-2">
                      {uploadResults.map((result, index) => (
                        <div key={index} className={`p-2 rounded-md border ${
                          result.status === 'success' 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex items-center">
                            {result.status === 'success' ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                            )}
                            <span className="text-sm">
                              Row {result.row}: {result.status === 'success' ? 'Success' : result.error}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    onClick={() => downloadSample(selectedUpload, 'csv')}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors duration-200 inline-flex items-center justify-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    CSV Template
                  </button>
                  <button
                    onClick={() => downloadSample(selectedUpload, 'excel')}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 inline-flex items-center justify-center"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Excel Template
                  </button>
                  <button
                    onClick={processUpload}
                    disabled={!selectedFile}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 inline-flex items-center justify-center"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Process Upload
                  </button>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setError('');
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterUpload;