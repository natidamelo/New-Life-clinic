const createApp = require('./app-working');
const mongoose = require('mongoose');
require('dotenv').config();

const PORT = process.env.PORT || 5002;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms')
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Create and start server
    const app = createApp();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Server accessible at: http://localhost:${PORT}`);
      console.log('✅ Working server started successfully');
      console.log('🎯 Dashboard endpoints are now available!');
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  await mongoose.connection.close();
  console.log('✅ Server shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  await mongoose.connection.close();
  console.log('✅ Server shutdown complete');
  process.exit(0);
});

