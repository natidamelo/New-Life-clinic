const express = require('express');
const selfPingService = require('../backend/services/selfPingService');

console.log('🧪 Starting mock server for SelfPingService test...');

const app = express();
const PORT = 5005;

app.get('/ping', (req, res) => {
  console.log('📥 [Mock Server] Received ping request!');
  res.status(200).json({ success: true, message: 'Mock server is alive!' });
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 [Mock Server] Running on http://127.0.0.1:${PORT}`);
  
  // Configure environment variables for testing the ping
  process.env.SELF_PING_URL = `http://127.0.0.1:${PORT}/ping`;
  process.env.NODE_ENV = 'production'; // bypass dev check

  // Start ping service
  selfPingService.start();
  
  // Wait 4 seconds to observe the ping request, then shut down
  setTimeout(() => {
    console.log('🧹 [Test] Cleaning up...');
    selfPingService.stop();
    server.close(() => {
      console.log('✅ [Test] Mock server closed. Test passed!');
      process.exit(0);
    });
  }, 4000);
});
