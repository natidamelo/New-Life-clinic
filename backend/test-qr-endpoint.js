const axios = require('axios');

async function testQREndpoint() {
  try {
    console.log('🧪 Testing QR generation endpoint...');
    
    // First, let's test without authentication to see the error
    try {
      const response = await axios.post('http://localhost:5002/api/qr/generate', {
        hashType: 'qr-checkin',
        location: 'Main Entrance'
      });
      console.log('📡 Response (no auth):', response.status, response.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Endpoint requires authentication (expected)');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Now test with a valid JWT token
    const jwt = require('jsonwebtoken');
    const payload = { 
      userId: '6823301cdefc7776bf7537b3', 
      email: 'doctor123@clinic.com', 
      role: 'doctor' 
    };
    const secret = 'clinic-management-system-development-secret-key-2024';
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    
    console.log('🔑 Generated test token:', token.substring(0, 50) + '...');
    
    const authResponse = await axios.post('http://localhost:5002/api/qr/generate', {
      hashType: 'qr-checkin',
      location: 'Main Entrance'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📡 Response (with auth):', authResponse.status);
    console.log('📄 Response data:', JSON.stringify(authResponse.data, null, 2));
    
    // Check if hash property exists
    if (authResponse.data.success && authResponse.data.data) {
      const data = authResponse.data.data;
      console.log('🔍 Hash property check:');
      console.log('  - hash:', data.hash);
      console.log('  - uniqueHash:', data.uniqueHash);
      console.log('  - hash type:', typeof data.hash);
      console.log('  - uniqueHash type:', typeof data.uniqueHash);
      
      if (!data.hash) {
        console.log('❌ PROBLEM: hash property is missing or undefined!');
      } else {
        console.log('✅ hash property exists and has value');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing endpoint:', error.message);
    if (error.response) {
      console.log('📡 Error response:', error.response.status, error.response.data);
    }
  }
}

testQREndpoint();
