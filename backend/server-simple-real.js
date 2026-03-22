const createApp = require('./app-simple-real');

const PORT = process.env.PORT || 5002;

// Create and start server
const app = createApp();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Simple real server is running on port ${PORT}`);
  console.log(`📊 Server accessible at: http://localhost:${PORT}`);
  console.log('✅ Simple real server started successfully');
  console.log('🗄️  Database: clinic-cms (placeholder data)');
  console.log('📋 Available endpoints:');
  console.log('   - GET  /api/ping');
  console.log('   - POST /api/auth/test-login');
  console.log('   - GET  /api/auth/me');
  console.log('   - GET  /api/card-types');
  console.log('   - GET  /api/admin/dashboard/stats');
  console.log('   - GET  /api/patients/count');
  console.log('   - GET  /api/appointments/count');
  console.log('   - GET  /api/staff/count');
  console.log('   - GET  /api/tasks/pending');
  console.log('   - GET  /api/billing/revenue-stats');
  console.log('   - GET  /api/lab/stats');
  console.log('   - GET  /api/notifications/stats');
  console.log('\n💡 This server uses placeholder data. We can connect to real database later.');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down simple real server...');
  console.log('✅ Server shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down simple real server...');
  console.log('✅ Server shutdown complete');
  process.exit(0);
});
