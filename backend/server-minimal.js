const createApp = require('./app-minimal');

const PORT = process.env.PORT || 5002;

// Create and start server
const app = createApp();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Minimal server is running on port ${PORT}`);
  console.log(`Server accessible at: http://localhost:${PORT}`);
  console.log('✅ Minimal server started successfully');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down minimal server...');
  process.exit(0);
});
