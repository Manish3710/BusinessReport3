const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for development
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', /\.webcontainer-api\.io$/],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Mock data for development
const mockUsers = [
  { id: 1, username: 'admin', email: 'admin@company.com', role: 'admin' },
  { id: 2, username: 'user', email: 'user@company.com', role: 'user' }
];

const mockReports = {
  instant: [],
  autoMail: []
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'development',
    database: 'mock',
    memory: process.memoryUsage()
  });
});

// Auth routes (mock)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  if ((username === 'admin' && password === 'admin123') || 
      (username === 'user' && password === 'user123')) {
    const user = mockUsers.find(u => u.username === username);
    res.json({
      success: true,
      user,
      token: 'mock-jwt-token'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

// Reports routes
app.get('/api/reports/instant', (req, res) => {
  res.json({ reports: mockReports.instant });
});

app.post('/api/reports/instant', (req, res) => {
  const report = {
    id: Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
    status: 'completed'
  };
  
  mockReports.instant.push(report);
  res.json({ success: true, report });
});

app.get('/api/reports/auto-mail', (req, res) => {
  res.json({ reports: mockReports.autoMail });
});

app.post('/api/reports/auto-mail', (req, res) => {
  const report = {
    id: Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  
  mockReports.autoMail.push(report);
  res.json({ success: true, report });
});

// Admin routes
app.get('/api/admin/stats', (req, res) => {
  res.json({
    totalReports: mockReports.instant.length + mockReports.autoMail.length,
    totalUsers: mockUsers.length,
    activeReports: mockReports.autoMail.filter(r => r.status === 'active').length,
    systemHealth: 'good'
  });
});

app.get('/api/admin/users', (req, res) => {
  res.json({ users: mockUsers });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Development server running on port ${PORT}`);
  console.log(`📊 Environment: development (mock data)`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  console.log(`💾 Database: Mock data (no Oracle connection required)`);
  console.log(`📧 Email: Disabled for development`);
  console.log(`\n✅ Backend is ready! Your frontend should now connect successfully.`);
});

module.exports = app;