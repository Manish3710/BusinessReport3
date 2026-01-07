import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { useAuth } from '../contexts/AuthContext';
import { AutoMailReport, InstantReport, MasterUpload } from '../types';
import apiService from '../services/api';

// Custom hook for managing reports with persistence and real-time updates
export function useReports() {
  const [autoMailReports, setAutoMailReports] = useLocalStorage<AutoMailReport[]>('autoMailReports', []);
  const [instantReports, setInstantReports] = useLocalStorage<InstantReport[]>('instantReports', []);
  const [userAccessRights] = useLocalStorage<any[]>('userAccessRights', []);
  const [masterUploads, setMasterUploads] = useLocalStorage<MasterUpload[]>('masterUploads', []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with default data if empty
  useEffect(() => {
    if (autoMailReports.length === 0) {
      const defaultAutoMail: AutoMailReport[] = [
        {
          id: '1',
          name: 'Monthly Sales Report',
          mailFrom: 'reports@company.com',
          mailTo: ['sales@company.com', 'manager@company.com'],
          mailSubject: 'Monthly Sales Summary',
          mailBody: 'Please find attached the monthly sales report.',
          query: 'SELECT * FROM sales WHERE created_date >= TRUNC(SYSDATE, \'MM\')',
          isActive: true,
          schedule: 'Monthly',
          scheduleTime: '09:00',
          lastRun: '2024-01-15T10:00:00Z',
          createdBy: '1',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'Weekly Inventory Status',
          mailFrom: 'reports@company.com',
          mailTo: ['inventory@company.com'],
          mailSubject: 'Weekly Inventory Update',
          mailBody: 'Weekly inventory status report attached.',
          query: 'SELECT product_name, quantity, status FROM inventory WHERE last_updated >= SYSDATE - 7',
          isActive: false,
          schedule: 'Weekly',
          scheduleTime: '08:00',
          lastRun: '2024-01-10T08:00:00Z',
          createdBy: '1',
          createdAt: '2024-01-01T00:00:00Z'
        }
      ];
      setAutoMailReports(defaultAutoMail);
    }

    if (instantReports.length === 0) {
      const defaultInstant: InstantReport[] = [
        {
          id: '1',
          name: 'Customer Analysis Report',
          query: 'SELECT customer_id, customer_name, total_orders, last_order_date FROM customers WHERE last_order_date BETWEEN :start_date AND :end_date',
          isActive: true,
          createdBy: '1',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'Product Performance Report',
          query: 'SELECT product_id, product_name, sales_count, revenue FROM products WHERE created_date BETWEEN :start_date AND :end_date ORDER BY revenue DESC',
          isActive: true,
          createdBy: '1',
          createdAt: '2024-01-01T00:00:00Z'
        }
      ];
      setInstantReports(defaultInstant);
    }

    if (masterUploads.length === 0) {
      const defaultUploads: MasterUpload[] = [
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
      ];
      setMasterUploads(defaultUploads);
    }
  }, [autoMailReports.length, instantReports.length, masterUploads.length, setAutoMailReports, setInstantReports, setMasterUploads]);

  // Load reports from backend when available
  const loadReportsFromBackend = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [autoMail, instant] = await Promise.all([
        apiService.getAutoMailReports().catch(() => null),
        apiService.getInstantReports().catch(() => null)
      ]);

      if (autoMail?.reports) {
        setAutoMailReports(autoMail.reports);
      }
      
      if (instant?.reports) {
        setInstantReports(instant.reports);
      }
    } catch (err) {
      console.log('Backend not available, using local data');
    } finally {
      setIsLoading(false);
    }
  };

  // Add new auto mail report
  const addAutoMailReport = async (report: Omit<AutoMailReport, 'id' | 'createdAt'>) => {
    const newReport: AutoMailReport = {
      ...report,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    try {
      // Try to save to backend first
      await apiService.createAutoMailReport(newReport);
    } catch (error) {
      console.log('Backend not available, saving locally');
    }

    setAutoMailReports(prev => [...prev, newReport]);
    return newReport;
  };

  // Add new instant report
  const addInstantReport = async (report: Omit<InstantReport, 'id' | 'createdAt'>) => {
    const newReport: InstantReport = {
      ...report,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    // For now, just save locally since backend might not be available
    // In production, this would make an API call
    console.log('Saving instant report locally:', newReport);

    setInstantReports(prev => [...prev, newReport]);
    return newReport;
  };

  // Add new master upload
  const addMasterUpload = (upload: Omit<MasterUpload, 'id' | 'createdAt'>) => {
    const newUpload: MasterUpload = {
      ...upload,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };

    setMasterUploads(prev => [...prev, newUpload]);
    return newUpload;
  };

  // Update report status
  const updateAutoMailReportStatus = (id: string, isActive: boolean) => {
    setAutoMailReports(prev => 
      prev.map(report => 
        report.id === id ? { ...report, isActive } : report
      )
    );
  };

  // Delete auto mail report
  const deleteAutoMailReport = (id: string) => {
    setAutoMailReports(prev => prev.filter(report => report.id !== id));
  };

  // Update instant report
  const updateInstantReport = (id: string, updatedReport: Partial<InstantReport>) => {
    setInstantReports(prev => 
      prev.map(report => 
        report.id === id ? { ...report, ...updatedReport } : report
      )
    );
  };

  // Delete instant report
  const deleteInstantReport = (id: string) => {
    setInstantReports(prev => prev.filter(report => report.id !== id));
  };

  // Update auto mail report
  const updateAutoMailReport = (id: string, updatedReport: Partial<AutoMailReport>) => {
    setAutoMailReports(prev => 
      prev.map(report => 
        report.id === id ? { ...report, ...updatedReport } : report
      )
    );
  };

  // Check user access for a specific resource
  const checkUserAccess = (userId: string, resourceType: string, resourceId: string, requiredAccess: string) => {
    const access = userAccessRights.find(
      (access: any) => 
        access.userId === userId && 
        access.resourceType === resourceType && 
        access.resourceId === resourceId
    );
    
    if (!access) return false;
    
    // Check access level hierarchy: write > execute > read
    const accessLevels = ['read', 'execute', 'write'];
    const userLevel = accessLevels.indexOf(access.accessLevel);
    const requiredLevel = accessLevels.indexOf(requiredAccess);
    
    return userLevel >= requiredLevel;
  };

  // Filter reports based on user access
  const getFilteredAutoMailReports = (userId: string, userRole: string) => {
    if (userRole === 'admin') return autoMailReports;
    return autoMailReports.filter(report => 
      checkUserAccess(userId, 'auto_mail', report.id, 'read')
    );
  };

  const getFilteredMasterUploads = (userId: string, userRole: string) => {
    if (userRole === 'admin') return masterUploads;
    return masterUploads.filter(upload => 
      checkUserAccess(userId, 'master_upload', upload.id, 'read')
    );
  };

  const getFilteredInstantReports = (userId: string, userRole: string) => {
    if (userRole === 'admin') return instantReports;
    return instantReports.filter(report => 
      checkUserAccess(userId, 'instant_report', report.id, 'read')
    );
  };

  // Get statistics
  const getStats = () => {
    return {
      totalAutoMail: autoMailReports.length,
      activeAutoMail: autoMailReports.filter(r => r.isActive).length,
      totalInstant: instantReports.length,
      activeInstant: instantReports.filter(r => r.isActive).length,
      totalUploads: masterUploads.length,
      activeUploads: masterUploads.filter(u => u.isActive).length
    };
  };

  return {
    autoMailReports,
    instantReports,
    masterUploads,
    isLoading,
    error,
    addAutoMailReport,
    getFilteredAutoMailReports,
    getFilteredInstantReports,
    getFilteredMasterUploads,
    checkUserAccess,
    addInstantReport,
    addMasterUpload,
    updateAutoMailReportStatus,
    deleteAutoMailReport,
    updateAutoMailReport,
    updateInstantReport,
    deleteInstantReport,
    loadReportsFromBackend,
    getStats
  };
}