// API service for real database integration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Authentication
  async login(username: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  async register(userData: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async verifyToken() {
    return this.request('/auth/verify');
  }

  // Auto Mail Reports
  async getAutoMailReports() {
    return this.request('/reports/auto-mail');
  }

  async createAutoMailReport(reportData: any) {
    return this.request('/reports/auto-mail', {
      method: 'POST',
      body: JSON.stringify(reportData)
    });
  }

  async runAutoMailReport(reportId: string) {
    return this.request(`/reports/auto-mail/${reportId}/run`, {
      method: 'POST'
    });
  }

  // Instant Reports
  async getInstantReports() {
    return this.request('/reports/instant');
  }

  async createInstantReport(reportData: any) {
    return this.request('/reports/instant', {
      method: 'POST',
      body: JSON.stringify(reportData)
    });
  }

  async executeInstantReport(reportId: string, dateRange: any) {
    return this.request(`/reports/instant/${reportId}/execute`, {
      method: 'POST',
      body: JSON.stringify(dateRange)
    });
  }

  // Get real data from database tables
  async getTableData(tableName: string, limit: number = 100) {
    return this.request(`/admin/table-data/${tableName}?limit=${limit}`);
  }

  // Execute custom query
  async executeQuery(query: string, parameters: any = {}) {
    return this.request('/admin/execute-query', {
      method: 'POST',
      body: JSON.stringify({ query, parameters })
    });
  }
  // Query Executions
  async getQueryExecutions() {
    return this.request('/reports/executions');
  }

  // Dashboard Stats
  async getDashboardStats() {
    return this.request('/admin/dashboard-stats');
  }

  // Database Admin
  async getDatabaseStats() {
    return this.request('/admin/database-stats');
  }

  async getSystemHealth() {
    return this.request('/admin/system-health');
  }

  async getRecentActivity() {
    return this.request('/admin/recent-activity');
  }

  async performBackup() {
    return this.request('/admin/backup', { method: 'POST' });
  }

  async cleanupLogs() {
    return this.request('/admin/cleanup-logs', { method: 'POST' });
  }

  // User Management
  async getUsers() {
    return this.request('/admin/users');
  }

  async createUser(userData: any) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(userId: string, userData: any) {
    return this.request(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(userId: string) {
    return this.request(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  }

  // Access Control
  async getUserAccess() {
    return this.request('/admin/access');
  }

  async grantAccess(accessData: any) {
    return this.request('/admin/access', {
      method: 'POST',
      body: JSON.stringify(accessData)
    });
  }

  async revokeAccess(accessId: string) {
    return this.request(`/admin/access/${accessId}`, {
      method: 'DELETE'
    });
  }
}

export const apiService = new ApiService();
export default apiService;