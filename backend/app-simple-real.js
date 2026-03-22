const express = require('express');
const cors = require('cors');

const createApp = () => {
  const app = express();

  // Basic CORS setup
  app.use(cors());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Simple ping endpoint
  app.get('/api/ping', (req, res) => {
    res.json({
      success: true,
      message: 'Simple real server is running',
      timestamp: new Date().toISOString(),
      database: 'clinic-cms (ready to connect)'
    });
  });

  // Auth endpoints (placeholder)
  app.post('/api/auth/test-login', (req, res) => {
    const { identifier, password } = req.body;
    
    if (identifier && password) {
      const mockUser = {
        _id: '123456789',
        username: identifier,
        email: identifier,
        role: 'admin',
        name: 'Test User'
      };
      
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJyb2xlIjoiYWRtaW4iLCJuYW1lIjoiVGVzdCBVc2VyIiwiZW1haWwiOiJhZG1pbkBjbGluaWMuY29tIiwiaWF0IjoxNTE2MjM5MDIyfQ.L8i6g3PfcHlioHCCPURC9pmLS-C-7PRYieLP602Z5bQ';
      
      res.json({
        success: true,
        message: 'Test login successful',
        data: { user: mockUser, token: mockToken }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Identifier and password are required'
      });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const mockUser = {
      _id: '123456789',
      username: 'admin@clinic.com',
      email: 'admin@clinic.com',
      role: 'admin',
      name: 'Test User'
    };
    
    res.json({
      success: true,
      data: mockUser
    });
  });

  // Card types endpoint
  app.get('/api/card-types', (req, res) => {
    res.json({
      success: true,
      data: [
        { id: 1, name: 'Standard', description: 'Standard patient card' },
        { id: 2, name: 'VIP', description: 'VIP patient card' },
        { id: 3, name: 'Emergency', description: 'Emergency patient card' }
      ]
    });
  });

  // Dashboard stats endpoints (placeholder data)
  app.get('/api/admin/dashboard/stats', (req, res) => {
    res.json({
      success: true,
      data: {
        totalPatients: 1250,
        totalAppointments: 89,
        totalStaff: 45,
        pendingTasks: 23,
        revenue: 125000,
        labTests: 156,
        notifications: 8
      }
    });
  });

  // Individual count endpoints (placeholder data)
  app.get('/api/patients/count', (req, res) => {
    res.json({
      success: true,
      data: { count: 1250 }
    });
  });

  app.get('/api/appointments/count', (req, res) => {
    res.json({
      success: true,
      data: { count: 89 }
    });
  });

  app.get('/api/staff/count', (req, res) => {
    res.json({
      success: true,
      data: { count: 45 }
    });
  });

  app.get('/api/tasks/pending', (req, res) => {
    res.json({
      success: true,
      data: { count: 23 }
    });
  });

  app.get('/api/billing/revenue-stats', (req, res) => {
    res.json({
      success: true,
      data: { revenue: 125000 }
    });
  });

  app.get('/api/lab/stats', (req, res) => {
    res.json({
      success: true,
      data: { tests: 156 }
    });
  });

  app.get('/api/notifications/stats', (req, res) => {
    res.json({
      success: true,
      data: { count: 8 }
    });
  });

  // Attendance endpoints
  app.post('/api/attendance/login-activity', (req, res) => {
    res.json({
      success: true,
      message: 'Login activity recorded'
    });
  });

  app.post('/api/attendance/logout-activity', (req, res) => {
    res.json({
      success: true,
      message: 'Logout activity recorded'
    });
  });

  app.post('/api/attendance/heartbeat', (req, res) => {
    res.json({
      success: true,
      message: 'Heartbeat recorded'
    });
  });

  // Admin settings endpoints
  app.get('/api/admin/auto-clockout-setting', (req, res) => {
    res.json({
      success: true,
      data: {
        enabled: true,
        timeoutMinutes: 30
      }
    });
  });

  // Root route
  app.get('/', (req, res) => {
    res.json({
      message: 'Clinic Management System API (Simple Real)',
      version: '1.0.0',
      status: 'running',
      database: 'clinic-cms (placeholder data)',
      timestamp: new Date().toISOString(),
      endpoints: [
        '/api/ping',
        '/api/auth/test-login',
        '/api/auth/me',
        '/api/card-types',
        '/api/admin/dashboard/stats',
        '/api/patients/count',
        '/api/appointments/count',
        '/api/staff/count',
        '/api/tasks/pending',
        '/api/billing/revenue-stats',
        '/api/lab/stats',
        '/api/notifications/stats',
        '/api/attendance/*',
        '/api/admin/auto-clockout-setting'
      ]
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.originalUrl} not found`
    });
  });

  return app;
};

module.exports = createApp;
