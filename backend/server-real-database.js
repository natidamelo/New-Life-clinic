const createApp = require('./app-real-database');
const mongoose = require('mongoose');
require('dotenv').config();

const PORT = process.env.PORT || 5002;

// Connect to MongoDB clinic-cms database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms')
  .then(() => {
    console.log('✅ Connected to MongoDB clinic-cms database');
    
    // Create and start server
    const app = createApp();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Real database server is running on port ${PORT}`);
      console.log(`📊 Server accessible at: http://localhost:${PORT}`);
      console.log('✅ Real database server started successfully');
      console.log('🗄️  Database: clinic-cms');
      console.log('📋 Available endpoints:');
      console.log('   - GET  /api/ping');
      console.log('   - POST /api/auth/test-login');
      console.log('   - GET  /api/auth/me');
      console.log('   - GET  /api/card-types');
      console.log('   - GET  /api/admin/dashboard/stats (REAL DATA)');
      console.log('   - GET  /api/patients/count (REAL DATA)');
      console.log('   - GET  /api/appointments/count (REAL DATA)');
      console.log('   - GET  /api/staff/count (REAL DATA)');
      console.log('   - GET  /api/tasks/pending (REAL DATA)');
      console.log('   - GET  /api/billing/revenue-stats (REAL DATA)');
      console.log('   - GET  /api/lab/stats (REAL DATA)');
      console.log('   - GET  /api/notifications/stats (REAL DATA)');
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    console.log('💡 Make sure MongoDB is running on localhost:27017');
    console.log('💡 Database name: clinic-cms');
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down real database server...');
  await mongoose.connection.close();
  console.log('✅ Server shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down real database server...');
  await mongoose.connection.close();
  console.log('✅ Server shutdown complete');
  process.exit(0);
});
