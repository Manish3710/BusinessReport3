# Quick Start Guide

Get the Business Reporting Manager running in 5 minutes!

## Prerequisites Check

Make sure you have Node.js installed:
```bash
node --version
# Should show v18.0.0 or higher
```

If not installed, download from: https://nodejs.org/

## Steps to Run

### 1. Install Dependencies

Open terminal in VS Code (Ctrl + `) and run:
```bash
npm install
```

Wait for installation to complete (2-3 minutes).

### 2. Start the Application

```bash
npm run dev
```

You should see:
```
➜  Local:   http://localhost:5173/
```

### 3. Open in Browser

Open your browser and go to:
```
http://localhost:5173
```

### 4. Login

Use the default credentials:
- **Username**: admin
- **Password**: admin123

That's it! You're now in the application.

## Supabase Connection

The application is already connected to Supabase. Your `.env` file contains:

```
VITE_SUPABASE_URL=https://ykmczghsytgpkayhkmsp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

No additional setup needed!

## What's Next?

After logging in, you can:

1. **Instant Reports** - Create and run on-demand reports
2. **Auto Mail Reports** - Schedule automated email reports
3. **Master Upload** - Bulk upload data to database
4. **User Management** - Create new users (Admin only)
5. **Access Control** - Manage permissions (Admin only)

## Need Help?

For detailed setup instructions, see:
- `VSCODE_SUPABASE_SETUP.md` - Complete VS Code + Supabase guide
- `README.md` - Project overview and features

## Common Issues

**Port already in use?**
```bash
# The dev server will automatically try the next available port
# Or manually kill the process using port 5173
```

**Cannot login?**
- Make sure you typed credentials correctly
- Check browser console for errors (Press F12)
- Verify Supabase connection in `.env` file

**Module not found errors?**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

## Stop the Application

Press **Ctrl + C** in the terminal where the dev server is running.

## Access Supabase Dashboard

To view or manage your database:

1. Go to: https://app.supabase.com/
2. Login with your Supabase account
3. Select your project
4. Use **Table Editor** to view data
5. Use **SQL Editor** to run queries

Your project URL: `https://ykmczghsytgpkayhkmsp.supabase.co`
