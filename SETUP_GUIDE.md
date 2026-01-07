# Enterprise Reporting Web App - Complete Setup Guide

## Table of Contents
1. [System Requirements](#system-requirements)
2. [Oracle Database Setup](#oracle-database-setup)
3. [Application Installation](#application-installation)
4. [Environment Configuration](#environment-configuration)
5. [Database Schema Setup](#database-schema-setup)
6. [Running the Application](#running-the-application)
7. [Testing the Application](#testing-the-application)
8. [Troubleshooting](#troubleshooting)
9. [Production Deployment](#production-deployment)

---

## 1. System Requirements

### Software Prerequisites
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher
- **Oracle Database**: 11g or higher (Express Edition is sufficient for development)
- **Oracle Instant Client**: Version 19.3 or higher
- **Git**: For version control (optional)

### Operating System Support
- Windows 10/11
- macOS 10.15 or higher
- Linux (Ubuntu 18.04+, CentOS 7+, RHEL 7+)

### Hardware Requirements
- **RAM**: Minimum 4GB, Recommended 8GB
- **Storage**: 2GB free space
- **Network**: Internet connection for package installation

---

## 2. Oracle Database Setup

### Step 2.1: Install Oracle Database

#### Option A: Oracle Database Express Edition (Recommended for Development)
1. Download Oracle Database 21c Express Edition from Oracle website
2. Install following the installation wizard
3. Set the database password (remember this for later)
4. Default connection details:
   - **Host**: localhost
   - **Port**: 1521
   - **Service Name**: XE

#### Option B: Oracle Database Standard/Enterprise Edition
1. Install Oracle Database following Oracle documentation
2. Create a new database instance
3. Note down the connection details

### Step 2.2: Install Oracle Instant Client

#### Windows:
1. Download Oracle Instant Client from Oracle website
2. Extract to `C:\oracle\instantclient_19_3`
3. Add to PATH environment variable:
   ```
   C:\oracle\instantclient_19_3
   ```
4. Set environment variable:
   ```
   OCI_LIB_DIR=C:\oracle\instantclient_19_3
   OCI_INC_DIR=C:\oracle\instantclient_19_3\sdk\include
   ```

#### macOS:
```bash
# Using Homebrew
brew tap InstantClientTap/instantclient
brew install instantclient-basic
brew install instantclient-sdk
```

#### Linux (Ubuntu/Debian):
```bash
# Download and install
wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-basic-linux.x64-19.3.0.0.0dbru.zip
unzip instantclient-basic-linux.x64-19.3.0.0.0dbru.zip
sudo mv instantclient_19_3 /opt/oracle/
echo 'export LD_LIBRARY_PATH=/opt/oracle/instantclient_19_3:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc
```

### Step 2.3: Verify Oracle Installation
```sql
-- Connect to Oracle using SQL*Plus or SQL Developer
sqlplus sys/your_password@localhost:1521/XE as sysdba

-- Check if connection is successful
SELECT * FROM v$version;
```

---

## 3. Application Installation

### Step 3.1: Clone or Download the Project
```bash
# If using Git
git clone <your-repository-url>
cd enterprise-reporting-app

# Or download and extract the project files
```

### Step 3.2: Install Dependencies

#### Frontend Dependencies:
```bash
# Navigate to project root
npm install
```

#### Backend Dependencies:
```bash
# Navigate to server directory
cd server
npm install
cd ..
```

### Step 3.3: Verify Installation
```bash
# Check if all packages are installed
npm list
cd server && npm list && cd ..
```

---

## 4. Environment Configuration

### Step 4.1: Create Environment Files

#### Frontend Environment (.env):
```env
# Database Configuration
VITE_API_URL=http://localhost:3001/api

# Application Configuration
VITE_APP_NAME=Enterprise Reports
VITE_APP_VERSION=1.0.0
```

#### Backend Environment (server/.env):
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_USER=ENTERPRISE_USER
DB_PASSWORD=EnterprisePass123!
DB_CONNECT_STRING=localhost:1521/XE

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Email Configuration (Gmail Example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.xlsx,.xls
```

### Step 4.2: Email Configuration Setup

#### For Gmail:
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in SMTP_PASS

#### For Other Email Providers:
- **Outlook**: smtp-mail.outlook.com, port 587
- **Yahoo**: smtp.mail.yahoo.com, port 587
- **Custom SMTP**: Contact your email provider for settings

---

## 5. Database Schema Setup

### Step 5.1: Connect to Oracle Database
```bash
# Using SQL*Plus
sqlplus sys/your_password@localhost:1521/XE as sysdba
```

### Step 5.2: Execute Database Scripts

#### Script 1: Create Tables and User
```sql
-- Execute the contents of supabase/migrations/20250628131745_dark_leaf.sql
-- This creates:
-- - Application user (ENTERPRISE_USER)
-- - All required tables
-- - Indexes and constraints
-- - Sample data

@supabase/migrations/20250628131745_dark_leaf.sql
```

#### Script 2: Create Stored Procedures
```sql
-- Execute the contents of supabase/migrations/20250628131817_lucky_grass.sql
-- This creates all stored procedures and functions

@supabase/migrations/20250628131817_lucky_grass.sql
```

#### Script 3: Insert Sample Data
```sql
-- Execute the contents of supabase/migrations/20250628131859_dry_king.sql
-- This creates sample tables and test data

@supabase/migrations/20250628131859_dry_king.sql
```

### Step 5.3: Verify Database Setup
```sql
-- Connect as ENTERPRISE_USER
CONNECT ENTERPRISE_USER/EnterprisePass123!@localhost:1521/XE

-- Check if tables are created
SELECT table_name FROM user_tables;

-- Check if procedures are created
SELECT object_name FROM user_objects WHERE object_type = 'PROCEDURE';

-- Verify sample data
SELECT COUNT(*) FROM USERS;
SELECT COUNT(*) FROM AUTO_MAIL_REPORTS;
SELECT COUNT(*) FROM INSTANT_REPORTS;
```

---

## 6. Running the Application

### Step 6.1: Start the Backend Server
```bash
# Navigate to server directory
cd server

# Start the server
npm start

# Or for development with auto-reload
npm run dev
```

**Expected Output:**
```
Server running on port 3001
Oracle Database connection pool created successfully
Email server configuration verified successfully
```

### Step 6.2: Start the Frontend Application
```bash
# In a new terminal, navigate to project root
npm run dev
```

**Expected Output:**
```
Local:   http://localhost:5173/
Network: use --host to expose
```

### Step 6.3: Access the Application
1. Open your web browser
2. Navigate to `http://localhost:5173`
3. You should see the login page

---

## 7. Testing the Application

### Step 7.1: Login Testing

#### Admin Login:
- **Username**: admin
- **Password**: admin123
- **Expected**: Access to all modules including admin features

#### User Login:
- **Username**: user
- **Password**: user123
- **Expected**: Limited access based on assigned permissions

### Step 7.2: Feature Testing

#### Auto Mail Reports:
1. Login as admin
2. Navigate to "Auto Mail Reports"
3. Click "Create Report"
4. Fill in the form with test data
5. Save and test "Run Now" functionality

#### Instant Reports:
1. Navigate to "Instant Reports"
2. Select a sample report
3. Choose date range
4. Click "Run Report"
5. Verify Excel download

#### Master Upload:
1. Navigate to "Master Upload"
2. Download sample file
3. Fill with test data
4. Upload and verify validation

### Step 7.3: Database Verification
```sql
-- Check if data is being inserted
SELECT * FROM AUTO_MAIL_REPORTS;
SELECT * FROM QUERY_EXECUTIONS;
SELECT * FROM EMAIL_LOGS;
```

---

## 8. Troubleshooting

### Common Issues and Solutions

#### Issue 1: Oracle Connection Error
**Error**: `ORA-12154: TNS:could not resolve the connect identifier`

**Solution**:
1. Verify Oracle database is running
2. Check connection string in .env file
3. Ensure Oracle Instant Client is properly installed
4. Test connection with SQL*Plus

#### Issue 2: Node.js Oracle Module Error
**Error**: `Error: Oracle client library is not found`

**Solution**:
```bash
# Windows
set PATH=C:\oracle\instantclient_19_3;%PATH%

# Linux/macOS
export LD_LIBRARY_PATH=/opt/oracle/instantclient_19_3:$LD_LIBRARY_PATH
```

#### Issue 3: Email Sending Fails
**Error**: `Authentication failed`

**Solution**:
1. Verify email credentials in .env
2. Enable "Less secure app access" or use App Password
3. Check firewall settings for SMTP ports

#### Issue 4: File Upload Issues
**Error**: `File type not allowed`

**Solution**:
1. Ensure file is .xlsx or .xls format
2. Check file size limits
3. Verify upload directory permissions

#### Issue 5: Port Already in Use
**Error**: `EADDRINUSE: address already in use :::3001`

**Solution**:
```bash
# Find and kill process using port 3001
# Windows
netstat -ano | findstr :3001
taskkill /PID <process_id> /F

# Linux/macOS
lsof -ti:3001 | xargs kill -9
```

### Debug Mode
```bash
# Enable debug logging
export DEBUG=*
npm run dev
```

---

## 9. Production Deployment

### Step 9.1: Build for Production
```bash
# Build frontend
npm run build

# The build files will be in 'dist' directory
```

### Step 9.2: Production Environment Setup
```env
# server/.env.production
NODE_ENV=production
PORT=3001

# Use production database
DB_CONNECT_STRING=your-production-db:1521/PROD

# Secure JWT secret
JWT_SECRET=your-very-secure-production-jwt-secret

# Production email settings
SMTP_HOST=your-production-smtp.com
```

### Step 9.3: Security Considerations
1. **Change default passwords**
2. **Use HTTPS in production**
3. **Configure firewall rules**
4. **Regular database backups**
5. **Monitor application logs**

### Step 9.4: Performance Optimization
1. **Database connection pooling** (already configured)
2. **Enable Oracle query caching**
3. **Implement Redis for session management**
4. **Use CDN for static assets**

---

## 10. Maintenance and Monitoring

### Daily Tasks
- Monitor application logs
- Check database performance
- Verify email delivery

### Weekly Tasks
- Database backup
- Review user access logs
- Update system dependencies

### Monthly Tasks
- Security audit
- Performance review
- User feedback analysis

---

## Support and Documentation

### Application Structure
```
enterprise-reporting-app/
├── src/                    # Frontend React application
├── server/                 # Backend Node.js application
├── supabase/migrations/    # Database schema files
├── package.json           # Frontend dependencies
└── server/package.json    # Backend dependencies
```

### Key Files
- **Frontend Entry**: `src/main.tsx`
- **Backend Entry**: `server/app.js`
- **Database Config**: `server/config/database.js`
- **Email Config**: `server/config/email.js`

### Useful Commands
```bash
# Check application status
npm run status

# View logs
npm run logs

# Restart services
npm run restart

# Database backup
npm run db:backup
```

---

## Conclusion

Your Enterprise Reporting Web App is now fully configured and ready for use. This comprehensive system provides:

- **Automated email reporting** with Excel attachments
- **On-demand report generation** with date filtering
- **Bulk data upload** with validation
- **User management** and access control
- **Secure authentication** and authorization

For additional support or feature requests, refer to the application documentation or contact your system administrator.

---

**Document Version**: 1.0  
**Last Updated**: December 28, 2024  
**Application Version**: 1.0.0