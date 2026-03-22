const axios = require('axios');

async function testStatusEndpoint() {
  try {
    console.log('🧪 Testing /api/qr/current-status endpoint...');
    
    // First, let's get a user ID from the database
    const mongoose = require('mongoose');
    require('dotenv').config();
    
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    
    const User = require('./models/User');
    const user = await User.findOne({ role: 'doctor' });
    
    if (!user) {
      console.log('❌ No doctor user found');
      return;
    }
    
    console.log(`👤 Testing with user: ${user.firstName} ${user.lastName} (${user._id})`);
    
    // Test the endpoint
    const response = await axios.get(`http://localhost:5002/api/qr/current-status/${user._id}`, {
      headers: {
        'Authorization': `Bearer test-token` // This will fail auth, but let's see the response
      }
    });
    
    console.log('✅ Response received:', response.data);
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Response error:', error.response.status, error.response.data);
    } else {
      console.log('❌ Network error:', error.message);
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testStatusEndpoint();
