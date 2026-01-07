# Visual Studio Code Setup Guide with Supabase

This guide provides step-by-step instructions to run the Business Reporting Manager application in Visual Studio Code with Supabase database.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18.0 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Visual Studio Code** - [Download here](https://code.visualstudio.com/)
- **Git** (optional, for version control)

## Step 1: Open Project in VS Code

1. Launch Visual Studio Code
2. Click **File** → **Open Folder**
3. Navigate to your project folder and open it
4. Alternatively, you can open VS Code from terminal:
   ```bash
   cd /path/to/your/project
   code .
   ```

## Step 2: Install Dependencies

1. Open the integrated terminal in VS Code:
   - Press **Ctrl + `** (backtick) or
   - Go to **Terminal** → **New Terminal**

2. Install project dependencies:
   ```bash
   npm install
   ```

3. Wait for all packages to be installed (this may take a few minutes)

## Step 3: Supabase Configuration

Your project is already connected to Supabase. The configuration is stored in the `.env` file.

### Current Supabase Settings

The `.env` file contains:
```env
VITE_SUPABASE_URL=https://ykmczghsytgpkayhkmsp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Understanding the Environment Variables

- **VITE_SUPABASE_URL**: Your Supabase project URL
- **VITE_SUPABASE_ANON_KEY**: Public anonymous key for client-side operations

### If You Need to Connect to a Different Supabase Project

1. Log in to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project or select an existing one
3. Go to **Project Settings** → **API**
4. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key
5. Update your `.env` file:
   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## Step 4: Database Setup (Supabase)

Your Supabase database needs the following tables:

### Tables Created by Migrations

The application uses these main tables:
- **users** - User accounts and authentication
- **instant_reports** - Instant report definitions
- **auto_mail_reports** - Scheduled email reports
- **master_upload_configs** - Configuration for bulk uploads
- **resource_access** - Access control for reports
- **activity_logs** - User activity tracking

### Apply Migrations

All database migrations are located in `/supabase/migrations/`. To apply them:

1. **Option A: Using Supabase Dashboard**
   - Go to [Supabase Dashboard](https://app.supabase.com/)
   - Select your project
   - Go to **SQL Editor**
   - Copy the content from each migration file in order
   - Execute each migration

2. **Option B: Using Supabase CLI** (if installed)
   ```bash
   supabase db push
   ```

### Verify Database Setup

1. Go to Supabase Dashboard → **Table Editor**
2. You should see all the tables listed above
3. Check that sample data exists in the `users` table

## Step 5: Default Admin Account

The application comes with default login credentials:

- **Username**: `admin`
- **Password**: `admin123`

**Important**: Change this password after first login for security.

## Step 6: Run the Application

1. In VS Code terminal, start the development server:
   ```bash
   npm run dev
   ```

2. You should see output like:
   ```
   VITE v5.4.21  ready in 500 ms

   ➜  Local:   http://localhost:5173/
   ➜  Network: use --host to expose
   ```

3. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

4. You should see the login page

## Step 7: Login and Test

1. Enter the default credentials:
   - Username: `admin`
   - Password: `admin123`

2. Click **Login**

3. You should be redirected to the Dashboard

## Recommended VS Code Extensions

Install these extensions for better development experience:

1. **ES7+ React/Redux/React-Native snippets** - Code snippets
2. **Tailwind CSS IntelliSense** - Tailwind autocomplete
3. **ESLint** - Code linting
4. **Prettier** - Code formatting
5. **TypeScript Vue Plugin (Volar)** - TypeScript support

To install:
1. Press **Ctrl + Shift + X** to open Extensions
2. Search for each extension
3. Click **Install**

## Common Issues and Solutions

### Issue 1: Port Already in Use

**Error**: `Port 5173 is already in use`

**Solution**:
```bash
# Kill the process using port 5173
# On Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# On Mac/Linux:
lsof -ti:5173 | xargs kill -9
```

### Issue 2: Missing Environment Variables

**Error**: `Missing Supabase environment variables`

**Solution**:
1. Make sure `.env` file exists in project root
2. Verify it contains both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Restart the development server

### Issue 3: Database Connection Failed

**Error**: Database operations failing

**Solution**:
1. Check Supabase Dashboard is accessible
2. Verify your project URL is correct
3. Ensure all migrations are applied
4. Check Row Level Security (RLS) policies are configured

### Issue 4: Cannot Login

**Error**: Login fails even with correct credentials

**Solution**:
1. Check Supabase Dashboard → Table Editor → `users` table
2. Verify admin user exists
3. Check browser console for errors (F12)
4. Ensure RLS policies allow access

## Project Structure

```
business-reporting-manager/
├── src/                        # Frontend source code
│   ├── components/            # React components
│   │   ├── Admin/            # Admin-only components
│   │   ├── Auth/             # Login/Register components
│   │   ├── Dashboard/        # Dashboard components
│   │   ├── Layout/           # Layout components
│   │   └── Reports/          # Report components
│   ├── contexts/             # React Context (Auth)
│   ├── hooks/                # Custom React hooks
│   ├── services/             # API services & Supabase client
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
├── supabase/
│   ├── migrations/           # Database migrations
│   └── functions/            # Edge Functions
├── .env                      # Environment variables (Supabase config)
├── package.json              # Dependencies
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
└── tailwind.config.js       # Tailwind CSS configuration
```

## Available Scripts

Run these commands in the VS Code terminal:

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Supabase Features Used

This application uses the following Supabase features:

1. **Database**: PostgreSQL with Row Level Security (RLS)
2. **Authentication**: Custom auth using Supabase tables
3. **Edge Functions**:
   - `send-report-email` - Send email reports
   - `process-scheduled-reports` - Process scheduled reports
4. **Storage**: (Optional) For file uploads

## Next Steps

After successfully running the application:

1. **Change Default Password**: Go to User Profile and update password
2. **Create Users**: Go to Admin → User Management
3. **Set Up Reports**: Configure Instant Reports or Auto Mail Reports
4. **Configure Access Control**: Manage user permissions
5. **Test Features**: Try creating and running reports

## Support

If you encounter any issues:

1. Check the browser console (F12) for errors
2. Check VS Code terminal for server errors
3. Review Supabase Dashboard logs
4. Check the migration files for database schema
5. Refer to `README.md` for additional documentation

## Security Notes

- **Never commit `.env` file** to version control
- **Change default passwords** immediately
- **Use strong passwords** for production
- **Enable RLS policies** for all tables
- **Regularly update dependencies** for security patches

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
