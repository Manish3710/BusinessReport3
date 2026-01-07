const express = require('express');
const { executeQuery, executeProcedure, oracledb } = require('../config/database');
const { verifyToken, requireAdmin, checkResourceAccess } = require('../middleware/auth');
const { sendEmail, generateEmailTemplate } = require('../config/email');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get auto mail reports
router.get('/auto-mail', async (req, res) => {
    try {
        let query = `
            SELECT amr.*, 
                   CASE WHEN uar.USER_ID IS NOT NULL THEN 1 ELSE 0 END as HAS_ACCESS
            FROM AUTO_MAIL_REPORTS amr
            LEFT JOIN USER_ACCESS_RIGHTS uar ON amr.REPORT_ID = uar.RESOURCE_ID 
                AND uar.RESOURCE_TYPE = 'auto_mail' AND uar.USER_ID = :userId
            WHERE amr.IS_ACTIVE = 1
        `;
        
        const params = { userId: req.user.USER_ID };
        
        if (req.user.ROLE !== 'admin') {
            query += ' AND uar.USER_ID IS NOT NULL';
        }
        
        query += ' ORDER BY amr.CREATED_AT DESC';
        
        const result = await executeQuery(query, params);
        res.json({ success: true, reports: result.rows });
    } catch (error) {
        console.error('Error fetching auto mail reports:', error);
        res.status(500).json({ error: 'Error fetching reports' });
    }
});

// Create auto mail report (admin only)
router.post('/auto-mail', requireAdmin, async (req, res) => {
    try {
        const { name, mailFrom, mailTo, mailSubject, mailBody, query, schedule, scheduleTime } = req.body;
        
        // Generate report ID
        const reportIdResult = await executeQuery('SELECT FN_GENERATE_ID(:prefix) as REPORT_ID FROM DUAL', { prefix: 'RPT' });
        const reportId = reportIdResult.rows[0].REPORT_ID;
        
        // Create report using stored procedure
        const result = await executeProcedure(
            'BEGIN SP_CREATE_AUTO_MAIL_REPORT(:reportId, :name, :mailFrom, :mailTo, :mailSubject, :mailBody, :query, :schedule, :scheduleTime, :createdBy, :result); END;',
            {
                reportId,
                name,
                mailFrom,
                mailTo: JSON.stringify(mailTo),
                mailSubject,
                mailBody,
                query,
                schedule,
                scheduleTime,
                createdBy: req.user.USER_ID,
                result: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 }
            }
        );
        
        if (result.outBinds.result === 'SUCCESS') {
            res.json({ success: true, reportId, message: 'Auto mail report created successfully' });
        } else {
            res.status(400).json({ error: result.outBinds.result });
        }
    } catch (error) {
        console.error('Error creating auto mail report:', error);
        res.status(500).json({ error: 'Error creating report' });
    }
});

// Run auto mail report now
router.post('/auto-mail/:id/run', checkResourceAccess('auto_mail'), async (req, res) => {
    try {
        const reportId = req.params.id;
        
        // Get report details
        const reportResult = await executeQuery(
            'SELECT * FROM AUTO_MAIL_REPORTS WHERE REPORT_ID = :reportId',
            { reportId }
        );
        
        if (reportResult.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        const report = reportResult.rows[0];
        
        console.log('🔄 Starting auto mail report execution:', report.REPORT_NAME);
        console.log('📧 Recipients:', report.MAIL_TO);
        
        // Execute query
        let queryResult;
        try {
            console.log('🔍 Executing query:', report.QUERY_TEXT);
            queryResult = await executeQuery(report.QUERY_TEXT);
            console.log('✅ Query executed successfully, rows:', queryResult.rows.length);
        } catch (queryError) {
            console.error('❌ Query execution failed:', queryError.message);
            return res.status(500).json({ error: 'Query execution failed: ' + queryError.message });
        }
        
        // Generate Excel file
        console.log('📊 Generating Excel file...');
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(queryResult.rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');
        
        const fileName = `${report.REPORT_NAME}_${new Date().toISOString().split('T')[0]}.xlsx`;
        const filePath = path.join(__dirname, '../temp', fileName);
        
        // Ensure temp directory exists
        const tempDir = path.dirname(filePath);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
            console.log('📁 Created temp directory:', tempDir);
        }
        
        XLSX.writeFile(workbook, filePath);
        console.log('💾 Excel file created:', filePath);
        
        // Send emails
        let recipients;
        try {
            recipients = JSON.parse(report.MAIL_TO);
            console.log('📧 Parsed recipients:', recipients);
        } catch (parseError) {
            console.error('❌ Failed to parse recipients:', parseError.message);
            return res.status(500).json({ error: 'Invalid recipient email format' });
        }
        
        const emailTemplate = generateEmailTemplate('report', {
            reportName: report.REPORT_NAME,
            body: report.MAIL_BODY,
            date: new Date().toLocaleDateString()
        });
        
        console.log('📧 Email template generated');
        console.log('📧 Subject:', emailTemplate.subject);
        
        const emailPromises = recipients.map(async (recipient) => {
            console.log('📧 Preparing email for:', recipient);
            
            let logId;
            try {
                const logResult = await executeQuery('SELECT FN_GENERATE_ID(:prefix) as LOG_ID FROM DUAL', { prefix: 'LOG' });
                logId = logResult.rows[0].LOG_ID;
            } catch (error) {
                logId = 'LOG' + Date.now();
                console.log('⚠️  Using fallback log ID:', logId);
            }
            
            try {
                console.log('📧 Sending email to:', recipient);
                const emailResult = await sendEmail({
                    to: recipient,
                    subject: emailTemplate.subject,
                    html: emailTemplate.html,
                    attachments: [{
                        filename: fileName,
                        path: filePath
                    }]
                });
                
                console.log('📧 Email result for', recipient, ':', emailResult.success ? 'SUCCESS' : 'FAILED');
                
                // Log email status
                try {
                    await executeProcedure(
                        'BEGIN SP_LOG_EMAIL(:logId, :reportId, :reportType, :recipient, :subject, :status, :error); END;',
                        {
                            logId,
                            reportId,
                            reportType: 'auto_mail',
                            recipient,
                            subject: emailTemplate.subject,
                            status: emailResult.success ? 'sent' : 'failed',
                            error: emailResult.error || null
                        }
                    );
                } catch (logError) {
                    console.log('⚠️  Email log failed:', logError.message);
                }
                
                return { recipient, success: emailResult.success, error: emailResult.error };
            } catch (error) {
                console.error(`📧 Email error for ${recipient}:`, error.message);
                
                try {
                    await executeProcedure(
                        'BEGIN SP_LOG_EMAIL(:logId, :reportId, :reportType, :recipient, :subject, :status, :error); END;',
                        {
                            logId,
                            reportId,
                            reportType: 'auto_mail',
                            recipient,
                            subject: emailTemplate.subject,
                            status: 'failed',
                            error: error.message
                        }
                    );
                } catch (logError) {
                    console.log('⚠️  Email log failed:', logError.message);
                }
                
                return { recipient, success: false, error: error.message };
            }
        });
        
        console.log('📧 Sending emails to', recipients.length, 'recipients...');
        const emailResults = await Promise.all(emailPromises);
        
        const successCount = emailResults.filter(r => r.success).length;
        const failureCount = emailResults.filter(r => !r.success).length;
        
        console.log('📧 Email sending completed:');
        console.log('   ✅ Success:', successCount);
        console.log('   ❌ Failed:', failureCount);
        
        // Update last run time
        try {
            await executeQuery(
                'UPDATE AUTO_MAIL_REPORTS SET LAST_RUN = CURRENT_TIMESTAMP WHERE REPORT_ID = :reportId',
                { reportId }
            );
            console.log('✅ Updated last run time for report');
        } catch (updateError) {
            console.log('⚠️  Failed to update last run time:', updateError.message);
        }
        
        // Clean up temp file
        setTimeout(() => {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log('🗑️  Cleaned up temp file:', fileName);
            }
        }, 60000); // Delete after 1 minute
        
        res.json({
            success: true,
            message: 'Report executed and emails sent',
            emailResults,
            summary: {
                totalRecipients: recipients.length,
                successCount,
                failureCount,
                reportName: report.REPORT_NAME,
                executionTime: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error running auto mail report:', error);
        res.status(500).json({ error: 'Error running report' });
    }
});

// Get instant reports
router.get('/instant', async (req, res) => {
    try {
        let query = `
            SELECT ir.*, 
                   CASE WHEN uar.USER_ID IS NOT NULL THEN 1 ELSE 0 END as HAS_ACCESS
            FROM INSTANT_REPORTS ir
            LEFT JOIN USER_ACCESS_RIGHTS uar ON ir.REPORT_ID = uar.RESOURCE_ID 
                AND uar.RESOURCE_TYPE = 'instant_report' AND uar.USER_ID = :userId
            WHERE ir.IS_ACTIVE = 1
        `;
        
        const params = { userId: req.user.USER_ID };
        
        if (req.user.ROLE !== 'admin') {
            query += ' AND uar.USER_ID IS NOT NULL';
        }
        
        query += ' ORDER BY ir.CREATED_AT DESC';
        
        const result = await executeQuery(query, params);
        res.json({ success: true, reports: result.rows });
    } catch (error) {
        console.error('Error fetching instant reports:', error);
        res.status(500).json({ error: 'Error fetching reports' });
    }
});

// Create instant report (admin only)
router.post('/instant', requireAdmin, async (req, res) => {
    try {
        const { name, query } = req.body;
        
        // Generate report ID
        const reportIdResult = await executeQuery('SELECT FN_GENERATE_ID(:prefix) as REPORT_ID FROM DUAL', { prefix: 'RPT' });
        const reportId = reportIdResult.rows[0].REPORT_ID;
        
        // Create report
        await executeQuery(
            'INSERT INTO INSTANT_REPORTS (REPORT_ID, REPORT_NAME, QUERY_TEXT, CREATED_BY) VALUES (:reportId, :name, :query, :createdBy)',
            { reportId, name, query, createdBy: req.user.USER_ID }
        );
        
        res.json({ success: true, reportId, message: 'Instant report created successfully' });
    } catch (error) {
        console.error('Error creating instant report:', error);
        res.status(500).json({ error: 'Error creating report' });
    }
});

// Execute instant report
router.post('/instant/:id/execute', checkResourceAccess('instant_report'), async (req, res) => {
    try {
        const reportId = req.params.id;
        const { startDate, endDate } = req.body;
        
        // Generate execution ID
        const executionIdResult = await executeQuery('SELECT FN_GENERATE_ID(:prefix) as EXECUTION_ID FROM DUAL', { prefix: 'EXE' });
        const executionId = executionIdResult.rows[0].EXECUTION_ID;
        
        // Get the query from instant reports
        const reportResult = await executeQuery(
            'SELECT QUERY_TEXT FROM INSTANT_REPORTS WHERE REPORT_ID = :reportId',
            { reportId }
        );
        
        if (reportResult.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }
        
        let query = reportResult.rows[0].QUERY_TEXT;
        let parameters = {};
        
        // Handle date parameters - if not provided, remove date filters
        if (startDate && endDate) {
            // Replace date parameters with actual values
            query = query.replace(/:start_date/g, `DATE '${startDate}'`);
            query = query.replace(/:end_date/g, `DATE '${endDate}'`);
            parameters = { startDate, endDate };
        } else {
            // Remove date filter conditions if no dates provided
            // This is a simple approach - you might need more sophisticated parsing
            query = query.replace(/WHERE.*BETWEEN\s+:start_date\s+AND\s+:end_date/gi, '');
            query = query.replace(/AND.*BETWEEN\s+:start_date\s+AND\s+:end_date/gi, '');
            query = query.replace(/:start_date/g, 'SYSDATE-365');
            query = query.replace(/:end_date/g, 'SYSDATE');
        }
        
        // Insert execution record
        await executeQuery(
            'INSERT INTO QUERY_EXECUTIONS (EXECUTION_ID, REPORT_ID, USER_ID, STATUS, PARAMETERS) VALUES (:executionId, :reportId, :userId, :status, :parameters)',
            {
                executionId,
                reportId,
                userId: req.user.USER_ID,
                status: 'running',
                parameters: JSON.stringify(parameters)
            }
        );
        
        // Execute the query
        const result = await executeQuery(query);
        
        // Update execution status
        await executeQuery(
            'UPDATE QUERY_EXECUTIONS SET STATUS = :status, END_TIME = CURRENT_TIMESTAMP WHERE EXECUTION_ID = :executionId',
            { status: 'completed', executionId }
        );
        
        res.json({
            success: true,
            executionId,
            data: result.rows,
            rowCount: result.rows.length
        });
        
    } catch (error) {
        console.error('Error executing instant report:', error);
        
        // Update execution status with error if execution ID exists
        try {
            await executeQuery(
                'UPDATE QUERY_EXECUTIONS SET STATUS = :status, END_TIME = CURRENT_TIMESTAMP, ERROR_MESSAGE = :error WHERE EXECUTION_ID = :executionId',
                { status: 'failed', error: error.message, executionId: req.params.executionId }
            );
        } catch (updateError) {
            console.error('Error updating execution status:', updateError);
        }
        
        res.status(500).json({ error: 'Error executing report' });
    }
});

// Download report file
router.get('/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../downloads', filename);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).json({ error: 'Error downloading file' });
            }
        });
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Error downloading file' });
    }
});

// Get query executions
router.get('/executions', async (req, res) => {
    try {
        let query = `
            SELECT qe.*, ir.REPORT_NAME
            FROM QUERY_EXECUTIONS qe
            JOIN INSTANT_REPORTS ir ON qe.REPORT_ID = ir.REPORT_ID
            WHERE qe.USER_ID = :userId
            ORDER BY qe.START_TIME DESC
        `;
        
        const params = { userId: req.user.USER_ID };
        
        if (req.user.ROLE === 'admin') {
            query = `
                SELECT qe.*, ir.REPORT_NAME, u.USERNAME
                FROM QUERY_EXECUTIONS qe
                JOIN INSTANT_REPORTS ir ON qe.REPORT_ID = ir.REPORT_ID
                JOIN USERS u ON qe.USER_ID = u.USER_ID
                ORDER BY qe.START_TIME DESC
            `;
            params = {};
        }
        
        const result = await executeQuery(query, params);
        res.json({ success: true, executions: result.rows });
    } catch (error) {
        console.error('Error fetching executions:', error);
        res.status(500).json({ error: 'Error fetching executions' });
    }
});

module.exports = router;