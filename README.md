# Oracle Database Reporting System

A comprehensive web application for automated email reporting, instant report generation, and bulk data uploads using Oracle Database.

## 🚀 Features

- **Auto Mail Reports**: Schedule automated email reports with Excel attachments
- **Instant Reports**: Generate on-demand reports with date filtering
- **Master Upload**: Bulk upload data to database tables with validation
- **User Management**: Role-based access control (Admin/User)
- **Access Control**: Granular permissions for reports and uploads
- **Database Administration**: System monitoring and maintenance tools

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons
- **Vite** for build tooling

### Backend
- **Node.js** with Express
- **Oracle Database** (11g or higher)
- **JWT** for authentication
- **Nodemailer** for email sending
- **XLSX** for Excel file processing
- **Multer** for file uploads

## 📋 Prerequisites

- Node.js 18.0 or higher
- npm 8.0 or higher
- Oracle Database 11g or higher
- Oracle Instant Client 19.3 or higher

## 🔧 Installation

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/oracle-reporting-system.git
cd oracle-reporting-system
```

### 2. Install dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 3. Set up Oracle Database
Follow the detailed setup guide in `SETUP_GUIDE.md` to:
- Install Oracle Database
- Create application user and tables
- Set up stored procedures
- Insert sample data

### 4. Configure environment variables
```bash
# Copy environment template
cp .env.example .env
cp server/.env.example server/.env

# Edit the files with your actual configuration
```

### 5. Start the application
```bash
# Start backend server
cd server
npm start

# In another terminal, start frontend
npm run dev
```

## 🔐 Default Login Credentials

- **Admin**: username: `admin`, password: `admin123`
- **User**: username: `user`, password: `user123`

## 📁 Project Structure

```
oracle-reporting-system/
├── src/                    # Frontend React application
│   ├── components/         # React components
│   ├── contexts/          # React contexts
│   ├── types/             # TypeScript type definitions
│   └── services/          # API services
├── server/                # Backend Node.js application
│   ├── config/            # Database and email configuration
│   ├── middleware/        # Authentication middleware
│   ├── routes/            # API routes
│   └── app.js            # Express server entry point
├── supabase/migrations/   # Database schema and procedures
└── SETUP_GUIDE.md        # Detailed setup instructions
```

## 🚀 Deployment

### Frontend (Netlify)
The frontend is deployed automatically to Netlify. For manual deployment:

```bash
npm run build
# Deploy the dist/ folder to your hosting provider
```

### Backend (Your choice)
Deploy the server folder to your preferred hosting service:
- Heroku
- AWS EC2
- DigitalOcean
- Your own server

## 📖 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/verify` - Verify JWT token

### Reports
- `GET /api/reports/auto-mail` - Get auto mail reports
- `POST /api/reports/auto-mail` - Create auto mail report
- `POST /api/reports/auto-mail/:id/run` - Run report now
- `GET /api/reports/instant` - Get instant reports
- `POST /api/reports/instant` - Create instant report
- `POST /api/reports/instant/:id/execute` - Execute instant report

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Input validation and sanitization
- SQL injection prevention
- File upload restrictions
- Rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in this repository
- Check the `SETUP_GUIDE.md` for detailed setup instructions
- Review the troubleshooting section in the setup guide

## 🙏 Acknowledgments

- Oracle Database for robust data management
- React community for excellent frontend tools
- Node.js ecosystem for backend capabilities