const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5002;

// Middleware
app.use(cors({
  origin: ['http://192.168.78.157:5175', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check endpoints
app.get('/ping', (req, res) => {
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Auth endpoints
app.post('/api/auth/test-login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple mock authentication
  if (email === 'admin@clinic.com' && password === 'admin123') {
    res.json({
      success: true,
      data: {
        token: 'mock-jwt-token-' + Date.now(),
        user: {
          id: '1',
          email: 'admin@clinic.com',
          name: 'Admin User',
          role: 'admin'
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple mock authentication
  if (email === 'admin@clinic.com' && password === 'admin123') {
    res.json({
      success: true,
      data: {
        token: 'mock-jwt-token-' + Date.now(),
        user: {
          id: '1',
          email: 'admin@clinic.com',
          name: 'Admin User',
          role: 'admin'
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Card types endpoint
app.get('/api/card-types', (req, res) => {
  res.json([
    { id: 1, name: 'Insurance', description: 'Insurance card' },
    { id: 2, name: 'Cash', description: 'Cash payment' },
    { id: 3, name: 'Credit', description: 'Credit card' }
  ]);
});

// Mock appointments endpoint
app.get('/api/appointments', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        patientName: 'John Doe',
        doctorName: 'Dr. Smith',
        date: '2025-07-12T10:00:00Z',
        status: 'scheduled'
      }
    ]
  });
});

// Mock patients endpoint
app.get('/api/patients', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890'
      }
    ]
  });
});

// Catch-all for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Minimal backend server running on port ${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎯 Frontend should connect to: http://localhost:${PORT}`);
});

module.exports = app; 