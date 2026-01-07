const express = require('express');
const { executeQuery, executeProcedure } = require('../config/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);
router.use(requireAdmin);

// Get real data from database table
router.get('/table-data/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    // Validate table name to prevent SQL injection
    const allowedTables = ['PRODUCTS', 'CUSTOMERS', 'SALES', 'INVENTORY', 'USERS'];
    const upperTableName = tableName.toUpperCase();
    
    if (!allowedTables.includes(upperTableName)) {
      return res.status(400).json({ error: 'Table not allowed' });
    }
    
    const query = `SELECT * FROM ${upperTableName} WHERE ROWNUM <= :limit ORDER BY CREATED_AT DESC`;
    const result = await executeQuery(query, { limit });
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching table data:', error);
    res.status(500).json({ error: 'Error fetching table data' });
  }
});

// Execute custom query
router.post('/execute-query', async (req, res) => {
  try {
    const { query, parameters = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    
    // Basic SQL injection protection - only allow SELECT statements
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      return res.status(400).json({ error: 'Only SELECT queries are allowed' });
    }
    
    const result = await executeQuery(query, parameters);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: 'Error executing query: ' + error.message });
  }
});

// Get dashboard statistics
router.get('/dashboard-stats', async (req, res) => {
  try {
    // Get real statistics from database
    const userStats = await executeQuery('SELECT COUNT(*) as TOTAL_USERS, SUM(CASE WHEN IS_ACTIVE = 1 THEN 1 ELSE 0 END) as ACTIVE_USERS FROM USERS');
    const reportStats = await executeQuery('SELECT COUNT(*) as TOTAL_REPORTS FROM AUTO_MAIL_REPORTS WHERE IS_ACTIVE = 1');
    const instantStats = await executeQuery('SELECT COUNT(*) as TOTAL_INSTANT FROM INSTANT_REPORTS WHERE IS_ACTIVE = 1');
    const executionStats = await executeQuery('SELECT COUNT(*) as TOTAL_EXECUTIONS FROM QUERY_EXECUTIONS WHERE START_TIME >= TRUNC(SYSDATE, \'MM\')');
    const emailStats = await executeQuery('SELECT COUNT(*) as EMAILS_SENT FROM EMAIL_LOGS WHERE STATUS = \'sent\' AND CREATED_AT >= TRUNC(SYSDATE, \'MM\')');

    res.json({
      success: true,
      stats: {
        totalUsers: userStats.rows[0].TOTAL_USERS,
        activeUsers: userStats.rows[0].ACTIVE_USERS,
        totalAutoMailReports: reportStats.rows[0].TOTAL_REPORTS,
        totalInstantReports: instantStats.rows[0].TOTAL_INSTANT,
        totalExecutions: executionStats.rows[0].TOTAL_EXECUTIONS,
        emailsSent: emailStats.rows[0].EMAILS_SENT
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Error fetching dashboard statistics' });
  }
});

// Get database statistics
router.get('/database-stats', async (req, res) => {
  try {
    // Get database size and other metrics
    const sizeQuery = `
      SELECT 
        ROUND(SUM(bytes)/1024/1024, 2) as SIZE_MB
      FROM user_segments
    `;
    
    const sizeResult = await executeQuery(sizeQuery);
    
    // Get table counts
    const tableStats = await executeQuery(`
      SELECT 
        'USERS' as TABLE_NAME, COUNT(*) as ROW_COUNT FROM USERS
      UNION ALL
      SELECT 
        'AUTO_MAIL_REPORTS' as TABLE_NAME, COUNT(*) as ROW_COUNT FROM AUTO_MAIL_REPORTS
      UNION ALL
      SELECT 
        'INSTANT_REPORTS' as TABLE_NAME, COUNT(*) as ROW_COUNT FROM INSTANT_REPORTS
      UNION ALL
      SELECT 
        'QUERY_EXECUTIONS' as TABLE_NAME, COUNT(*) as ROW_COUNT FROM QUERY_EXECUTIONS
    `);

    res.json({
      success: true,
      stats: {
        databaseSize: `${sizeResult.rows[0]?.SIZE_MB || 0} MB`,
        tableStats: tableStats.rows,
        lastBackup: new Date().toISOString() // This would come from actual backup logs
      }
    });
  } catch (error) {
    console.error('Error fetching database stats:', error);
    res.status(500).json({ error: 'Error fetching database statistics' });
  }
});

// Get system health
router.get('/system-health', async (req, res) => {
  try {
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    const emailHealth = await checkEmailHealth();
    const storageHealth = await checkStorageHealth();
    const performanceHealth = await checkPerformanceHealth();

    res.json({
      success: true,
      health: {
        database: dbHealth,
        emailService: emailHealth,
        storage: storageHealth,
        performance: performanceHealth
      }
    });
  } catch (error) {
    console.error('Error checking system health:', error);
    res.status(500).json({ error: 'Error checking system health' });
  }
});

// Get recent activity
router.get('/recent-activity', async (req, res) => {
  try {
    const activities = await executeQuery(`
      SELECT 
        'login' as ACTIVITY_TYPE,
        u.USERNAME as USER_NAME,
        'User logged in' as DESCRIPTION,
        u.LAST_LOGIN as ACTIVITY_TIME,
        'success' as STATUS
      FROM USERS u 
      WHERE u.LAST_LOGIN IS NOT NULL
      AND u.LAST_LOGIN >= SYSDATE - 1
      
      UNION ALL
      
      SELECT 
        'report_execution' as ACTIVITY_TYPE,
        u.USERNAME as USER_NAME,
        'Executed report: ' || ir.REPORT_NAME as DESCRIPTION,
        qe.START_TIME as ACTIVITY_TIME,
        qe.STATUS
      FROM QUERY_EXECUTIONS qe
      JOIN INSTANT_REPORTS ir ON qe.REPORT_ID = ir.REPORT_ID
      JOIN USERS u ON qe.USER_ID = u.USER_ID
      WHERE qe.START_TIME >= SYSDATE - 1
      
      UNION ALL
      
      SELECT 
        'email_sent' as ACTIVITY_TYPE,
        'system' as USER_NAME,
        'Email sent: ' || el.SUBJECT as DESCRIPTION,
        el.SENT_AT as ACTIVITY_TIME,
        el.STATUS
      FROM EMAIL_LOGS el
      WHERE el.SENT_AT >= SYSDATE - 1
      
      ORDER BY ACTIVITY_TIME DESC
      FETCH FIRST 10 ROWS ONLY
    `);

    res.json({
      success: true,
      activities: activities.rows
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ error: 'Error fetching recent activity' });
  }
});

// Perform database backup
router.post('/backup', async (req, res) => {
  try {
    // In a real implementation, this would trigger an actual backup
    // For now, we'll simulate the backup process
    
    const backupId = `BACKUP_${new Date().toISOString().replace(/[:.]/g, '_')}`;
    
    // Log the backup operation
    await executeQuery(`
      INSERT INTO SYSTEM_LOGS (LOG_ID, LOG_TYPE, MESSAGE, CREATED_AT)
      VALUES (FN_GENERATE_ID('LOG'), 'backup', 'Database backup initiated: ${backupId}', CURRENT_TIMESTAMP)
    `);

    res.json({
      success: true,
      message: 'Database backup initiated successfully',
      backupId: backupId
    });
  } catch (error) {
    console.error('Error initiating backup:', error);
    res.status(500).json({ error: 'Error initiating database backup' });
  }
});

// Cleanup old logs
router.post('/cleanup-logs', async (req, res) => {
  try {
    // Delete logs older than 30 days
    const result = await executeQuery(`
      DELETE FROM EMAIL_LOGS 
      WHERE CREATED_AT < SYSDATE - 30
    `);

    const result2 = await executeQuery(`
      DELETE FROM QUERY_EXECUTIONS 
      WHERE START_TIME < SYSDATE - 30
    `);

    res.json({
      success: true,
      message: `Cleanup completed. Removed ${result.rowsAffected + result2.rowsAffected} old records.`
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    res.status(500).json({ error: 'Error cleaning up logs' });
  }
});

// Helper functions for health checks
async function checkDatabaseHealth() {
  try {
    const result = await executeQuery('SELECT 1 FROM DUAL');
    const responseTime = Date.now();
    return responseTime < 1000 ? 'healthy' : 'warning';
  } catch (error) {
    return 'error';
  }
}

async function checkEmailHealth() {
  try {
    const { verifyEmailConfig } = require('../config/email');
    const isHealthy = await verifyEmailConfig();
    return isHealthy ? 'healthy' : 'warning';
  } catch (error) {
    return 'error';
  }
}

async function checkStorageHealth() {
  try {
    // Check tablespace usage
    const result = await executeQuery(`
      SELECT 
        ROUND((used_space / tablespace_size) * 100, 2) as USAGE_PERCENT
      FROM dba_tablespace_usage_metrics 
      WHERE tablespace_name = 'ENTERPRISE_REPORTS'
    `);
    
    const usage = result.rows[0]?.USAGE_PERCENT || 0;
    return usage < 80 ? 'healthy' : usage < 90 ? 'warning' : 'error';
  } catch (error) {
    return 'warning';
  }
}

async function checkPerformanceHealth() {
  try {
    // Check recent query performance
    const result = await executeQuery(`
      SELECT AVG(
        EXTRACT(EPOCH FROM (END_TIME - START_TIME)) * 1000
      ) as AVG_RESPONSE_TIME
      FROM QUERY_EXECUTIONS
      WHERE START_TIME >= SYSDATE - 1
      AND STATUS = 'completed'
    `);

    const avgTime = result.rows[0]?.AVG_RESPONSE_TIME || 0;
    return avgTime < 5000 ? 'healthy' : avgTime < 10000 ? 'warning' : 'error';
  } catch (error) {
    return 'warning';
  }
}

// User Management Endpoints - Connect to real Oracle database
router.get('/users', async (req, res) => {
  try {
    const result = await executeQuery(`
      SELECT USER_ID as id, USER_ID as userId, USERNAME as username, EMAIL as email,
             FIRST_NAME as firstName, LAST_NAME as lastName, ROLE as role,
             IS_ACTIVE as isActive, CREATED_AT as createdAt, LAST_LOGIN as lastLogin
      FROM USERS
      ORDER BY CREATED_AT DESC
    `);

    res.json({
      success: true,
      users: result.rows || []
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users from database' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { username, email, firstName, lastName, password, role, isActive } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    const userIdResult = await executeQuery('SELECT FN_GENERATE_ID(:prefix) as USER_ID FROM DUAL', { prefix: 'USR' });
    const userId = userIdResult.rows[0].USER_ID;

    await executeQuery(`
      INSERT INTO USERS (USER_ID, USERNAME, EMAIL, PASSWORD_HASH, FIRST_NAME, LAST_NAME, ROLE, IS_ACTIVE, CREATED_AT)
      VALUES (:userId, :username, :email, :passwordHash, :firstName, :lastName, :role, :isActive, CURRENT_TIMESTAMP)
    `, {
      userId,
      username,
      email,
      passwordHash,
      firstName,
      lastName,
      role: role || 'user',
      isActive: isActive ? 1 : 0
    });

    res.json({
      success: true,
      message: 'User created successfully',
      userId
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.message && error.message.includes('unique constraint')) {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Error creating user in database' });
    }
  }
});

router.put('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, firstName, lastName, password, role, isActive } = req.body;

    let updateQuery = `
      UPDATE USERS
      SET USERNAME = :username, EMAIL = :email, FIRST_NAME = :firstName,
          LAST_NAME = :lastName, ROLE = :role, IS_ACTIVE = :isActive
    `;

    const params = {
      userId,
      username,
      email,
      firstName,
      lastName,
      role,
      isActive: isActive ? 1 : 0
    };

    if (password) {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);
      updateQuery += ', PASSWORD_HASH = :passwordHash';
      params.passwordHash = passwordHash;
    }

    updateQuery += ' WHERE USER_ID = :userId';

    await executeQuery(updateQuery, params);

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Error updating user in database' });
  }
});

router.delete('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    await executeQuery('DELETE FROM USERS WHERE USER_ID = :userId', { userId });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error deleting user from database' });
  }
});

module.exports = router;