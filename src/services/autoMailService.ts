import { supabase } from './supabase';
import * as XLSX from 'xlsx';

export interface AutoMailReport {
  id: string;
  report_id: string;
  user_id: string;
  report_name: string;
  description?: string;
  query_text: string;
  mail_from: string;
  mail_to: string[];
  mail_subject: string;
  mail_body: string;
  schedule_frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  schedule_day?: string;
  schedule_time: string;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RunReportResult {
  success: boolean;
  message: string;
  rowsAffected?: number;
  emailSent?: boolean;
  error?: string;
}

export const autoMailService = {
  async getAllReports(): Promise<AutoMailReport[]> {
    const { data, error } = await supabase
      .from('auto_mail_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching auto mail reports:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  async getReportById(id: string): Promise<AutoMailReport | null> {
    const { data, error } = await supabase
      .from('auto_mail_reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching report:', error);
      throw new Error(error.message);
    }

    return data;
  },

  async createReport(report: Omit<AutoMailReport, 'id' | 'created_at' | 'updated_at'>): Promise<AutoMailReport> {
    const reportId = `AM${Date.now()}`;
    const nextRunAt = this.calculateNextRun(report.schedule_frequency, report.schedule_time, report.schedule_day);

    const { data, error } = await supabase
      .from('auto_mail_reports')
      .insert({
        report_id: reportId,
        user_id: report.user_id,
        report_name: report.report_name,
        description: report.description,
        query_text: report.query_text,
        mail_from: report.mail_from,
        mail_to: report.mail_to,
        mail_subject: report.mail_subject,
        mail_body: report.mail_body,
        schedule_frequency: report.schedule_frequency,
        schedule_day: report.schedule_day,
        schedule_time: report.schedule_time || '09:00',
        is_active: report.is_active,
        next_run_at: nextRunAt
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating report:', error);
      throw new Error(error.message);
    }

    return data;
  },

  async updateReport(id: string, updates: Partial<AutoMailReport>): Promise<AutoMailReport> {
    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.schedule_frequency || updates.schedule_time || updates.schedule_day) {
      const report = await this.getReportById(id);
      if (report) {
        updateData.next_run_at = this.calculateNextRun(
          updates.schedule_frequency || report.schedule_frequency,
          updates.schedule_time || report.schedule_time,
          updates.schedule_day || report.schedule_day
        );
      }
    }

    const { data, error } = await supabase
      .from('auto_mail_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating report:', error);
      throw new Error(error.message);
    }

    return data;
  },

  async deleteReport(id: string): Promise<void> {
    const { error } = await supabase
      .from('auto_mail_reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting report:', error);
      throw new Error(error.message);
    }
  },

  async toggleReportStatus(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('auto_mail_reports')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error toggling report status:', error);
      throw new Error(error.message);
    }
  },

  async runReportNow(reportId: string): Promise<RunReportResult> {
    try {
      const report = await this.getReportById(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      console.log('Running report:', report.report_name);
      console.log('Query:', report.query_text);

      const { data: queryResult, error: queryError } = await supabase.rpc('execute_sql', {
        query: report.query_text
      });

      if (queryError) {
        throw new Error(`Query execution failed: ${queryError.message}`);
      }

      if (!queryResult || queryResult.length === 0) {
        throw new Error('Query returned no results');
      }

      console.log('Query executed successfully. Rows:', queryResult.length);

      const extractedData = queryResult.map((row: any) => row.result);
      const headers = Object.keys(extractedData[0]);
      const filename = `${report.report_name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

      try {
        console.log('Sending email with attachment...');
        const emailSent = await this.sendEmailWithAttachment({
          to: report.mail_to,
          from: report.mail_from,
          subject: report.mail_subject,
          htmlBody: report.mail_body,
          excelData: {
            filename: filename,
            data: extractedData,
            headers: headers
          }
        });

        await supabase
          .from('auto_mail_reports')
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: this.calculateNextRun(report.schedule_frequency, report.schedule_time, report.schedule_day)
          })
          .eq('id', reportId);

        return {
          success: true,
          message: `Report executed successfully. Email sent to ${report.mail_to.length} recipient(s) with ${queryResult.length} rows.`,
          rowsAffected: queryResult.length,
          emailSent: emailSent
        };
      } catch (emailError: any) {
        console.error('Email sending failed:', emailError);

        return {
          success: false,
          message: `Report executed but email failed: ${emailError.message}`,
          rowsAffected: queryResult.length,
          emailSent: false,
          error: emailError.message
        };
      }
    } catch (error: any) {
      console.error('Error running report:', error);
      return {
        success: false,
        message: error.message || 'Failed to run report',
        error: error.message
      };
    }
  },

  generateExcelFile(data: any[], reportName: string): Blob {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  },

  async sendEmailWithAttachment(emailData: {
    to: string[];
    from: string;
    subject: string;
    htmlBody: string;
    excelData: {
      filename: string;
      data: any[];
      headers: string[];
    };
  }): Promise<boolean> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-report-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      return true;
    } catch (error: any) {
      console.error('Email API call failed:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  },

  calculateNextRun(frequency: string, time: string, day?: string): string {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;

    const [hours, minutes] = time.split(':').map(Number);

    const nowUTC = now.getTime();
    const nowIST = new Date(nowUTC + istOffset);

    const year = nowIST.getUTCFullYear();
    const month = nowIST.getUTCMonth();
    const date = nowIST.getUTCDate();

    let nextRunIST = new Date(Date.UTC(year, month, date, hours, minutes, 0, 0));

    switch (frequency) {
      case 'daily':
        if (nextRunIST.getTime() <= nowIST.getTime()) {
          nextRunIST = new Date(nextRunIST.getTime() + 24 * 60 * 60 * 1000);
        }
        break;

      case 'weekly':
        const targetDay = day === 'monday' ? 1 : 0;
        while (nextRunIST.getUTCDay() !== targetDay || nextRunIST.getTime() <= nowIST.getTime()) {
          nextRunIST = new Date(nextRunIST.getTime() + 24 * 60 * 60 * 1000);
        }
        break;

      case 'monthly':
        nextRunIST.setUTCDate(1);
        if (nextRunIST.getTime() <= nowIST.getTime()) {
          nextRunIST.setUTCMonth(nextRunIST.getUTCMonth() + 1);
        }
        break;

      case 'quarterly':
        nextRunIST.setUTCDate(1);
        const currentMonth = nextRunIST.getUTCMonth();
        const nextQuarterMonth = Math.floor(currentMonth / 3) * 3 + 3;
        nextRunIST.setUTCMonth(nextQuarterMonth);
        if (nextRunIST.getTime() <= nowIST.getTime()) {
          nextRunIST.setUTCMonth(nextRunIST.getUTCMonth() + 3);
        }
        break;
    }

    const nextRunUTC = new Date(nextRunIST.getTime() - istOffset);
    return nextRunUTC.toISOString();
  }
};
