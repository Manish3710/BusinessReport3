import { supabase } from './supabase';

export type ActivityType =
  | 'login'
  | 'logout'
  | 'register'
  | 'create_report'
  | 'update_report'
  | 'delete_report'
  | 'execute_report'
  | 'run_automail_report'
  | 'create_user'
  | 'update_user'
  | 'delete_user'
  | 'grant_access'
  | 'revoke_access'
  | 'upload_data'
  | 'view_dashboard'
  | 'view_database_admin';

export type ResourceType =
  | 'instant_report'
  | 'automail_report'
  | 'user'
  | 'access_control'
  | 'upload'
  | 'dashboard'
  | 'database';

interface ActivityLogData {
  userId: string;
  username: string;
  activityType: ActivityType;
  activityDescription: string;
  resourceType?: ResourceType;
  resourceId?: string;
}

class ActivityLogger {
  private getUserInfo(): { userId: string; username: string } | null {
    try {
      const storedUser = localStorage.getItem('user');
      const storedUserId = localStorage.getItem('userId');

      if (storedUser && storedUserId) {
        const user = JSON.parse(storedUser);
        return {
          userId: storedUserId,
          username: user.username
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting user info for activity log:', error);
      return null;
    }
  }

  async log(data: Omit<ActivityLogData, 'userId' | 'username'> | ActivityLogData) {
    try {
      let userId: string;
      let username: string;

      if ('userId' in data && 'username' in data) {
        userId = data.userId;
        username = data.username;
        console.log('[ActivityLogger] Using provided userId:', userId, 'username:', username);
      } else {
        const userInfo = this.getUserInfo();
        console.log('[ActivityLogger] Got userInfo from storage:', userInfo);
        if (!userInfo) {
          console.warn('[ActivityLogger] Cannot log activity: No user info available');
          console.log('[ActivityLogger] localStorage user:', localStorage.getItem('user'));
          console.log('[ActivityLogger] localStorage userId:', localStorage.getItem('userId'));
          return;
        }
        userId = userInfo.userId;
        username = userInfo.username;
      }

      const logEntry = {
        user_id: userId,
        username: username,
        activity_type: data.activityType,
        activity_description: data.activityDescription,
        resource_type: data.resourceType || null,
        resource_id: data.resourceId || null,
        ip_address: null,
        user_agent: navigator.userAgent
      };

      console.log('[ActivityLogger] Inserting log entry:', logEntry);

      const { data: insertedData, error } = await supabase
        .from('activity_logs')
        .insert(logEntry)
        .select();

      if (error) {
        console.error('[ActivityLogger] Failed to log activity:', error);
        console.error('[ActivityLogger] Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
      } else {
        console.log('[ActivityLogger] Successfully logged activity:', insertedData);
      }
    } catch (error) {
      console.error('[ActivityLogger] Error logging activity:', error);
    }
  }

  async logLogin(userId: string, username: string) {
    await this.log({
      userId,
      username,
      activityType: 'login',
      activityDescription: `User ${username} logged in`
    });
  }

  async logLogout() {
    const userInfo = this.getUserInfo();
    if (!userInfo) return;

    await this.log({
      activityType: 'logout',
      activityDescription: `User ${userInfo.username} logged out`
    });
  }

  async logReportCreation(reportType: 'instant' | 'automail', reportName: string, reportId?: string) {
    await this.log({
      activityType: 'create_report',
      activityDescription: `Created ${reportType} report: ${reportName}`,
      resourceType: reportType === 'instant' ? 'instant_report' : 'automail_report',
      resourceId: reportId
    });
  }

  async logReportExecution(reportType: 'instant' | 'automail', reportName: string, reportId?: string) {
    await this.log({
      activityType: reportType === 'instant' ? 'execute_report' : 'run_automail_report',
      activityDescription: `Executed ${reportType} report: ${reportName}`,
      resourceType: reportType === 'instant' ? 'instant_report' : 'automail_report',
      resourceId: reportId
    });
  }

  async logReportUpdate(reportType: 'instant' | 'automail', reportName: string, reportId?: string) {
    await this.log({
      activityType: 'update_report',
      activityDescription: `Updated ${reportType} report: ${reportName}`,
      resourceType: reportType === 'instant' ? 'instant_report' : 'automail_report',
      resourceId: reportId
    });
  }

  async logReportDeletion(reportType: 'instant' | 'automail', reportName: string, reportId?: string) {
    await this.log({
      activityType: 'delete_report',
      activityDescription: `Deleted ${reportType} report: ${reportName}`,
      resourceType: reportType === 'instant' ? 'instant_report' : 'automail_report',
      resourceId: reportId
    });
  }

  async logUserCreation(username: string, userId?: string) {
    await this.log({
      activityType: 'create_user',
      activityDescription: `Created new user: ${username}`,
      resourceType: 'user',
      resourceId: userId
    });
  }

  async logUserUpdate(username: string, userId?: string) {
    await this.log({
      activityType: 'update_user',
      activityDescription: `Updated user: ${username}`,
      resourceType: 'user',
      resourceId: userId
    });
  }

  async logUserDeletion(username: string, userId?: string) {
    await this.log({
      activityType: 'delete_user',
      activityDescription: `Deleted user: ${username}`,
      resourceType: 'user',
      resourceId: userId
    });
  }

  async logAccessGrant(username: string, resourceType: string, resourceName: string) {
    await this.log({
      activityType: 'grant_access',
      activityDescription: `Granted access to ${username} for ${resourceType}: ${resourceName}`,
      resourceType: 'access_control'
    });
  }

  async logAccessRevoke(username: string, resourceType: string, resourceName: string) {
    await this.log({
      activityType: 'revoke_access',
      activityDescription: `Revoked access from ${username} for ${resourceType}: ${resourceName}`,
      resourceType: 'access_control'
    });
  }

  async logDataUpload(tableName: string, rowCount: number) {
    await this.log({
      activityType: 'upload_data',
      activityDescription: `Uploaded ${rowCount} rows to table: ${tableName}`,
      resourceType: 'upload',
      resourceId: tableName
    });
  }

  async logDashboardView() {
    await this.log({
      activityType: 'view_dashboard',
      activityDescription: 'Viewed dashboard',
      resourceType: 'dashboard'
    });
  }

  async logDatabaseAdminView() {
    await this.log({
      activityType: 'view_database_admin',
      activityDescription: 'Accessed database administration',
      resourceType: 'database'
    });
  }

  async getRecentActivities(limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching activity logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }
  }
}

export const activityLogger = new ActivityLogger();
export default activityLogger;
