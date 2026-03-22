console.log('🧪 Simple Debug Test...\n');

try {
  require('dotenv').config({ path: __dirname + '/.env' });
  console.log('✅ Environment loaded');

  const mongoose = require('mongoose');
  console.log('✅ Mongoose loaded');

  const User = require('./models/User');
  console.log('✅ User model loaded');

  console.log('🎉 All basic modules loaded successfully!');
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
