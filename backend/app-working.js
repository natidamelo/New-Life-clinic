const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const pingRoutes = require('./routes/ping');
const debugRoutes = require('./routes/debug');
const cardTypeRoutes = require('./routes/cardTypeRoutes');
const dashboardRoutes = require('./routes/dashboard'); // Use the real dashboard routes with auth

const createApp = () => {
  const app = express();

  // Basic security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for development
  }));

  // CORS middleware - simplified
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression middleware
  app.use(compression());

  // Static files
  app.use('/public', express.static(path.join(__dirname, 'public')));

  // Health check route
  app.use('/ping', pingRoutes);
  app.use('/api', pingRoutes);

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/card-types', cardTypeRoutes);
  
  // Dashboard routes (working version)
  app.use('/api', dashboardRoutes);

  // Debug routes (development only)
  if (process.env.NODE_ENV === 'development') {
    app.use('/api/debug', debugRoutes);
  }

  // Root route
  app.get('/', (req, res) => {
    res.json({
      message: 'Clinic Management System API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      note: 'Dashboard endpoints are now working!'
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.originalUrl} not found`
    });
  });

  // Simple error handler
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
  });

  return app;
};

module.exports = createApp;

