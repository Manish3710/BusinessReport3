const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { setupWallet } = require('./setup-wallet');
const { initialize: initializeDB, close: closeDB } = require('./config/database');
const { verifyEmailConfig } = require('./config/email');

// Import routes
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const { executeQuery } = require('./config/database');
    await executeQuery('SELECT 1 FROM DUAL');
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: 'connected',
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: 'disconnected'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await closeDB();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    console.log('🔧 Starting server initialization...');

    if (process.env.ORACLE_WALLET_BASE64) {
      console.log('🔑 Setting up Oracle wallet from base64...');
      await setupWallet();
      console.log('✅ Oracle wallet setup complete');
    }

    console.log('🔌 Connecting to database...');
    await initializeDB();
    console.log('✅ Database connection established');

    console.log('📧 Verifying email configuration...');
    const emailVerified = await verifyEmailConfig();
    if (emailVerified) {
      console.log('✅ Email service configured successfully');
    } else {
      console.log('⚠️  Email service configuration failed - check your SMTP settings');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
      console.log(`💾 Database: ${process.env.ORACLE_CONNECTION_STRING || process.env.DB_CONNECT_STRING}`);
      console.log(`📧 Email: ${process.env.EMAIL_USER || process.env.SMTP_USER}`);
      console.log(`🌐 CORS allowed origins: ${allowedOrigins.join(', ')}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

startServer();

module.exports = app;