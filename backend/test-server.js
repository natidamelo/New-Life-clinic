const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

// Test endpoint
app.get('/api/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Test server is running',
    timestamp: new Date().toISOString(),
    port: 3001
  });
});

// Simple auth test
app.post('/api/auth/test-login', (req, res) => {
  const { identifier, password } = req.body;
  
  console.log('Login attempt:', { identifier, password });
  
  if (identifier === 'DR Natan' && password === 'doctor123') {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: '123456789',
          username: 'DR Natan',
          email: 'doctor@clinic.com',
          role: 'doctor'
        },
        token: 'test-token-12345'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TEST SERVER running on port ${PORT}`);
  console.log(`🌐 Accessible at: http://localhost:${PORT}`);
  console.log(`🌐 Network accessible at: http://10.41.144.157:${PORT}`);
});
