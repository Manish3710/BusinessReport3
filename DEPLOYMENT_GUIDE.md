# Complete Deployment Guide

This guide walks you through deploying your Business Reporting Manager application with:
- **Frontend**: Netlify
- **Backend**: Render
- **Database**: Oracle Cloud Autonomous Database

---

## Prerequisites

1. **Oracle Cloud Autonomous Database**
   - Autonomous Database instance created
   - Wallet downloaded (contains connection credentials)
   - Database user credentials (username, password)

2. **Accounts**
   - GitHub account (for code repository)
   - Netlify account (free tier works)
   - Render account (free tier works)

3. **Email Service**
   - Gmail account or SMTP credentials for sending emails

---

## Part 1: Prepare Oracle Database Connection

### Step 1: Download Oracle Wallet

1. Log into Oracle Cloud Console
2. Navigate to your Autonomous Database
3. Click "DB Connection"
4. Download the wallet (ZIP file)
5. Extract the wallet files - you'll need these for Render

### Step 2: Get Connection String

From the extracted wallet, open `tnsnames.ora` file. You'll see entries like:

```
your_db_high = (description= (retry_count=20)(retry_delay=3)...)
your_db_medium = (description= (retry_count=20)(retry_delay=3)...)
your_db_low = (description= (retry_count=20)(retry_delay=3)...)
```

Copy the entire connection string for `your_db_high` (everything inside the parentheses after the `=` sign).

---

## Part 2: Deploy Backend to Render

### Step 1: Push Code to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit for deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 2: Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `business-reporting-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && node app.js`
   - **Plan**: Free (or paid for better performance)

### Step 3: Upload Oracle Wallet to Render

Since Render doesn't support file uploads directly through the UI, you need to:

**Option A: Base64 Encode Wallet Files (Recommended for Free Tier)**

1. On your local machine, base64 encode the wallet directory:
   ```bash
   cd path/to/wallet
   tar -czf - * | base64 > wallet_base64.txt
   ```

2. In your `server/app.js`, add code to decode and extract wallet on startup (before database connection):
   ```javascript
   const fs = require('fs');
   const path = require('path');
   const { execSync } = require('child_process');

   // Extract wallet from base64 if ORACLE_WALLET_BASE64 is set
   if (process.env.ORACLE_WALLET_BASE64) {
     const walletDir = path.join(__dirname, 'wallet');
     if (!fs.existsSync(walletDir)) {
       fs.mkdirSync(walletDir, { recursive: true });
     }

     const walletTarGz = Buffer.from(process.env.ORACLE_WALLET_BASE64, 'base64');
     fs.writeFileSync(path.join(__dirname, 'wallet.tar.gz'), walletTarGz);
     execSync(`cd ${__dirname} && tar -xzf wallet.tar.gz -C wallet`);
     console.log('Wallet extracted successfully');
   }
   ```

**Option B: Use Render Disk Storage (Paid Plans Only)**

1. Add a persistent disk in Render
2. Upload wallet files via SFTP/SSH

### Step 4: Configure Environment Variables in Render

In your Render service settings, go to "Environment" and add:

| Key | Value | Example |
|-----|-------|---------|
| `NODE_ENV` | `production` | |
| `PORT` | `10000` | (Render automatically sets this) |
| `JWT_SECRET` | Generate a random string | `your-super-secret-jwt-key-here` |
| `ORACLE_USER` | Your DB username | `ADMIN` |
| `ORACLE_PASSWORD` | Your DB password | `YourPassword123!` |
| `ORACLE_CONNECTION_STRING` | Full connection string from tnsnames.ora | `(description=(retry_count=20)...)` |
| `ORACLE_WALLET_LOCATION` | Path to wallet | `/opt/render/project/src/server/wallet` |
| `ORACLE_WALLET_PASSWORD` | Wallet password (if set) | Leave empty if no password |
| `ORACLE_WALLET_BASE64` | Base64 encoded wallet | Paste content from wallet_base64.txt |
| `EMAIL_USER` | Your email address | `your-email@gmail.com` |
| `EMAIL_PASSWORD` | App password (not regular password) | `abcd efgh ijkl mnop` |
| `EMAIL_FROM` | Sender email | `"Business Reports" <your-email@gmail.com>` |
| `FRONTEND_URL` | Your Netlify URL | `https://your-app.netlify.app` |

**For Gmail App Password:**
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Generate App Password for "Mail"
4. Use that 16-character password

### Step 5: Deploy

Click "Create Web Service" or "Manual Deploy" if already created. Render will build and deploy your backend.

**Important**: Copy your Render backend URL (e.g., `https://business-reporting-backend.onrender.com`)

---

## Part 3: Deploy Frontend to Netlify

### Step 1: Update API Configuration

1. Create a production environment file in your project root:

**Create `.env.production`:**
```env
VITE_API_URL=https://YOUR_RENDER_URL.onrender.com
```

Replace `YOUR_RENDER_URL` with your actual Render backend URL from Part 2, Step 5.

2. Ensure your `src/services/api.ts` uses this environment variable:
```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

### Step 2: Deploy to Netlify

**Option A: Netlify CLI (Recommended)**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

**Option B: Netlify UI**

1. Go to [Netlify](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Connect to your GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Base directory**: Leave empty

### Step 3: Configure Environment Variables in Netlify

1. In Netlify dashboard, go to Site settings → Environment variables
2. Add:
   - `VITE_API_URL` = `https://YOUR_RENDER_URL.onrender.com`

### Step 4: Update Backend CORS

Now that you have your Netlify URL, update the `FRONTEND_URL` environment variable in Render to your Netlify URL:

1. Go to Render dashboard
2. Select your backend service
3. Go to Environment
4. Update `FRONTEND_URL` to your Netlify URL (e.g., `https://your-app.netlify.app`)
5. Save and redeploy

---

## Part 4: Database Setup

### Step 1: Connect to Oracle Database

Use SQL Developer, SQLcl, or Oracle Cloud SQL Worksheet to connect to your database.

### Step 2: Create Required Tables

Run these SQL scripts in order:

```sql
-- 1. Create Users Table
CREATE TABLE users (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR2(255) UNIQUE NOT NULL,
    email VARCHAR2(255) UNIQUE NOT NULL,
    password VARCHAR2(255) NOT NULL,
    role VARCHAR2(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Reports Table
CREATE TABLE reports (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id NUMBER NOT NULL,
    report_type VARCHAR2(50) NOT NULL,
    report_name VARCHAR2(255) NOT NULL,
    status VARCHAR2(50) DEFAULT 'pending',
    file_path VARCHAR2(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 3. Create Email Schedules Table
CREATE TABLE email_schedules (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id NUMBER NOT NULL,
    recipient_email VARCHAR2(255) NOT NULL,
    schedule_time VARCHAR2(50),
    frequency VARCHAR2(50),
    status VARCHAR2(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_report FOREIGN KEY (report_id) REFERENCES reports(id)
);

-- 4. Create Master Data Table (for uploads)
CREATE TABLE master_data (
    id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_type VARCHAR2(100) NOT NULL,
    data_key VARCHAR2(255) NOT NULL,
    data_value CLOB,
    uploaded_by NUMBER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 5. Create Indexes for Performance
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_email_schedules_report ON email_schedules(report_id);
CREATE INDEX idx_master_data_type ON master_data(data_type);

-- 6. Insert Default Admin User (password: admin123)
-- Note: You should change this password immediately after first login
INSERT INTO users (username, email, password, role)
VALUES (
    'admin',
    'admin@example.com',
    '$2a$10$YourHashedPasswordHere',
    'admin'
);
COMMIT;
```

**Important**: Replace the hashed password with a real bcrypt hash. Generate one using:

```javascript
const bcrypt = require('bcryptjs');
const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
```

---

## Part 5: Testing and Verification

### Test Backend

1. Visit your Render URL: `https://YOUR_APP.onrender.com`
2. You should see a response (even if it's an error page, it means it's running)
3. Test API endpoints:
   - `GET /api/health` (if you have a health check)
   - `POST /api/auth/login` with test credentials

### Test Frontend

1. Visit your Netlify URL
2. Try to register a new account
3. Log in with credentials
4. Test all major features:
   - Dashboard loads
   - Reports can be created
   - Admin panel works (if admin)
   - File uploads work
   - Email functionality works

### Common Issues

**Issue**: Database connection fails
- **Solution**: Verify wallet files are correctly uploaded and `ORACLE_WALLET_LOCATION` points to the right directory
- Check connection string format
- Ensure database user has necessary privileges

**Issue**: CORS errors
- **Solution**: Verify `FRONTEND_URL` in Render matches your Netlify URL exactly (including https://)
- Check CORS configuration in `server/app.js`

**Issue**: Email not sending
- **Solution**: Verify Gmail app password is correct
- Check "Less secure app access" settings
- Use app-specific password, not regular password

**Issue**: 502 Bad Gateway on Render
- **Solution**: Check Render logs for startup errors
- Verify all environment variables are set
- Ensure wallet extraction succeeded

---

## Part 6: Post-Deployment Security

### 1. Change Default Credentials

Log into the application and:
- Change the default admin password
- Update admin email address
- Create new admin user and delete the default one

### 2. Enable HTTPS

Both Netlify and Render provide free SSL certificates automatically. Ensure:
- All URLs use `https://`
- No mixed content warnings

### 3. Secure Environment Variables

- Never commit `.env` files to Git
- Regularly rotate JWT secrets
- Use strong database passwords
- Keep wallet files secure

### 4. Monitor Application

- Set up Render notifications for deployment failures
- Monitor Netlify build logs
- Check Oracle Cloud metrics for database performance

---

## Part 7: Maintenance and Updates

### Update Frontend

```bash
# Make changes to code
git add .
git commit -m "Update description"
git push origin main

# Netlify auto-deploys on push
```

### Update Backend

```bash
# Same as frontend
git add .
git commit -m "Update description"
git push origin main

# Render auto-deploys on push
```

### Manual Deploy

- **Netlify**: Click "Trigger deploy" in site settings
- **Render**: Click "Manual Deploy" → "Deploy latest commit"

---

## Environment Variable Reference

### Backend (Render)

```env
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
ORACLE_USER=ADMIN
ORACLE_PASSWORD=YourDatabasePassword123!
ORACLE_CONNECTION_STRING=(description=(retry_count=20)(retry_delay=3)(address=(protocol=tcps)(port=1522)(host=your-host.oraclecloud.com))...)
ORACLE_WALLET_LOCATION=/opt/render/project/src/server/wallet
ORACLE_WALLET_PASSWORD=
ORACLE_WALLET_BASE64=<base64-encoded-wallet-content>
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM="Business Reports" <your-email@gmail.com>
FRONTEND_URL=https://your-app.netlify.app
```

### Frontend (Netlify)

```env
VITE_API_URL=https://your-backend.onrender.com
```

---

## Troubleshooting Commands

### Check Backend Logs (Render)

Go to Render Dashboard → Your Service → Logs

### Test Oracle Connection Locally

```javascript
// test-oracle-connection.js
const oracledb = require('oracledb');

async function testConnection() {
  try {
    const connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectionString: process.env.ORACLE_CONNECTION_STRING,
      walletLocation: process.env.ORACLE_WALLET_LOCATION,
      walletPassword: process.env.ORACLE_WALLET_PASSWORD
    });

    console.log('Successfully connected to Oracle Database');
    await connection.close();
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

testConnection();
```

---

## Cost Estimate

- **Render Free Tier**: Free (sleeps after 15 min inactivity)
- **Netlify Free Tier**: Free (100GB bandwidth/month)
- **Oracle Cloud Free Tier**: 2 Autonomous Databases free forever
- **Total**: $0/month on free tiers

**Production Recommendations**:
- Render Starter: $7/month (always on)
- Netlify Pro: $19/month (more bandwidth)
- Oracle Cloud: Free tier sufficient for small/medium apps

---

## Support and Resources

- **Render Docs**: https://render.com/docs
- **Netlify Docs**: https://docs.netlify.com
- **Oracle Node.js**: https://node-oracledb.readthedocs.io
- **Oracle Cloud**: https://docs.oracle.com/en-us/iaas/autonomous-database

---

## Success Checklist

- [ ] Oracle Database configured with all tables
- [ ] Wallet files prepared and encoded
- [ ] Backend deployed to Render
- [ ] All backend environment variables set
- [ ] Backend logs show successful startup
- [ ] Frontend deployed to Netlify
- [ ] Frontend environment variables set
- [ ] Can access frontend URL
- [ ] Can register new user
- [ ] Can login successfully
- [ ] Can create and view reports
- [ ] Admin features working
- [ ] Email notifications sending
- [ ] File uploads working
- [ ] Database queries executing correctly

---

Your application is now globally accessible and connected to a production Oracle database!
