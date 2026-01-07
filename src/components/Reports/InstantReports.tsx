import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import { formatDateIST } from '../../utils/dateUtils';
import { activityLogger } from '../../services/activityLogger';
import {
  Plus,
  Download,
  Calendar,
  Play,
  Square,
  Clock,
  FileText,
  Edit,
  Trash2,
  Filter,
  AlertCircle,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { QueryExecution } from '../../types';
import ConfirmModal from '../common/ConfirmModal';
import SuccessModal from '../common/SuccessModal';
import ErrorModal from '../common/ErrorModal';

const InstantReports: React.FC = () => {
  const { user } = useAuth();
  const [instantReports, setInstantReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    query: ''
  });
  const [runningQueries, setRunningQueries] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [executions, setExecutions] = useState<QueryExecution[]>([]);
  const [userAccessLevels, setUserAccessLevels] = useState<Map<string, string>>(new Map());
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState('');

  // Load instant reports from Supabase
  useEffect(() => {
    loadReports();
  }, [user]);

  const loadReports = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (user.role === 'admin') {
        const { data, error } = await supabase
          .from('instant_reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const formattedReports = data.map(report => ({
            id: report.id,
            name: report.report_name,
            query: report.query_text,
            isActive: report.is_active,
            createdBy: report.created_by || '1',
            createdAt: report.created_at
          }));
          setInstantReports(formattedReports);
        }
      } else {
        const { data: accessData, error: accessError } = await supabase
          .from('resource_access')
          .select('resource_id, access_level')
          .eq('user_id', user.id)
          .eq('resource_type', 'instant_report');

        if (accessError) throw accessError;

        const allowedReportIds = accessData?.map(a => a.resource_id) || [];
        const accessMap = new Map(accessData?.map(a => [a.resource_id, a.access_level]) || []);
        setUserAccessLevels(accessMap);

        if (allowedReportIds.length === 0) {
          setInstantReports([]);
        } else {
          const { data, error } = await supabase
            .from('instant_reports')
            .select('*')
            .in('id', allowedReportIds)
            .order('created_at', { ascending: false });

          if (error) throw error;

          if (data) {
            const formattedReports = data.map(report => ({
              id: report.id,
              name: report.report_name,
              query: report.query_text,
              isActive: report.is_active,
              createdBy: report.created_by || '1',
              createdAt: report.created_at
            }));
            setInstantReports(formattedReports);
          }
        }
      }
    } catch (error) {
      console.error('Error loading instant reports:', error);
      setError('Failed to load instant reports from database');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = instantReports;

  const validateDateRange = () => {
    // Allow running without dates to get all data
    if (dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      
      if (startDate > endDate) {
        setError('Start date cannot be greater than end date');
        return false;
      }
      
      const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
      if (daysDiff > 365) {
        setError('Date range cannot exceed 365 days');
        return false;
      }
    }
    
    setError('');
    return true;
  };

  const validateQuery = async (query: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      const tableRegex = /FROM\s+([\w_]+)/gi;
      const joinRegex = /JOIN\s+([\w_]+)/gi;
      const tables = new Set<string>();

      let match;
      while ((match = tableRegex.exec(query)) !== null) {
        tables.add(match[1].toLowerCase());
      }
      while ((match = joinRegex.exec(query)) !== null) {
        tables.add(match[1].toLowerCase());
      }

      if (tables.size === 0) {
        return { valid: false, error: 'No tables found in query. Please use FROM clause.' };
      }

      const { data: allTables, error: tablesError } = await supabase.rpc('get_available_tables');

      if (tablesError) {
        console.warn('Could not validate tables:', tablesError);
        return { valid: true };
      }

      const existingTables = new Set(
        (allTables || []).map((t: any) => t.table_name.toLowerCase())
      );

      const missingTables: string[] = [];
      for (const table of tables) {
        if (!existingTables.has(table)) {
          missingTables.push(table);
        }
      }

      if (missingTables.length > 0) {
        return {
          valid: false,
          error: `Table(s) not found: ${missingTables.join(', ')}. Available tables: ${Array.from(existingTables).slice(0, 10).join(', ')}${existingTables.size > 10 ? '...' : ''}`
        };
      }

      return { valid: true };
    } catch (error: any) {
      console.error('Query validation error:', error);
      return { valid: true };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Report name is required');
      return;
    }

    if (!formData.query.trim()) {
      setError('SQL query is required');
      return;
    }

    setLoading(true);
    setError('');

    const validation = await validateQuery(formData.query);
    if (!validation.valid) {
      setError(validation.error || 'Invalid query');
      setLoading(false);
      return;
    }

    try {
      if (selectedReport) {
        // Update existing report
        const { error: updateError } = await supabase
          .from('instant_reports')
          .update({
            report_name: formData.name,
            query_text: formData.query,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedReport.id);

        if (updateError) throw updateError;

        setSuccess('Instant report updated successfully!');

        await activityLogger.logReportUpdate('instant', formData.name, selectedReport.id);
      } else {
        // Create new report - generate unique report_id
        const { data: existingReports, error: fetchError } = await supabase
          .from('instant_reports')
          .select('report_id')
          .order('report_id', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        let nextNumber = 1;
        if (existingReports && existingReports.length > 0) {
          const lastId = existingReports[0].report_id;
          const match = lastId.match(/RPT(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
          }
        }

        const reportId = `RPT${String(nextNumber).padStart(4, '0')}`;

        const { error: insertError } = await supabase
          .from('instant_reports')
          .insert({
            report_id: reportId,
            user_id: user?.id || null,
            report_name: formData.name,
            query_text: formData.query,
            is_active: true,
            created_by: user?.username || 'admin'
          });

        if (insertError) throw insertError;

        setSuccess('Instant report created successfully!');

        await activityLogger.logReportCreation('instant', formData.name, reportId);
      }

      await loadReports();
      setShowCreateModal(false);
      setSelectedReport(null);
      setFormData({ name: '', query: '' });
    } catch (error: any) {
      console.error('Error saving instant report:', error);
      setError(error.message || 'Failed to save instant report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const editReport = (report: any) => {
    if (user?.role !== 'admin') {
      setErrorModalMessage('Only administrators can edit reports.');
      setShowErrorModal(true);
      return;
    }

    setSelectedReport(report);
    setFormData({
      name: report.name,
      query: report.query
    });
    setShowCreateModal(true);
    setError('');
  };

  const deleteReport = (reportId: string) => {
    if (user?.role !== 'admin') {
      setErrorModalMessage('Only administrators can delete reports.');
      setShowErrorModal(true);
      return;
    }

    setReportToDelete(reportId);
    setShowConfirmDelete(true);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;

    const report = instantReports.find(r => r.id === reportToDelete);
    const reportName = report?.name || 'Unknown Report';

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('instant_reports')
        .delete()
        .eq('id', reportToDelete);

      if (deleteError) throw deleteError;

      await activityLogger.logReportDeletion('instant', reportName, reportToDelete);

      await loadReports();
      setSuccess('Report deleted successfully from Supabase!');
    } catch (error: any) {
      console.error('Error deleting report:', error);
      setError(error.message || 'Failed to delete report');
    } finally {
      setLoading(false);
      setReportToDelete(null);
    }
  };

  const executeQueryDirectly = async (query: string, startDate?: string, endDate?: string) => {
    try {
      let processedQuery = query.trim();

      if (startDate && endDate) {
        const inclusiveEndDate = `${endDate} 23:59:59`;

        if (processedQuery.includes(':start_date') && processedQuery.includes(':end_date')) {
          processedQuery = processedQuery.replace(/:start_date/g, `'${startDate}'`);
          processedQuery = processedQuery.replace(/:end_date/g, `'${inclusiveEndDate}'`);
        } else {
          const lowerQuery = processedQuery.toLowerCase();
          let dateColumn = 'created_at';

          if (lowerQuery.includes('updated_at')) {
            dateColumn = 'updated_at';
          } else if (lowerQuery.includes('last_login')) {
            dateColumn = 'last_login';
          }

          if (lowerQuery.includes('where')) {
            processedQuery = processedQuery.replace(/where/i, `WHERE ${dateColumn} BETWEEN '${startDate}' AND '${inclusiveEndDate}' AND`);
          } else {
            const fromMatch = processedQuery.match(/from\s+[\w.]+/i);
            if (fromMatch) {
              const insertPosition = fromMatch.index! + fromMatch[0].length;
              processedQuery =
                processedQuery.slice(0, insertPosition) +
                ` WHERE ${dateColumn} BETWEEN '${startDate}' AND '${inclusiveEndDate}'` +
                processedQuery.slice(insertPosition);
            }
          }
        }
      } else {
        if (processedQuery.includes(':start_date') || processedQuery.includes(':end_date')) {
          processedQuery = processedQuery.replace(/WHERE.*BETWEEN\s+:start_date\s+AND\s+:end_date/gi, '');
          processedQuery = processedQuery.replace(/AND.*BETWEEN\s+:start_date\s+AND\s+:end_date/gi, '');
          processedQuery = processedQuery.replace(/:start_date/g, `'1900-01-01'`);
          processedQuery = processedQuery.replace(/:end_date/g, `'2100-12-31'`);
        }
      }

      console.log('Processed query:', processedQuery);

      const { data, error } = await supabase.rpc('execute_sql', {
        query: processedQuery
      });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map((row: any) => row.result);
    } catch (error: any) {
      console.error('Direct query execution error:', error);
      throw error;
    }
  };

  const runReport = async (report: any) => {
    if (!validateDateRange()) {
      return;
    }

    const executionId = Date.now().toString();
    setRunningQueries(new Set([...runningQueries, executionId]));

    const execution: QueryExecution = {
      id: executionId,
      reportId: report.id,
      status: 'running',
      startTime: new Date().toISOString()
    };

    setExecutions([...executions, execution]);
    setShowRunModal(false);
    setError('');

    try {
      let reportData = [];

      try {
        console.log('Executing query against Supabase database...');
        reportData = await executeQueryDirectly(
          report.query,
          dateRange.startDate,
          dateRange.endDate
        );
        console.log('Query executed successfully, rows:', reportData.length);
      } catch (queryError: any) {
        console.error('Query execution error:', queryError);
        setError(`Query execution failed: ${queryError.message}`);
        setExecutions(prev => prev.map(exec =>
          exec.id === executionId
            ? {
                ...exec,
                status: 'failed',
                endTime: new Date().toISOString(),
                error: queryError.message
              }
            : exec
        ));
        setRunningQueries(prev => {
          const newSet = new Set(prev);
          newSet.delete(executionId);
          return newSet;
        });
        return;
      }
      
      // Extract column names from first row or get from query structure
      let columnNames: string[] = [];
      if (reportData.length > 0) {
        const firstRow = reportData[0];
        columnNames = Object.keys(firstRow);
      } else {
        try {
          const limitQuery = report.query.trim().replace(/;?\s*$/, '') + ' LIMIT 0';
          console.log('Getting column structure with:', limitQuery);

          const { data: structureData, error: structureError } = await supabase.rpc('execute_sql', {
            query: limitQuery
          });

          if (!structureError && structureData && structureData.length === 0) {
            const { data: metaData } = await supabase.rpc('execute_sql', {
              query: limitQuery
            });

            if (metaData && metaData.length > 0 && metaData[0].result) {
              columnNames = Object.keys(metaData[0].result);
            }
          }

          if (columnNames.length === 0) {
            const selectMatch = report.query.match(/select\s+(.*?)\s+from/i);
            if (selectMatch && selectMatch[1].trim() !== '*') {
              columnNames = selectMatch[1]
                .split(',')
                .map((col: string) => col.trim().split(/\s+as\s+/i).pop()?.trim() || col.trim());
            } else {
              const fromMatch = report.query.match(/from\s+([\w.]+)/i);
              if (fromMatch) {
                const tableName = fromMatch[1];
                const { data: columnsData } = await supabase.rpc('execute_sql', {
                  query: `SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}' AND table_schema = 'public' ORDER BY ordinal_position`
                });
                if (columnsData && columnsData.length > 0) {
                  columnNames = columnsData.map((row: any) => row.result.column_name);
                }
              }
            }
          }

          if (columnNames.length === 0) {
            columnNames = ['Column1'];
          }
        } catch (error) {
          console.error('Error getting column structure:', error);
          columnNames = ['Column1'];
        }
      }

      // Create CSV content with column headers
      const csvRows = [columnNames.join(',')];
      reportData.forEach((row: any) => {
        const values = columnNames.map(col => {
          const value = row[col];
          // Escape values that contain commas or quotes
          if (value && (value.toString().includes(',') || value.toString().includes('"'))) {
            return `"${value.toString().replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvRows.push(values.join(','));
      });
      const csvContent = csvRows.join('\n');
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      const csvUrl = window.URL.createObjectURL(csvBlob);

      // Create Excel content with column headers (tab-separated)
      const excelRows = [columnNames.join('\t')];
      reportData.forEach((row: any) => {
        const values = columnNames.map(col => row[col] || '');
        excelRows.push(values.join('\t'));
      });
      const excelContent = excelRows.join('\n');
      const excelBlob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
      const excelUrl = window.URL.createObjectURL(excelBlob);
      
      // Update execution status
      setExecutions(prev => prev.map(exec =>
        exec.id === executionId
          ? {
              ...exec,
              status: 'completed',
              endTime: new Date().toISOString(),
              downloadUrl: csvUrl,
              excelUrl: excelUrl
            }
          : exec
      ));

      setRunningQueries(prev => {
        const newSet = new Set(prev);
        newSet.delete(executionId);
        return newSet;
      });

      await activityLogger.logReportExecution('instant', report.name, report.id);

      setSuccessMessage('Report generated successfully! Download options are ready.');
      setShowSuccessModal(true);
    } catch (error) {
      setExecutions(prev => prev.map(exec => 
        exec.id === executionId 
          ? { 
              ...exec, 
              status: 'failed', 
              endTime: new Date().toISOString(),
              error: 'Query execution failed'
            }
          : exec
      ));
      
      setRunningQueries(prev => {
        const newSet = new Set(prev);
        newSet.delete(executionId);
        return newSet;
      });
    }
  };

  const downloadReport = (execution: QueryExecution, format: 'csv' | 'excel') => {
    const url = format === 'csv' ? execution.downloadUrl : execution.excelUrl;
    const extension = format === 'csv' ? 'csv' : 'xls';
    
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${execution.id}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const cancelQuery = (executionId: string) => {
    setExecutions(prev => prev.map(exec => 
      exec.id === executionId 
        ? { 
            ...exec, 
            status: 'cancelled', 
            endTime: new Date().toISOString()
          }
        : exec
    ));
    
    setRunningQueries(prev => {
      const newSet = new Set(prev);
      newSet.delete(executionId);
      return newSet;
    });
  };

  const openRunModal = (report: any) => {
    setSelectedReport(report);
    setShowRunModal(true);
    setError('');
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Instant Reports</h1>
          <p className="text-sm sm:text-base text-gray-600">Generate on-demand reports with date filtering</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => {
              setSelectedReport(null);
              setFormData({ name: '', query: '' });
              setShowCreateModal(true);
              setError('');
              setSuccess('');
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Report
          </button>
        )}
      </div>

      {/* Success Display */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Loading Display */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <p className="text-sm text-blue-700">Loading reports from Supabase...</p>
          </div>
        </div>
      )}

      {/* Running Queries */}
      {executions.filter(exec => exec.status === 'running').length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-3">Running Queries</h3>
          <div className="space-y-2">
            {executions
              .filter(exec => exec.status === 'running')
              .map(execution => {
                const report = filteredReports.find(r => r.id === execution.reportId);
                return (
                  <div key={execution.id} className="flex items-center justify-between bg-white p-3 rounded-md">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
                      <span className="text-sm text-gray-900">{report?.name}</span>
                    </div>
                    <button
                      onClick={() => cancelQuery(execution.id)}
                      className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 transition-colors duration-200"
                    >
                      <Square className="h-3 w-3 mr-1" />
                      Cancel
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredReports.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No instant reports</h3>
          <p className="mt-1 text-sm text-gray-500">
            {user?.role === 'admin'
              ? 'Get started by creating a new report.'
              : 'No reports have been shared with you. Contact your administrator for access.'}
          </p>
          {user?.role === 'admin' && (
            <div className="mt-6">
              <button
                onClick={() => {
                  setSelectedReport(null);
                  setFormData({ name: '', query: '' });
                  setShowCreateModal(true);
                  setError('');
                  setSuccess('');
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Report
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reports Grid */}
      {filteredReports.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {filteredReports.map((report) => (
          <div key={report.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">{report.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Created: {formatDateIST(report.createdAt)}
                  </p>
                  
                  <div className="mt-4">
                    <div className="bg-gray-50 rounded-md p-3">
                      <p className="text-xs font-medium text-gray-700 mb-1">Query Preview:</p>
                      <p className="text-xs text-gray-600 font-mono break-all">
                        {report.query.length > 100 
                          ? `${report.query.substring(0, 100)}...` 
                          : report.query
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ml-4 ${
                  report.isActive ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>
              
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                {(() => {
                  const accessLevel = user?.role === 'admin' ? 'execute' : userAccessLevels.get(report.id);
                  const canExecute = accessLevel === 'execute' || accessLevel === 'write';

                  return (
                    <>
                      <button
                        onClick={() => openRunModal(report)}
                        disabled={!canExecute}
                        className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md transition-colors duration-200 ${
                          canExecute
                            ? 'text-white bg-green-600 hover:bg-green-700'
                            : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                        }`}
                        title={!canExecute ? 'Read-only access: Cannot execute report' : 'Run Report'}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run Report
                      </button>

                      {!canExecute && (
                        <span className="text-xs text-gray-500 italic">Read-only access</span>
                      )}
                    </>
                  );
                })()}

                {user?.role === 'admin' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => editReport(report)}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      title="Edit Report"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteReport(report.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                      title="Delete Report"
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
      )}

      {/* Recent Executions with CSV and Excel Download */}
      {executions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Recent Executions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Downloads
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {executions.slice(0, 5).map((execution) => {
                  const report = instantReports.find(r => r.id === execution.reportId);
                  const duration = execution.endTime 
                    ? Math.round((new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime()) / 1000)
                    : null;
                    
                  return (
                    <tr key={execution.id}>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="truncate max-w-xs">{report?.name}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          execution.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : execution.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : execution.status === 'cancelled'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {execution.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="truncate">{formatDateIST(execution.startTime)}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {duration ? `${duration}s` : '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {execution.status === 'completed' && execution.downloadUrl && (
                          <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                            <button 
                              onClick={() => downloadReport(execution, 'csv')}
                              className="text-blue-600 hover:text-blue-900 inline-flex items-center text-xs"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              CSV
                            </button>
                            <button 
                              onClick={() => downloadReport(execution, 'excel')}
                              className="text-green-600 hover:text-green-900 inline-flex items-center text-xs"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Excel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto border shadow-lg rounded-md bg-white max-w-2xl">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedReport ? 'Edit Instant Report' : 'Create Instant Report'}
              </h3>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                  <div className="flex">
                    <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Report Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">SQL Query</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Use :start_date and :end_date parameters for date filtering
                  </p>
                  <textarea
                    required
                    rows={6}
                    value={formData.query}
                    onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                    placeholder="SELECT * FROM table_name WHERE date_column BETWEEN :start_date AND :end_date"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    {selectedReport ? 'Update Report' : 'Create Report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedReport(null);
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

      {/* Run Report Modal */}
      {showRunModal && selectedReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
          <div className="relative top-4 sm:top-20 mx-auto border shadow-lg rounded-md bg-white max-w-md">
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Run Report: {selectedReport.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <p className="text-xs text-gray-500 mb-1">Leave empty to get all data</p>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Date</label>
                  <p className="text-xs text-gray-500 mb-1">Leave empty to get all data</p>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">Query to Execute:</p>
                  <p className="text-xs text-gray-600 font-mono break-all">{selectedReport.query}</p>
                  {!dateRange.startDate && !dateRange.endDate && (
                    <p className="text-xs text-blue-600 mt-2">
                      ℹ️ No dates selected - will return all data from the table
                    </p>
                  )}
                  {dateRange.startDate && dateRange.endDate && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-green-600 font-medium">
                        ✓ Date filter will be applied
                      </p>
                      <p className="text-xs text-gray-600">
                        Filters by <span className="font-mono bg-white px-1 rounded">created_at</span> column automatically
                      </p>
                      <p className="text-xs text-gray-500 italic">
                        Tip: Use <span className="font-mono bg-white px-1 rounded">:start_date</span> and <span className="font-mono bg-white px-1 rounded">:end_date</span> in your query for custom date filtering
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                  <button
                    onClick={() => runReport(selectedReport)}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors duration-200 inline-flex items-center justify-center"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Report
                  </button>
                  <button
                    onClick={() => {
                      setShowRunModal(false);
                      setError('');
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors duration-200"
                  >
                    Cancel
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
          setReportToDelete(null);
        }}
        onConfirm={confirmDeleteReport}
        title="Delete Report"
        message="Are you sure you want to delete this report? This action cannot be undone."
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />

      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        message={errorModalMessage}
      />
    </div>
  );
};

export default InstantReports;