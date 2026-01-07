export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  password?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AutoMailReport {
  id: string;
  name: string;
  mailFrom: string;
  mailTo: string[];
  mailSubject: string;
  mailBody: string;
  query: string;
  isActive: boolean;
  schedule?: string;
  scheduleTime?: string;
  lastRun?: string;
  createdBy: string;
  createdAt: string;
}

export interface InstantReport {
  id: string;
  name: string;
  query: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface MasterUpload {
  id: string;
  name: string;
  tableName: string;
  sampleFileUrl: string;
  columnMapping: Record<string, string>;
  validationRules: ValidationRule[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ValidationRule {
  column: string;
  type: 'required' | 'dataType' | 'unique' | 'custom';
  value?: string;
  message: string;
}

export interface UserAccess {
  userId: string;
  autoMailReports: string[];
  instantReports: string[];
  masterUploads: string[];
}

export interface QueryExecution {
  id: string;
  reportId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  error?: string;
  downloadUrl?: string;
  excelUrl?: string;
}