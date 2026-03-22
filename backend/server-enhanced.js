const createApp = require('./app-enhanced');

const PORT = process.env.PORT || 5002;

// Create and start server
const app = createApp();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Enhanced server is running on port ${PORT}`);
  console.log(`Server accessible at: http://localhost:${PORT}`);
  console.log('✅ Enhanced server started successfully');
  console.log('📋 Available endpoints:');
  console.log('   - GET  /api/ping');
  console.log('   - POST /api/auth/test-login');
  console.log('   - GET  /api/auth/me');
  console.log('   - GET  /api/card-types');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down enhanced server...');
  process.exit(0);
});
