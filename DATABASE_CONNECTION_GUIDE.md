# Real Database Connection Guide

## Overview
This guide will help you connect the Oracle Reporting System to your real Oracle database and configure it for production use.

## Database Connection Options

### 1. Local Oracle Database

#### Connection String Format:
```
localhost:1521/XE          # Oracle Express Edition
localhost:1521/ORCL        # Standard Oracle Database
localhost:1521/your_sid    # Custom SID
```

#### Environment Configuration:
```env
DB_USER=ENTERPRISE_USER
DB_PASSWORD=your_actual_password
DB_CONNECT_STRING=localhost:1521/XE
```

### 2. Remote Oracle Database

#### Connection String Format:
```
server_ip:1521/service_name
hostname.domain.com:1521/PROD
192.168.1.100:1521/TESTDB
```

#### Environment Configuration:
```env
DB_USER=your_username
DB_PASSWORD=your_password
DB_CONNECT_STRING=your_server:1521/your_service
```

### 3. Oracle Cloud Database

#### Connection String Format:
```
# Oracle Autonomous Database
your_service_high
your_service_medium
your_service_low

# Oracle Cloud Infrastructure
your_host:1521/your_pdb.your_domain.oraclecloud.com
```

#### Environment Configuration:
```env
DB_USER=your_cloud_username
DB_PASSWORD=your_cloud_password
DB_CONNECT_STRING=your_cloud_connection_string
```

## Step-by-Step Database Setup

### Step 1: Prepare Your Oracle Database

#### Create Application User:
```sql
-- Connect as SYSDBA
sqlplus sys/your_password@your_connection as sysdba

-- Create tablespace (optional but recommended)
CREATE TABLESPACE ENTERPRISE_REPORTS
DATAFILE 'enterprise_reports.dbf' SIZE 100M
AUTOEXTEND ON NEXT 10M MAXSIZE 1G;

-- Create application user
CREATE USER ENTERPRISE_USER IDENTIFIED BY "YourSecurePassword123!"
DEFAULT TABLESPACE ENTERPRISE_REPORTS
TEMPORARY TABLESPACE TEMP;

-- Grant necessary privileges
GRANT CONNECT, RESOURCE TO ENTERPRISE_USER;
GRANT CREATE VIEW TO ENTERPRISE_USER;
GRANT CREATE PROCEDURE TO ENTERPRISE_USER;
GRANT CREATE TRIGGER TO ENTERPRISE_USER;
GRANT CREATE SEQUENCE TO ENTERPRISE_USER;
GRANT UNLIMITED TABLESPACE TO ENTERPRISE_USER;
```

### Step 2: Execute Database Schema

Run the migration files in order:

#### 1. Create Tables and Basic Structure:
```bash
sqlplus ENTERPRISE_USER/YourSecurePassword123!@your_connection @supabase/migrations/20250628131745_dark_leaf.sql
```

#### 2. Create Stored Procedures:
```bash
sqlplus ENTERPRISE_USER/YourSecurePassword123!@your_connection @supabase/migrations/20250628131817_lucky_grass.sql
```

#### 3. Insert Sample Data:
```bash
sqlplus ENTERPRISE_USER/YourSecurePassword123!@your_connection @supabase/migrations/20250628131859_dry_king.sql
```

### Step 3: Configure Application

#### Update server/.env:
```env
# Database Configuration
DB_USER=ENTERPRISE_USER
DB_PASSWORD=YourSecurePassword123!
DB_CONNECT_STRING=your_actual_connection_string

# Example for local database:
# DB_CONNECT_STRING=localhost:1521/XE

# Example for remote database:
# DB_CONNECT_STRING=192.168.1.100:1521/PROD

# Example for Oracle Cloud:
# DB_CONNECT_STRING=your_service_high
```

### Step 4: Test Database Connection

Create and run a test script:

#### server/test-connection.js:
```javascript
const oracledb = require('oracledb');
require('dotenv').config();

async function testConnection() {
  let connection;
  
  try {
    console.log('Testing Oracle Database Connection...');
    console.log('Connection String:', process.env.DB_CONNECT_STRING);
    console.log('Username:', process.env.DB_USER);
    
    connection = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING
    });
    
    console.log('✅ Database connected successfully!');
    
    // Test query
    const result = await connection.execute('SELECT COUNT(*) as USER_COUNT FROM USERS');
    console.log('📊 Users in database:', result.rows[0].USER_COUNT);
    
    // Test stored procedure
    const procResult = await connection.execute(
      'SELECT FN_GENERATE_ID(:prefix) as NEW_ID FROM DUAL',
      { prefix: 'TEST' }
    );
    console.log('🔧 Stored procedure test:', procResult.rows[0].NEW_ID);
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('TNS:could not resolve')) {
      console.log('\n💡 Troubleshooting Tips:');
      console.log('1. Check if Oracle database is running');
      console.log('2. Verify connection string format');
      console.log('3. Ensure Oracle Instant Client is installed');
      console.log('4. Check network connectivity to database server');
    }
    
    if (error.message.includes('invalid username/password')) {
      console.log('\n💡 Authentication Tips:');
      console.log('1. Verify username and password');
      console.log('2. Check if user exists in database');
      console.log('3. Ensure user has necessary privileges');
    }
    
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log('🔌 Database connection closed');
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}

testConnection();
```

#### Run the test:
```bash
cd server
node test-connection.js
```

## Email Configuration for Production

### Gmail Configuration:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Outlook/Office 365:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Custom SMTP Server:
```env
SMTP_HOST=mail.your-domain.com
SMTP_PORT=587
SMTP_USER=your-email@your-domain.com
SMTP_PASS=your-password
```

### Test Email Configuration:

#### server/test-email.js:
```javascript
const { verifyEmailConfig, sendEmail } = require('./config/email');

async function testEmail() {
  try {
    console.log('Testing email configuration...');
    
    const isValid = await verifyEmailConfig();
    if (!isValid) {
      console.log('❌ Email configuration failed');
      return;
    }
    
    console.log('✅ Email configuration verified');
    
    // Send test email
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email from Oracle Reports',
      html: '<h1>Test Email</h1><p>Email configuration is working!</p>'
    });
    
    if (result.success) {
      console.log('✅ Test email sent successfully');
    } else {
      console.log('❌ Test email failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

testEmail();
```

## Production Deployment Checklist

### Security Configuration:
- [ ] Change default passwords
- [ ] Use strong JWT secret
- [ ] Enable HTTPS
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable audit logging

### Environment Variables:
```env
# Production Environment
NODE_ENV=production
PORT=3001

# Secure Database Connection
DB_USER=your_prod_user
DB_PASSWORD=your_secure_password
DB_CONNECT_STRING=your_prod_connection

# Strong JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_very_secure_jwt_secret_here

# Production Email Settings
SMTP_HOST=your_production_smtp
SMTP_PORT=587
SMTP_USER=your_production_email
SMTP_PASS=your_production_password

# File Upload Limits
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.xlsx,.xls,.csv
```

### Database Performance Tuning:
```sql
-- Analyze tables for better performance
EXEC DBMS_STATS.GATHER_SCHEMA_STATS('ENTERPRISE_USER');

-- Create additional indexes if needed
CREATE INDEX IDX_QUERY_EXEC_DATE ON QUERY_EXECUTIONS(START_TIME);
CREATE INDEX IDX_EMAIL_LOGS_DATE ON EMAIL_LOGS(CREATED_AT);

-- Monitor database performance
SELECT * FROM V$SESSION WHERE USERNAME = 'ENTERPRISE_USER';
SELECT * FROM V$SQL WHERE PARSING_SCHEMA_NAME = 'ENTERPRISE_USER';
```

## Monitoring and Maintenance

### Database Health Checks:
```sql
-- Check tablespace usage
SELECT 
  tablespace_name,
  ROUND(used_space * 8192 / 1024 / 1024, 2) AS used_mb,
  ROUND(tablespace_size * 8192 / 1024 / 1024, 2) AS total_mb,
  ROUND(used_percent, 2) AS used_percent
FROM dba_tablespace_usage_metrics
WHERE tablespace_name = 'ENTERPRISE_REPORTS';

-- Check active sessions
SELECT 
  username,
  status,
  COUNT(*) as session_count
FROM v$session 
WHERE username = 'ENTERPRISE_USER'
GROUP BY username, status;

-- Check recent errors
SELECT * FROM (
  SELECT timestamp, message_text 
  FROM v$diag_alert_ext 
  WHERE component_id = 'rdbms'
  ORDER BY timestamp DESC
) WHERE ROWNUM <= 10;
```

### Application Monitoring:
```javascript
// Add to server/app.js for monitoring
app.get('/api/admin/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const emailHealth = await checkEmailHealth();
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      email: emailHealth,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: error.message });
  }
});
```

## Backup and Recovery

### Automated Database Backup:
```sql
-- Create backup script
BEGIN
  DBMS_DATAPUMP.EXPORT(
    job_name => 'ENTERPRISE_BACKUP_' || TO_CHAR(SYSDATE, 'YYYYMMDD'),
    schemas => 'ENTERPRISE_USER',
    directory => 'DATA_PUMP_DIR',
    dumpfile => 'enterprise_backup_' || TO_CHAR(SYSDATE, 'YYYYMMDD') || '.dmp',
    logfile => 'enterprise_backup_' || TO_CHAR(SYSDATE, 'YYYYMMDD') || '.log'
  );
END;
/
```

### Application Data Backup:
```javascript
// Add to your backup routine
const backupData = async () => {
  const tables = ['USERS', 'AUTO_MAIL_REPORTS', 'INSTANT_REPORTS', 'QUERY_EXECUTIONS'];
  
  for (const table of tables) {
    const result = await executeQuery(`SELECT * FROM ${table}`);
    const backup = {
      table,
      timestamp: new Date().toISOString(),
      data: result.rows
    };
    
    fs.writeFileSync(
      `backups/${table}_${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(backup, null, 2)
    );
  }
};
```

This guide provides everything you need to connect your application to a real Oracle database and deploy it in production! 🚀