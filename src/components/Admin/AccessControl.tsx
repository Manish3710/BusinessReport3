import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import ConfirmModal from '../common/ConfirmModal';
import {
  Shield,
  Users,
  Mail,
  FileText,
  Upload,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Key,
  Eye,
  Edit,
  Play,
  AlertCircle
} from 'lucide-react';

interface UserAccess {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  resourceType: 'auto_mail' | 'instant_report' | 'master_upload';
  resourceId: string;
  resourceName: string;
  accessLevel: 'read' | 'write' | 'execute';
  grantedAt: string;
  grantedBy: string;
}

interface Resource {
  id: string;
  name: string;
}

const AccessControl: React.FC = () => {
  const { user } = useAuth();
  const [userAccesses, setUserAccesses] = useState<UserAccess[]>([]);
  const [filteredAccesses, setFilteredAccesses] = useState<UserAccess[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [autoMailReports, setAutoMailReports] = useState<Resource[]>([]);
  const [instantReports, setInstantReports] = useState<Resource[]>([]);
  const [masterUploads, setMasterUploads] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');

  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantFormData, setGrantFormData] = useState({
    userId: '',
    resourceType: 'instant_report' as 'auto_mail' | 'instant_report' | 'master_upload',
    resourceId: '',
    accessLevel: 'execute' as 'read' | 'write' | 'execute'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, email, first_name, last_name, role')
        .eq('is_active', true)
        .order('first_name');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Load instant reports
      const { data: instantData, error: instantError } = await supabase
        .from('instant_reports')
        .select('id, report_name')
        .eq('is_active', true)
        .order('report_name');

      if (instantError) throw instantError;
      setInstantReports((instantData || []).map(r => ({ id: r.id, name: r.report_name })));

      // Load auto mail reports
      const { data: autoMailData, error: autoMailError } = await supabase
        .from('auto_mail_reports')
        .select('id, report_name')
        .eq('is_active', true)
        .order('report_name');

      if (autoMailError) throw autoMailError;
      setAutoMailReports((autoMailData || []).map(r => ({ id: r.id, name: r.report_name })));

      // Load master upload configurations
      const { data: uploadsData, error: uploadsError } = await supabase
        .from('master_upload_configurations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (uploadsError) throw uploadsError;
      setMasterUploads((uploadsData || []).map(u => ({ id: u.id, name: u.name })));

      // Load resource access with user and grantor information
      await loadResourceAccess();

    } catch (error: any) {
      console.error('Error loading data:', error);
      setError('Failed to load access control data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadResourceAccess = async () => {
    try {
      const { data: accessData, error: accessError } = await supabase
        .from('resource_access')
        .select(`
          id,
          user_id,
          resource_type,
          resource_id,
          access_level,
          granted_at,
          granted_by
        `)
        .order('granted_at', { ascending: false });

      if (accessError) throw accessError;

      // Get user details and resource names
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, username, email, first_name, last_name');

      const { data: allInstantReports } = await supabase
        .from('instant_reports')
        .select('id, report_name');

      const { data: allAutoMailReports } = await supabase
        .from('auto_mail_reports')
        .select('id, report_name');

      const { data: allUploads } = await supabase
        .from('master_upload_configurations')
        .select('id, name');

      const formattedAccess = (accessData || []).map((access: any) => {
        const accessUser = (allUsers || []).find((u: any) => u.id === access.user_id);
        const grantedByUser = (allUsers || []).find((u: any) => u.id === access.granted_by);

        let resourceName = 'Unknown Resource';
        if (access.resource_type === 'instant_report') {
          const report = (allInstantReports || []).find((r: any) => r.id === access.resource_id);
          resourceName = report?.report_name || 'Unknown Report';
        } else if (access.resource_type === 'auto_mail') {
          const report = (allAutoMailReports || []).find((r: any) => r.id === access.resource_id);
          resourceName = report?.report_name || 'Unknown Report';
        } else if (access.resource_type === 'master_upload') {
          const upload = (allUploads || []).find((u: any) => u.id === access.resource_id);
          resourceName = upload?.name || 'Unknown Upload';
        }

        return {
          id: access.id,
          userId: access.user_id,
          userName: accessUser ? `${accessUser.first_name} ${accessUser.last_name}` : 'Unknown User',
          userEmail: accessUser?.email || '',
          resourceType: access.resource_type,
          resourceId: access.resource_id,
          resourceName,
          accessLevel: access.access_level,
          grantedAt: access.granted_at,
          grantedBy: grantedByUser?.username || 'Unknown'
        };
      });

      setUserAccesses(formattedAccess);
      setFilteredAccesses(formattedAccess);
    } catch (error: any) {
      console.error('Error loading resource access:', error);
      throw error;
    }
  };

  // Filter accesses
  useEffect(() => {
    let filtered = userAccesses.filter(access => {
      const matchesSearch =
        access.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        access.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        access.resourceName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesUser = userFilter === 'all' || access.userId === userFilter;
      const matchesResource = resourceFilter === 'all' || access.resourceType === resourceFilter;
      const matchesAccess = accessFilter === 'all' || access.accessLevel === accessFilter;

      return matchesSearch && matchesUser && matchesResource && matchesAccess;
    });

    setFilteredAccesses(filtered);
  }, [userAccesses, searchTerm, userFilter, resourceFilter, accessFilter]);

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const { error: insertError } = await supabase
        .from('resource_access')
        .insert({
          user_id: grantFormData.userId,
          resource_type: grantFormData.resourceType,
          resource_id: grantFormData.resourceId,
          access_level: grantFormData.accessLevel,
          granted_by: user?.id
        });

      if (insertError) {
        if (insertError.message.includes('duplicate')) {
          setError('This user already has access to this resource');
        } else {
          throw insertError;
        }
        return;
      }

      setSuccess('Access granted successfully!');
      await loadResourceAccess();
      setShowGrantModal(false);
      setGrantFormData({
        userId: '',
        resourceType: 'instant_report',
        resourceId: '',
        accessLevel: 'execute'
      });
    } catch (error: any) {
      console.error('Error granting access:', error);
      setError('Failed to grant access: ' + error.message);
    }
  };

  const revokeAccess = (accessId: string) => {
    setConfirmAction({
      title: 'Revoke Access',
      message: 'Are you sure you want to revoke this access?',
      onConfirm: async () => {
        setError('');
        setSuccess('');

        try {
          const { error: deleteError } = await supabase
            .from('resource_access')
            .delete()
            .eq('id', accessId);

          if (deleteError) throw deleteError;

          setSuccess('Access revoked successfully!');
          await loadResourceAccess();
        } catch (error: any) {
          console.error('Error revoking access:', error);
          setError('Failed to revoke access: ' + error.message);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'auto_mail':
        return <Mail className="h-4 w-4" />;
      case 'instant_report':
        return <FileText className="h-4 w-4" />;
      case 'master_upload':
        return <Upload className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getAccessIcon = (accessLevel: string) => {
    switch (accessLevel) {
      case 'read':
        return <Eye className="h-3 w-3" />;
      case 'write':
        return <Edit className="h-3 w-3" />;
      case 'execute':
        return <Play className="h-3 w-3" />;
      default:
        return <Shield className="h-3 w-3" />;
    }
  };

  const getAvailableResources = () => {
    switch (grantFormData.resourceType) {
      case 'auto_mail':
        return autoMailReports;
      case 'instant_report':
        return instantReports;
      case 'master_upload':
        return masterUploads;
      default:
        return [];
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
              <p className="mt-2 text-sm text-red-700">
                You don't have permission to access user access control.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Access Control</h1>
          <p className="text-gray-600">Manage user permissions for reports and uploads</p>
        </div>
        <button
          onClick={() => {
            setShowGrantModal(true);
            setError('');
            setSuccess('');
          }}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 whitespace-nowrap"
        >
          <Key className="h-4 w-4 mr-2" />
          Grant Access
        </button>
      </div>

      {/* Success/Error Messages */}
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

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <p className="text-sm text-blue-700">Loading access control data...</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-lg p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-lg p-3">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Permissions</p>
              <p className="text-2xl font-bold text-gray-900">{userAccesses.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 rounded-lg p-3">
              <Mail className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Auto Mail Reports</p>
              <p className="text-2xl font-bold text-gray-900">{autoMailReports.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-orange-100 rounded-lg p-3">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Instant Reports</p>
              <p className="text-2xl font-bold text-gray-900">{instantReports.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users or resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Users</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.first_name} {u.last_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Resource Type</label>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="auto_mail">Auto Mail Reports</option>
              <option value="instant_report">Instant Reports</option>
              <option value="master_upload">Master Uploads</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Access Level</label>
            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="read">Read</option>
              <option value="write">Write</option>
              <option value="execute">Execute</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setUserFilter('all');
                setResourceFilter('all');
                setAccessFilter('all');
              }}
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Access Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-full">
        <div className="overflow-x-auto">
          <table className="divide-y divide-gray-200" style={{ tableLayout: 'fixed', width: '1100px' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '280px' }}>
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '280px' }}>
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '140px' }}>
                  Access Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '150px' }}>
                  Granted By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '140px' }}>
                  Granted At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '110px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAccesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    No access permissions found. Click "Grant Access" to add permissions.
                  </td>
                </tr>
              ) : (
                filteredAccesses.map((access) => (
                  <tr key={access.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-3 min-w-0 flex-1 overflow-hidden">
                          <div className="text-sm font-medium text-gray-900 truncate">{access.userName}</div>
                          <div className="text-sm text-gray-500 truncate" title={access.userEmail}>{access.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 p-1 rounded ${
                          access.resourceType === 'auto_mail' ? 'bg-purple-100 text-purple-600' :
                          access.resourceType === 'instant_report' ? 'bg-green-100 text-green-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {getResourceIcon(access.resourceType)}
                        </div>
                        <div className="ml-3 min-w-0 flex-1 overflow-hidden">
                          <div className="text-sm font-medium text-gray-900 truncate" title={access.resourceName}>{access.resourceName}</div>
                          <div className="text-sm text-gray-500 capitalize truncate">
                            {access.resourceType.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        access.accessLevel === 'read' ? 'bg-blue-100 text-blue-800' :
                        access.accessLevel === 'write' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {getAccessIcon(access.accessLevel)}
                        <span className="ml-1 capitalize">{access.accessLevel}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {access.grantedBy}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(access.grantedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => revokeAccess(access.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Revoke Access"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grant Access Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-w-md">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Grant Access</h3>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleGrantAccess} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <select
                    required
                    value={grantFormData.userId}
                    onChange={(e) => setGrantFormData({ ...grantFormData, userId: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select User</option>
                    {users.filter(u => u.role !== 'admin').map(u => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Resource Type</label>
                  <select
                    value={grantFormData.resourceType}
                    onChange={(e) => setGrantFormData({
                      ...grantFormData,
                      resourceType: e.target.value as any,
                      resourceId: ''
                    })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="instant_report">Instant Reports</option>
                    <option value="auto_mail">Auto Mail Reports</option>
                    <option value="master_upload">Master Uploads</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Resource</label>
                  <select
                    required
                    value={grantFormData.resourceId}
                    onChange={(e) => setGrantFormData({ ...grantFormData, resourceId: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Resource</option>
                    {getAvailableResources().map(resource => (
                      <option key={resource.id} value={resource.id}>
                        {resource.name}
                      </option>
                    ))}
                  </select>
                  {getAvailableResources().length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      No resources available for this type
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Access Level</label>
                  <select
                    value={grantFormData.accessLevel}
                    onChange={(e) => setGrantFormData({ ...grantFormData, accessLevel: e.target.value as any })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="execute">Execute - Run/Use resource</option>
                    <option value="read">Read - View only</option>
                    <option value="write">Write - Full permissions</option>
                  </select>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    Grant Access
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGrantModal(false);
                      setGrantFormData({
                        userId: '',
                        resourceType: 'instant_report',
                        resourceId: '',
                        accessLevel: 'execute'
                      });
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

      {/* Confirmation Modal */}
      {confirmAction && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setConfirmAction(null);
          }}
          onConfirm={confirmAction.onConfirm}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText="Revoke"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
};

export default AccessControl;
