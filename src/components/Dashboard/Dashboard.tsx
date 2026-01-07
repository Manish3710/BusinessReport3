import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useReports } from '../../hooks/useReports';
import { supabase } from '../../services/supabase';
import {
  Mail,
  FileText,
  Upload,
  Users,
  RefreshCw
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalAutoMailReports: number;
  activeAutoMailReports: number;
  totalInstantReports: number;
  activeInstantReports: number;
  totalMasterUploads: number;
  activeMasterUploads: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getStats, loadReportsFromBackend } = useReports();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalAutoMailReports: 0,
    activeAutoMailReports: 0,
    totalInstantReports: 0,
    activeInstantReports: 0,
    totalMasterUploads: 0,
    activeMasterUploads: 0
  });

  // Get local statistics
  const stats = getStats();

  // Load dashboard statistics from database
  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const [
        usersResult,
        autoMailResult,
        instantReportsResult,
        masterUploadConfigsResult
      ] = await Promise.all([
        supabase.from('users').select('id, is_active', { count: 'exact' }),
        supabase.from('auto_mail_reports').select('id, is_active', { count: 'exact' }),
        supabase.from('instant_reports').select('id, is_active', { count: 'exact' }),
        supabase.from('master_upload_configurations').select('id, is_active', { count: 'exact' })
      ]);

      const totalUsers = usersResult.count || 0;
      const activeUsers = usersResult.data?.filter(u => u.is_active).length || 0;

      const totalAutoMail = autoMailResult.count || 0;
      const activeAutoMail = autoMailResult.data?.filter(r => r.is_active).length || 0;

      const totalInstant = instantReportsResult.count || 0;
      const activeInstant = instantReportsResult.data?.filter(r => r.is_active).length || 0;

      const totalUploadConfigs = masterUploadConfigsResult.count || 0;
      const activeUploadConfigs = masterUploadConfigsResult.data?.filter(c => c.is_active).length || 0;

      setDashboardStats({
        totalUsers,
        activeUsers,
        totalAutoMailReports: totalAutoMail,
        activeAutoMailReports: activeAutoMail,
        totalInstantReports: totalInstant,
        activeInstantReports: activeInstant,
        totalMasterUploads: totalUploadConfigs,
        activeMasterUploads: activeUploadConfigs
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  // Refresh dashboard data
  const refreshDashboard = async () => {
    setIsRefreshing(true);
    try {
      await loadReportsFromBackend();
      await loadDashboardStats();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const statsCards = [
    {
      name: 'Auto Mail Reports',
      value: dashboardStats.totalAutoMailReports.toString(),
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: `${dashboardStats.activeAutoMailReports} active`
    },
    {
      name: 'Instant Reports',
      value: dashboardStats.totalInstantReports.toString(),
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: `${dashboardStats.activeInstantReports} active`
    },
    {
      name: 'Master Uploads',
      value: dashboardStats.totalMasterUploads.toString(),
      icon: Upload,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: `${dashboardStats.activeMasterUploads} active`
    },
    {
      name: 'Total Users',
      value: dashboardStats.totalUsers.toString(),
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: `${dashboardStats.activeUsers} active`
    }
  ];

  const quickActions = [
    {
      title: 'Create Auto Mail Report',
      description: 'Set up automated email reports',
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      hoverColor: 'hover:bg-blue-100',
      path: '/auto-mail'
    },
    {
      title: 'Generate Instant Report',
      description: 'Create on-demand reports',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:bg-green-100',
      path: '/instant-reports'
    },
    {
      title: 'Upload Master Data',
      description: 'Bulk upload data to database',
      icon: Upload,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      hoverColor: 'hover:bg-purple-100',
      path: '/master-upload'
    }
  ];

  // Add admin-only quick action
  if (user?.role === 'admin') {
    quickActions.push({
      title: 'Manage Users',
      description: 'Add or modify user accounts',
      icon: Users,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      hoverColor: 'hover:bg-orange-100',
      path: '/users'
    });
  }

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Here's what's happening with your reports today.
          </p>
        </div>
        <button
          onClick={refreshDashboard}
          disabled={isRefreshing}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statsCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center">
              <div className={`${stat.bgColor} rounded-lg p-2 sm:p-3`}>
                <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.name}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-600">{stat.change}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action.path)}
                className={`w-full text-left p-3 sm:p-4 rounded-lg border ${action.borderColor} ${action.bgColor} ${action.hoverColor} transition-all duration-200 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <action.icon className={`h-6 w-6 ${action.color} flex-shrink-0`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{action.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;