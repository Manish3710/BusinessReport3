# VS Code Setup Guide for Oracle Reporting System

## Prerequisites

Before setting up the project in VS Code, ensure you have:

1. **Node.js 18+** installed
2. **Oracle Database** (Express Edition or higher)
3. **Oracle Instant Client** installed
4. **Git** (optional, for version control)

## VS Code Extensions (Recommended)

Install these extensions for the best development experience:

### Essential Extensions:
```
1. ES7+ React/Redux/React-Native snippets
2. TypeScript Importer
3. Prettier - Code formatter
4. ESLint
5. Auto Rename Tag
6. Bracket Pair Colorizer
7. GitLens
8. Thunder Client (for API testing)
9. Oracle Developer Tools for VS Code
10. SQL Tools
```

### Install Extensions via Command Palette:
```
Ctrl+Shift+P → Extensions: Install Extensions
```

## Project Setup in VS Code

### 1. Clone/Download Project
```bash
# If using Git
git clone <your-repository-url>
cd oracle-reporting-system

# Or download and extract the project files
```

### 2. Open in VS Code
```bash
code .
```

### 3. Install Dependencies

Open VS Code terminal (`Ctrl+`` `) and run:

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 4. Configure Environment Variables

Create environment files:

#### Frontend (.env):
```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=Oracle Reports
VITE_APP_VERSION=1.0.0
```

#### Backend (server/.env):
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_USER=ENTERPRISE_USER
DB_PASSWORD=your_oracle_password
DB_CONNECT_STRING=localhost:1521/XE

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.xlsx,.xls,.csv
```

### 5. VS Code Workspace Configuration

Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  },
  "files.associations": {
    "*.sql": "sql"
  }
}
```

Create `.vscode/launch.json` for debugging:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/server/app.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "node"
    }
  ]
}
```

Create `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Frontend",
      "type": "shell",
      "command": "npm run dev",
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      }
    },
    {
      "label": "Start Backend",
      "type": "shell",
      "command": "npm start",
      "options": {
        "cwd": "${workspaceFolder}/server"
      },
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      }
    }
  ]
}
```

## Database Setup

### 1. Oracle Database Installation

#### Option A: Oracle Database Express Edition (Recommended for Development)
1. Download from Oracle website
2. Install with default settings
3. Set database password
4. Default connection: `localhost:1521/XE`

#### Option B: Oracle Database in Docker
```bash
docker run -d --name oracle-xe \
  -p 1521:1521 \
  -p 5500:5500 \
  -e ORACLE_PWD=your_password \
  -e ORACLE_CHARACTERSET=AL32UTF8 \
  gvenzl/oracle-xe:latest
```

### 2. Oracle Instant Client Setup

#### Windows:
1. Download Oracle Instant Client
2. Extract to `C:\oracle\instantclient_19_3`
3. Add to PATH environment variable
4. Set `OCI_LIB_DIR=C:\oracle\instantclient_19_3`

#### macOS:
```bash
brew tap InstantClientTap/instantclient
brew install instantclient-basic
```

#### Linux:
```bash
# Download and install instant client
wget https://download.oracle.com/otn_software/linux/instantclient/instantclient-basic-linux.x64-19.3.0.0.0dbru.zip
unzip instantclient-basic-linux.x64-19.3.0.0.0dbru.zip
sudo mv instantclient_19_3 /opt/oracle/
echo 'export LD_LIBRARY_PATH=/opt/oracle/instantclient_19_3:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc
```

### 3. Database Schema Setup

Execute the SQL files in order:
1. `supabase/migrations/20250628131745_dark_leaf.sql` - Tables and user
2. `supabase/migrations/20250628131817_lucky_grass.sql` - Stored procedures
3. `supabase/migrations/20250628131859_dry_king.sql` - Sample data

## Running the Application in VS Code

### Method 1: Using VS Code Tasks
1. `Ctrl+Shift+P` → "Tasks: Run Task"
2. Select "Start Backend" (runs in one terminal)
3. Select "Start Frontend" (runs in another terminal)

### Method 2: Using Integrated Terminal
```bash
# Terminal 1: Backend
cd server
npm start

# Terminal 2: Frontend (new terminal)
npm run dev
```

### Method 3: Using VS Code Debugger
1. Go to Run and Debug (`Ctrl+Shift+D`)
2. Select "Launch Backend"
3. Press F5 to start debugging
4. Open new terminal for frontend: `npm run dev`

## Development Workflow

### 1. File Structure in VS Code
```
oracle-reporting-system/
├── 📁 src/                    # Frontend React app
│   ├── 📁 components/         # React components
│   ├── 📁 contexts/          # React contexts
│   ├── 📁 types/             # TypeScript types
│   └── 📄 App.tsx            # Main app component
├── 📁 server/                # Backend Node.js app
│   ├── 📁 config/            # Database & email config
│   ├── 📁 routes/            # API routes
│   └── 📄 app.js             # Server entry point
├── 📁 supabase/migrations/   # Database schema
├── 📄 package.json           # Frontend dependencies
└── 📄 README.md              # Project documentation
```

### 2. Code Navigation Tips
- `Ctrl+P` - Quick file search
- `Ctrl+Shift+F` - Search across all files
- `F12` - Go to definition
- `Shift+F12` - Find all references
- `Ctrl+D` - Select next occurrence

### 3. Debugging
- Set breakpoints by clicking line numbers
- Use `console.log()` for quick debugging
- Check VS Code Debug Console for output
- Use Thunder Client extension for API testing

## Connecting to Real Database

### 1. Update Database Configuration
Edit `server/.env`:
```env
# For local Oracle DB
DB_CONNECT_STRING=localhost:1521/XE

# For remote Oracle DB
DB_CONNECT_STRING=your-server:1521/your-service

# For Oracle Cloud
DB_CONNECT_STRING=your-cloud-connection-string
```

### 2. Test Database Connection
Create a test file `server/test-db.js`:
```javascript
const { initialize, executeQuery, close } = require('./config/database');

async function testConnection() {
  try {
    await initialize();
    console.log('✅ Database connected successfully');
    
    const result = await executeQuery('SELECT * FROM USERS WHERE ROWNUM <= 5');
    console.log('📊 Sample data:', result.rows);
    
    await close();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testConnection();
```

Run test: `node server/test-db.js`

### 3. Email Configuration
For Gmail (recommended for testing):
1. Enable 2-Factor Authentication
2. Generate App Password:
   - Google Account → Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in `SMTP_PASS`

## Troubleshooting in VS Code

### Common Issues:

#### 1. Oracle Connection Error
```
Error: Oracle client library is not found
```
**Solution**: Ensure Oracle Instant Client is in PATH

#### 2. Node Modules Issues
```
Module not found
```
**Solution**: 
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 3. TypeScript Errors
**Solution**: 
- `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
- Check `tsconfig.json` configuration

#### 4. Port Already in Use
```
EADDRINUSE: address already in use :::3001
```
**Solution**:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <process_id> /F

# macOS/Linux
lsof -ti:3001 | xargs kill -9
```

## VS Code Shortcuts for This Project

### Essential Shortcuts:
- `Ctrl+`` ` - Toggle terminal
- `Ctrl+Shift+`` ` - New terminal
- `Ctrl+B` - Toggle sidebar
- `Ctrl+J` - Toggle panel
- `Ctrl+Shift+E` - Explorer
- `Ctrl+Shift+G` - Source control
- `Ctrl+Shift+D` - Debug
- `Ctrl+Shift+X` - Extensions

### Development Shortcuts:
- `Ctrl+S` - Save (auto-formats with Prettier)
- `Ctrl+Shift+P` - Command palette
- `F5` - Start debugging
- `Ctrl+F5` - Run without debugging
- `Shift+F5` - Stop debugging

## Production Deployment from VS Code

### 1. Build for Production
```bash
# Frontend build
npm run build

# Backend is ready as-is
```

### 2. Deploy Options
- **Frontend**: Netlify, Vercel, AWS S3
- **Backend**: Heroku, AWS EC2, DigitalOcean
- **Database**: Oracle Cloud, AWS RDS

### 3. Environment Variables for Production
Update production environment with secure values:
- Strong JWT secret
- Production database credentials
- Production email settings
- HTTPS URLs

## Additional Resources

### Documentation:
- [Oracle Database Documentation](https://docs.oracle.com/database/)
- [Node.js Oracle Driver](https://oracle.github.io/node-oracledb/)
- [React Documentation](https://react.dev/)
- [VS Code Documentation](https://code.visualstudio.com/docs)

### Useful VS Code Extensions for Oracle Development:
- Oracle Developer Tools for VS Code
- SQL Tools
- Database Client JDBC
- REST Client (alternative to Thunder Client)

This setup guide should get you up and running with the Oracle Reporting System in VS Code! 🚀