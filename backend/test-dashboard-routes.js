const express = require('express');
const app = express();

// Import the dashboard routes
const dashboardRoutes = require('./routes/dashboard');

// Basic middleware
app.use(express.json());

// Mount the dashboard routes
app.use('/api', dashboardRoutes);

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

// Start server
const PORT = 5003;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log('Test the endpoints:');
  console.log(`http://localhost:${PORT}/test`);
  console.log(`http://localhost:${PORT}/api/patients/count`);
});
