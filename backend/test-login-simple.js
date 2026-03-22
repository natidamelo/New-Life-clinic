const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login endpoint...');
    
    // Test the ping endpoint first
    const pingResponse = await axios.get('http://localhost:5002/api/ping');
    console.log('✅ Ping response:', pingResponse.data);
    
    // Test the test-login endpoint
    console.log('\nTesting test-login endpoint...');
    const loginResponse = await axios.post('http://localhost:5002/api/auth/test-login', {
      identifier: 'DR Natan',
      password: 'doctor123'
    });
    
    console.log('✅ Login response:', loginResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testLogin();
