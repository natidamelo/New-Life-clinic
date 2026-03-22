const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Simple test route
app.get('/test', (req, res) => {
  res.json({ message: 'Express server working!' });
});

// Test the dashboard routes (no auth version)
const dashboardRoutes = require('./routes/dashboard-no-auth');
app.use('/api', dashboardRoutes);

// Start server
const PORT = 5005;
app.listen(PORT, () => {
  console.log(`Simple test server running on port ${PORT}`);
  console.log(`Test: http://localhost:${PORT}/test`);
  console.log(`Dashboard: http://localhost:${PORT}/api/patients/count`);
});
