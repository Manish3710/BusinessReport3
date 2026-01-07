# Real Database Integration Guide

## Current Status: Mock Data vs Real Database

### What Works Now (Mock Data)
✅ **Frontend functionality** - All UI components work perfectly
✅ **Data persistence** - Uses localStorage for data persistence across sessions
✅ **Real-time updates** - Dashboard updates automatically when data changes
✅ **Report creation** - New reports are saved and visible immediately
✅ **User authentication** - Login/logout with demo credentials
✅ **Responsive design** - Works on all devices

### What Happens When Connected to Real Database
🔄 **Automatic transition** - The app will automatically use real database when backend is available
🔄 **Data synchronization** - Local data will sync with database data
🔄 **Real statistics** - Dashboard will show actual database statistics
🔄 **Persistent storage** - Data will be stored in Oracle database permanently

## How the Integration Works

### 1. **Automatic Backend Detection**
The app tries to connect to the backend first, falls back to mock data if unavailable:

```typescript
// In AuthContext and API service
try {
  const response = await fetch('/api/auth/login', { ... });
  // Use real backend
} catch (error) {
  console.log('Backend not available, using mock data');
  // Use mock authentication
}
```

### 2. **Data Persistence Strategy**
- **Development**: Uses localStorage + mock data
- **Production**: Uses Oracle database + localStorage as cache
- **Hybrid**: Syncs between localStorage and database when available

### 3. **Real-time Updates**
- Dashboard statistics update automatically when reports are created
- Recent activity shows live timestamps
- System status reflects actual database connection

## Setting Up Real Database Connection

### Step 1: Configure Environment Variables

Create `server/.env`:
```env
# Database Configuration
DB_USER=ENTERPRISE_USER
DB_PASSWORD=your_oracle_password
DB_CONNECT_STRING=localhost:1521/XE

# Email Configuration  
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=manishwakade@gmail.com
SMTP_PASS=your_app_password

# JWT Secret
JWT_SECRET=your-secure-jwt-secret
```

### Step 2: Install Oracle Database
1. **Oracle Express Edition** (recommended for development)
2. **Oracle Standard/Enterprise** (for production)
3. **Oracle Cloud Database** (for cloud deployment)

### Step 3: Execute Database Schema
Run the migration files in order:
```bash
sqlplus ENTERPRISE_USER/password@connection @supabase/migrations/20250628131745_dark_leaf.sql
sqlplus ENTERPRISE_USER/password@connection @supabase/migrations/20250628131817_lucky_grass.sql
sqlplus ENTERPRISE_USER/password@connection @supabase/migrations/20250628131859_dry_king.sql
```

### Step 4: Start Backend Server
```bash
cd server
npm install
npm start
```

### Step 5: Test Connection
```bash
# Test database connection
node server/test-connection.js

# Test email configuration
node server/test-email.js
```

## What Changes When Database is Connected

### 1. **Dashboard Statistics** 
- **Before**: Mock numbers (12 reports, 156 users, etc.)
- **After**: Real counts from database tables

### 2. **Report Creation**
- **Before**: Saved to localStorage only
- **After**: Saved to Oracle database + localStorage cache

### 3. **User Management**
- **Before**: Mock users (admin/admin123, user/user123)
- **After**: Real user authentication with Oracle database

### 4. **Email Functionality**
- **Before**: Simulated email sending
- **After**: Real emails sent via SMTP with your Gmail credentials

### 5. **System Health**
- **Before**: Mock health status
- **After**: Real database connection, email service, and performance monitoring

## Database Administration Features

When connected to real database, the Database Admin module will show:

### Real-time Monitoring
- **Database Size**: Actual tablespace usage
- **Active Connections**: Current database sessions
- **Query Performance**: Average response times
- **Email Delivery**: Success/failure rates

### System Health Checks
- **Database Health**: Connection pool status, response times
- **Email Service**: SMTP connectivity and authentication
- **Storage Health**: Disk space usage and I/O performance
- **Performance**: CPU, memory, and query execution times

### Maintenance Operations
- **Database Backup**: Real backup operations
- **Log Cleanup**: Remove old logs and execution records
- **Performance Reports**: Generate actual performance analysis

## Email Configuration

### Gmail Setup (Your Credentials)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=manishwakade@gmail.com
SMTP_PASS=your_app_password  # Generate App Password in Gmail
```

### Email Features When Connected
- **Auto Mail Reports**: Send scheduled reports with Excel attachments
- **Instant Reports**: Email generated reports to recipients
- **System Notifications**: Send alerts for system events
- **Password Reset**: Send password reset emails

## VS Code Development Setup

### 1. **Install Dependencies**
```bash
npm install
cd server && npm install
```

### 2. **Configure VS Code**
- Install recommended extensions
- Set up debugging configuration
- Configure tasks for frontend/backend

### 3. **Development Workflow**
```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend  
npm run dev
```

## Production Deployment

### Frontend (Netlify/Vercel)
```bash
npm run build
# Deploy dist/ folder
```

### Backend (Your Server)
```bash
# Copy server/ folder to your server
# Set production environment variables
# Start with PM2 or similar process manager
```

### Database (Oracle Cloud/On-premise)
- Set up Oracle database
- Configure connection string
- Set up automated backups

## Troubleshooting

### Common Issues

1. **Oracle Connection Error**
   - Check Oracle Instant Client installation
   - Verify connection string format
   - Test with SQL*Plus first

2. **Email Not Working**
   - Generate Gmail App Password
   - Check SMTP settings
   - Test with nodemailer directly

3. **Frontend Not Connecting**
   - Check CORS configuration
   - Verify API URL in .env
   - Check network connectivity

### Debug Mode
```bash
# Enable debug logging
export DEBUG=*
npm run dev
```

## Summary

Your Oracle Reporting System is designed to work seamlessly in both development and production environments:

- **Development**: Uses mock data with localStorage persistence
- **Production**: Connects to real Oracle database with full functionality
- **Hybrid**: Automatically detects and switches between modes

The transition from mock data to real database is **completely automatic** - just set up the database and start the backend server! 🚀