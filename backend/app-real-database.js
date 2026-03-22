const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import routes
const authRoutes = require('./routes/auth');

// Import only existing models
const User = require('./models/User');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');
const BillingInvoice = require('./models/BillingInvoice');
const LabTest = require('./models/LabTest');
const Notification = require('./models/Notification');
const NurseTask = require('./models/NurseTask');

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
      message: 'Real database server is running',
      timestamp: new Date().toISOString(),
      database: 'clinic-cms'
    });
  });

  // Use real auth routes
  app.use('/api/auth', authRoutes);

  // Card types endpoint (placeholder)
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

  // Real dashboard stats from database
  app.get('/api/admin/dashboard/stats', async (req, res) => {
    try {
      const [
        totalPatients,
        totalAppointments,
        totalStaff,
        pendingTasks,
        totalRevenue,
        labTests,
        notifications
      ] = await Promise.all([
        Patient.countDocuments(),
        Appointment.countDocuments(),
        User.countDocuments({ role: { $in: ['doctor', 'nurse', 'admin', 'receptionist'] } }),
        NurseTask.countDocuments({ status: 'pending' }),
        BillingInvoice.aggregate([
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        LabTest.countDocuments(),
        Notification.countDocuments({ read: false })
      ]);

      res.json({
        success: true,
        data: {
          totalPatients: totalPatients || 0,
          totalAppointments: totalAppointments || 0,
          totalStaff: totalStaff || 0,
          pendingTasks: pendingTasks || 0,
          revenue: totalRevenue[0]?.total || 0,
          labTests: labTests || 0,
          notifications: notifications || 0
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching dashboard statistics'
      });
    }
  });

  // Real patient count
  app.get('/api/patients/count', async (req, res) => {
    try {
      const count = await Patient.countDocuments();
      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching patient count'
      });
    }
  });

  // Real appointment count
  app.get('/api/appointments/count', async (req, res) => {
    try {
      const count = await Appointment.countDocuments();
      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching appointment count'
      });
    }
  });

  // Real staff count (using User model with role filter)
  app.get('/api/staff/count', async (req, res) => {
    try {
      const count = await User.countDocuments({ 
        role: { $in: ['doctor', 'nurse', 'admin', 'receptionist'] } 
      });
      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching staff count'
      });
    }
  });

  // Real pending tasks count (using NurseTask model)
  app.get('/api/tasks/pending', async (req, res) => {
    try {
      const count = await NurseTask.countDocuments({ status: 'pending' });
      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching pending tasks count'
      });
    }
  });

  // Real billing revenue stats
  app.get('/api/billing/revenue-stats', async (req, res) => {
    try {
      const result = await BillingInvoice.aggregate([
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
      ]);
      res.json({
        success: true,
        data: { revenue: result[0]?.revenue || 0 }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching revenue stats'
      });
    }
  });

  // Real lab stats
  app.get('/api/lab/stats', async (req, res) => {
    try {
      const tests = await LabTest.countDocuments();
      res.json({
        success: true,
        data: { tests }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching lab stats'
      });
    }
  });

  // Real notifications stats
  app.get('/api/notifications/stats', async (req, res) => {
    try {
      const count = await Notification.countDocuments({ read: false });
      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching notifications stats'
      });
    }
  });

  // Attendance endpoints (placeholder for now)
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
      message: 'Clinic Management System API (Real Database)',
      version: '1.0.0',
      status: 'running',
      database: 'clinic-cms',
      timestamp: new Date().toISOString(),
      endpoints: [
        '/api/ping',
        '/api/auth/*',
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
