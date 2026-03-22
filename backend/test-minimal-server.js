const express = require('express');
const app = express();

// Basic middleware
app.use(express.json());

// Simple test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

// Start server
const PORT = 5004;
app.listen(PORT, () => {
  console.log(`Minimal test server running on port ${PORT}`);
  console.log(`Test: http://localhost:${PORT}/test`);
});
