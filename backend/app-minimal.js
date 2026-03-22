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
      message: 'Minimal server is running',
      timestamp: new Date().toISOString()
    });
  });

  // Root route
  app.get('/', (req, res) => {
    res.json({
      message: 'Clinic Management System API (Minimal)',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString()
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
