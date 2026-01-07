import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateIST } from '../../utils/dateUtils';
import { autoMailService, AutoMailReport, RunReportResult } from '../../services/autoMailService';
import { supabase } from '../../services/supabase';
import { activityLogger } from '../../services/activityLogger';
import {
  Plus,
  Mail,
  Clock,
  Play,
  Pause,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';

interface ReportFormModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  formData: {
    report_name: string;
    description: string;
    query_text: string;
    mail_from: string;
    mail_to: string;
    mail_subject: string;
    mail_body: string;
    schedule_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    schedule_day: string;
    schedule_time: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleSubmit: (e: React.FormEvent) => void;
  error: string;
  selectedReport: AutoMailReport | null;
}

const ReportFormModal: React.FC<ReportFormModalProps> = ({
  show,
  onClose,
  title,
  formData,
  setFormData,
  handleSubmit,
  error,
  selectedReport
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Name *
              </label>
              <input
                type="text"
                required
                value={formData.report_name}
                onChange={(e) => setFormData({ ...formData, report_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Weekly Sales Report"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Brief description of the report"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SQL Query *
              </label>
              <textarea
                required
                value={formData.query_text}
                onChange={(e) => setFormData({ ...formData, query_text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={4}
                placeholder="SELECT * FROM sales_data WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mail From *
              </label>
              <input
                type="email"
                required
                value={formData.mail_from}
                onChange={(e) => setFormData({ ...formData, mail_from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="manishwakade10@gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mail To * (comma-separated)
              </label>
              <input
                type="text"
                required
                value={formData.mail_to}
                onChange={(e) => setFormData({ ...formData, mail_to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email1@example.com, email2@example.com"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mail Subject *
              </label>
              <input
                type="text"
                required
                value={formData.mail_subject}
                onChange={(e) => setFormData({ ...formData, mail_subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Weekly Sales Report - [Date]"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mail Body (HTML supported) *
              </label>
              <textarea
                required
                value={formData.mail_body}
                onChange={(e) => setFormData({ ...formData, mail_body: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="<p>Dear Team,</p><p>Please find the attached report.</p>"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can use HTML tags for formatting (e.g., &lt;p&gt;, &lt;strong&gt;, &lt;img src=&quot;...&quot;&gt;)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Frequency *
              </label>
              <select
                required
                value={formData.schedule_frequency}
                onChange={(e) => setFormData({ ...formData, schedule_frequency: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly (Monday)</option>
                <option value="monthly">Monthly (1st day)</option>
                <option value="quarterly">Quarterly (1st day)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule Time (IST) *
              </label>
              <input
                type="time"
                required
                value={formData.schedule_time}
                onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              {selectedReport ? 'Update Report' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AutoMailReports: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<AutoMailReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AutoMailReport | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [runningReportId, setRunningReportId] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    report_name: '',
    description: '',
    query_text: '',
    mail_from: 'manishwakade10@gmail.com',
    mail_to: '',
    mail_subject: '',
    mail_body: '<p>Dear Team,</p><p>Please find the attached report.</p><p>Best regards</p>',
    schedule_frequency: 'daily' as 'daily' | 'weekly' | 'monthly' | 'quarterly',
    schedule_day: '',
    schedule_time: '09:00'
  });

  useEffect(() => {
    loadReports();
  }, [user]);

  const loadReports = async () => {
    if (!user) return;

    try {
      setLoading(true);

      if (user.role === 'admin') {
        const data = await autoMailService.getAllReports();
        setReports(data);
      } else {
        const { data: accessData, error: accessError } = await supabase
          .from('resource_access')
          .select('resource_id')
          .eq('user_id', user.id)
          .eq('resource_type', 'auto_mail');

        if (accessError) throw accessError;

        const allowedReportIds = accessData?.map(a => a.resource_id) || [];

        if (allowedReportIds.length === 0) {
          setReports([]);
        } else {
          const { data: reportsData, error: reportsError } = await supabase
            .from('auto_mail_reports')
            .select('*')
            .in('id', allowedReportIds)
            .order('created_at', { ascending: false });

          if (reportsError) throw reportsError;
          setReports(reportsData || []);
        }
      }
    } catch (error: any) {
      console.error('Error loading reports:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(formData.mail_from)) {
        setError('Please enter a valid "Mail From" email address');
        return;
      }

      const emailList = formData.mail_to.split(',').map(email => email.trim()).filter(e => e);
      const invalidEmails = emailList.filter(email => !emailRegex.test(email));

      if (invalidEmails.length > 0) {
        setError(`Invalid email addresses: ${invalidEmails.join(', ')}`);
        return;
      }

      if (emailList.length === 0) {
        setError('At least one recipient email is required');
        return;
      }

      const reportData = {
        user_id: user?.id || '',
        report_name: formData.report_name,
        description: formData.description,
        query_text: formData.query_text,
        mail_from: formData.mail_from,
        mail_to: emailList,
        mail_subject: formData.mail_subject,
        mail_body: formData.mail_body,
        schedule_frequency: formData.schedule_frequency,
        schedule_day: formData.schedule_day,
        schedule_time: formData.schedule_time,
        is_active: true
      };

      if (selectedReport) {
        await autoMailService.updateReport(selectedReport.id, reportData);
        setSuccess('Report updated successfully');

        await activityLogger.logReportUpdate('automail', formData.report_name, selectedReport.id);

        setShowEditModal(false);
      } else {
        const createdReport = await autoMailService.createReport(reportData);
        setSuccess('Report created successfully');

        await activityLogger.logReportCreation('automail', formData.report_name, createdReport?.id);

        setShowCreateModal(false);
      }

      await loadReports();
      resetForm();
    } catch (error: any) {
      setError(error.message || 'Failed to save report');
    }
  };

  const handleEditReport = (report: AutoMailReport) => {
    setSelectedReport(report);
    setFormData({
      report_name: report.report_name,
      description: report.description || '',
      query_text: report.query_text,
      mail_from: report.mail_from,
      mail_to: report.mail_to.join(', '),
      mail_subject: report.mail_subject,
      mail_body: report.mail_body,
      schedule_frequency: report.schedule_frequency,
      schedule_day: report.schedule_day || '',
      schedule_time: report.schedule_time
    });
    setShowEditModal(true);
  };

  const handleDeleteReport = (id: string) => {
    setReportToDelete(id);
    setShowConfirmDelete(true);
  };

  const confirmDeleteReport = async () => {
    if (!reportToDelete) return;

    const report = reports.find(r => r.id === reportToDelete);
    const reportName = report?.report_name || 'Unknown Report';

    try {
      await autoMailService.deleteReport(reportToDelete);
      setSuccess('Report deleted successfully');

      await activityLogger.logReportDeletion('automail', reportName, reportToDelete);

      await loadReports();
    } catch (error: any) {
      setError(error.message || 'Failed to delete report');
    } finally {
      setReportToDelete(null);
    }
  };

  const toggleReportStatus = async (id: string, currentStatus: boolean) => {
    try {
      await autoMailService.toggleReportStatus(id, !currentStatus);
      setSuccess(`Report ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      await loadReports();
    } catch (error: any) {
      setError(error.message || 'Failed to toggle report status');
    }
  };

  const runReportNow = async (reportId: string) => {
    const reportToRun = reports.find(r => r.id === reportId);
    const reportName = reportToRun?.report_name || 'Unknown Report';

    try {
      setRunningReportId(reportId);
      setError('');
      setSuccess('');

      const result: RunReportResult = await autoMailService.runReportNow(reportId);

      if (result.success) {
        setSuccess(result.message);

        await activityLogger.logReportExecution('automail', reportName, reportId);
      } else {
        setError(result.message);
      }

      await loadReports();
    } catch (error: any) {
      setError(error.message || 'Failed to run report');
    } finally {
      setRunningReportId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      report_name: '',
      description: '',
      query_text: '',
      mail_from: 'manishwakade10@gmail.com',
      mail_to: '',
      mail_subject: '',
      mail_body: '<p>Dear Team,</p><p>Please find the attached report.</p><p>Best regards</p>',
      schedule_frequency: 'daily',
      schedule_day: '',
      schedule_time: '09:00'
    });
    setSelectedReport(null);
    setError('');
  };

  const getScheduleDescription = (report: AutoMailReport) => {
    const time = report.schedule_time || '09:00';
    switch (report.schedule_frequency) {
      case 'daily':
        return `Daily at ${time} IST`;
      case 'weekly':
        return `Every Monday at ${time} IST`;
      case 'monthly':
        return `1st day of every month at ${time} IST`;
      case 'quarterly':
        return `1st day of quarter at ${time} IST`;
      default:
        return report.schedule_frequency;
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auto Mail Reports</h1>
          <p className="text-gray-600 mt-1">Schedule and automate report emails</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-flex items-center justify-center whitespace-nowrap"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Report
          </button>
        )}
      </div>

      {(error || success) && (
        <div className={`rounded-md p-4 ${error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex">
            {error ? (
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            )}
            <p className={`text-sm ${error ? 'text-red-700' : 'text-green-700'}`}>
              {error || success}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Mail className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No auto mail reports</h3>
          <p className="mt-1 text-sm text-gray-500">
            {user?.role === 'admin'
              ? 'Get started by creating a new report.'
              : 'No reports have been shared with you. Contact your administrator for access.'}
          </p>
          {user?.role === 'admin' && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Report
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900">{report.report_name}</h3>
                    <span
                      className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${
                        report.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {report.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {report.description && (
                    <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{getScheduleDescription(report)}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{report.mail_to.length} recipient(s)</span>
                    </div>

                    {report.last_run_at && (
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        <span>Last run: {formatDateIST(report.last_run_at)}</span>
                      </div>
                    )}

                    {report.next_run_at && report.is_active && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2 text-blue-500" />
                        <span>Next run: {formatDateIST(report.next_run_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => runReportNow(report.id)}
                    disabled={runningReportId === report.id}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50"
                    title="Run Now"
                  >
                    {runningReportId === report.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </button>

                  {user?.role === 'admin' && (
                    <>
                      <button
                        onClick={() => toggleReportStatus(report.id, report.is_active)}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-md"
                        title={report.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {report.is_active ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleEditReport(report)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>

                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReportFormModal
        show={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create New Auto Mail Report"
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        error={error}
        selectedReport={selectedReport}
      />

      <ReportFormModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        title="Edit Auto Mail Report"
        formData={formData}
        setFormData={setFormData}
        handleSubmit={handleSubmit}
        error={error}
        selectedReport={selectedReport}
      />

      <ConfirmModal
        isOpen={showConfirmDelete}
        onClose={() => {
          setShowConfirmDelete(false);
          setReportToDelete(null);
        }}
        onConfirm={confirmDeleteReport}
        title="Delete Report"
        message="Are you sure you want to delete this report?"
        confirmText="Delete"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
};

export default AutoMailReports;
