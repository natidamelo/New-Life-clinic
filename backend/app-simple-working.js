const express = require('express');
const cors = require('cors');

const createApp = () => {
  const app = express();

  // Basic middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check route
  app.get('/ping', (req, res) => {
    res.json({
      message: 'pong',
      timestamp: new Date().toISOString()
    });
  });

  // API health check
  app.get('/api/health', (req, res) => {
    res.json({
      message: 'API is healthy',
      timestamp: new Date().toISOString()
    });
  });

  // API ping endpoint
  app.get('/api/ping', (req, res) => {
    res.json({
      message: 'pong',
      timestamp: new Date().toISOString()
    });
  });

  // Card types endpoint (simplified)
  app.get('/api/card-types', (req, res) => {
    res.json([]);
  });

  // Attendance endpoints
  app.post('/api/attendance/heartbeat', (req, res) => {
    res.json({
      success: true,
      message: 'Heartbeat recorded',
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/attendance/login-activity', (req, res) => {
    res.json({
      success: true,
      message: 'Login activity recorded',
      timestamp: new Date().toISOString()
    });
  });

  // Auth endpoint (simplified) - return proper user structure
  app.get('/api/auth/me', (req, res) => {
    res.json({
      success: true,
      data: {
        _id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  });

  // Test login endpoint - return proper format with data wrapper and valid JWT
  app.post('/api/auth/test-login', (req, res) => {
    // Create a simple JWT-like token (header.payload.signature)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    })).toString('base64');
    const signature = 'test-signature';
    const jwtToken = `${header}.${payload}.${signature}`;

    res.json({
      success: true,
      message: 'Test login successful',
      data: {
        token: jwtToken,
        user: {
          _id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    });
  });

  // Regular login endpoint
  app.post('/api/auth/login', (req, res) => {
    // Create a simple JWT-like token (header.payload.signature)
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      userId: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    })).toString('base64');
    const signature = 'test-signature';
    const jwtToken = `${header}.${payload}.${signature}`;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token: jwtToken,
        user: {
          _id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    });
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  });

  // Users endpoint
  app.get('/api/users', (req, res) => {
    res.json({
      success: true,
      data: [
        {
          _id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin',
          isActive: true
        }
      ]
    });
  });

  // Root route
  app.get('/', (req, res) => {
    res.json({
      message: 'Clinic Management System API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      note: 'Simplified version for testing'
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
