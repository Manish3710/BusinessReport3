import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Activity,
  Users,
  FileText,
  Mail,
  Upload,
  XCircle,
  RefreshCw,
  LogIn
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface ActivityLog {
  id: string;
  user_id: string;
  username: string;
  activity_type: string;
  activity_description: string;
  resource_type: string | null;
  resource_id: string | null;
  created_at: string;
}

type ActivityFilter = 'all' | 'instant_report' | 'automail_report' | 'upload' | 'login';

const DatabaseAdmin: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityLog[]>([]);
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadActivities();

    // Auto-refresh every 10 seconds for real-time updates
    const interval = setInterval(loadActivities, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterActivities();
  }, [activities, activeFilter]);

  const loadActivities = async () => {
    setIsRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching activities:', error);
        return;
      }

      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filterActivities = () => {
    if (activeFilter === 'all') {
      setFilteredActivities(activities);
      return;
    }

    const filtered = activities.filter(activity => {
      switch (activeFilter) {
        case 'instant_report':
          return activity.resource_type === 'instant_report' ||
                 activity.activity_type === 'execute_report';
        case 'automail_report':
          return activity.resource_type === 'automail_report' ||
                 activity.activity_type === 'run_automail_report';
        case 'upload':
          return activity.resource_type === 'upload' ||
                 activity.activity_type === 'upload_data';
        case 'login':
          return activity.activity_type === 'login' ||
                 activity.activity_type === 'logout';
        default:
          return true;
      }
    });

    setFilteredActivities(filtered);
  };

  const getActivityIcon = (activity: ActivityLog) => {
    if (activity.resource_type === 'instant_report' || activity.activity_type === 'execute_report') {
      return <FileText className="h-4 w-4 text-blue-600" />;
    }
    if (activity.resource_type === 'automail_report' || activity.activity_type === 'run_automail_report') {
      return <Mail className="h-4 w-4 text-purple-600" />;
    }
    if (activity.resource_type === 'upload' || activity.activity_type === 'upload_data') {
      return <Upload className="h-4 w-4 text-green-600" />;
    }
    if (activity.activity_type === 'login' || activity.activity_type === 'logout') {
      return <LogIn className="h-4 w-4 text-orange-600" />;
    }
    if (activity.resource_type === 'user' || activity.activity_type.includes('user')) {
      return <Users className="h-4 w-4 text-indigo-600" />;
    }
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getActivityColor = (activity: ActivityLog) => {
    if (activity.activity_description.toLowerCase().includes('failed') ||
        activity.activity_description.toLowerCase().includes('error')) {
      return 'bg-red-50 border-red-200';
    }
    if (activity.activity_description.toLowerCase().includes('warning')) {
      return 'bg-yellow-50 border-yellow-200';
    }
    return 'bg-white border-gray-200';
  };

  const getFilterIcon = (filter: ActivityFilter) => {
    switch (filter) {
      case 'instant_report':
        return <FileText className="h-4 w-4" />;
      case 'automail_report':
        return <Mail className="h-4 w-4" />;
      case 'upload':
        return <Upload className="h-4 w-4" />;
      case 'login':
        return <LogIn className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getFilterLabel = (filter: ActivityFilter) => {
    switch (filter) {
      case 'instant_report':
        return 'Instant Reports';
      case 'automail_report':
        return 'Auto Mail Reports';
      case 'upload':
        return 'Master Upload';
      case 'login':
        return 'Login/Logout';
      default:
        return 'All Activities';
    }
  };

  const getFilterCount = (filter: ActivityFilter) => {
    if (filter === 'all') return activities.length;

    return activities.filter(activity => {
      switch (filter) {
        case 'instant_report':
          return activity.resource_type === 'instant_report' ||
                 activity.activity_type === 'execute_report';
        case 'automail_report':
          return activity.resource_type === 'automail_report' ||
                 activity.activity_type === 'run_automail_report';
        case 'upload':
          return activity.resource_type === 'upload' ||
                 activity.activity_type === 'upload_data';
        case 'login':
          return activity.activity_type === 'login' ||
                 activity.activity_type === 'logout';
        default:
          return true;
      }
    }).length;
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
              <p className="mt-2 text-sm text-red-700">
                You don't have permission to access activity logs.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filters: ActivityFilter[] = ['all', 'instant_report', 'automail_report', 'upload', 'login'];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Recent Activity</h1>
          <p className="text-sm sm:text-base text-gray-600">Live tracking of all system activities (auto-refresh every 10 seconds)</p>
        </div>
        <button
          onClick={loadActivities}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 whitespace-nowrap"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">Live Activity Monitor</span>
            </div>
            <span className="text-xs text-gray-500">{filteredActivities.length} activities</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeFilter === filter
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {getFilterIcon(filter)}
                <span className="truncate">{getFilterLabel(filter)}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeFilter === filter
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {getFilterCount(filter)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6 max-h-[600px] overflow-y-auto">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No activities found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${getActivityColor(activity)}`}
                >
                  <div className="flex-shrink-0 p-2 bg-white rounded-lg shadow-sm">
                    {getActivityIcon(activity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.activity_description}</p>
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {activity.username} <span className="text-gray-400 ml-1">(ID: {activity.user_id})</span>
                          </span>
                          <span>•</span>
                          <span>{new Date(activity.created_at).toLocaleString()}</span>
                          {activity.resource_type && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{activity.resource_type.replace('_', ' ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseAdmin;