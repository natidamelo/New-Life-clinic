const axios = require('axios');

// Test the QR generation endpoint without authentication
async function testQRGenerationNoAuth() {
  try {
    console.log('🧪 Testing QR generation endpoint without authentication...');
    
    // Test the QR generation endpoint without auth header
    const response = await axios.post('http://localhost:5002/api/qr/generate', {
      hashType: 'staff-registration',
      location: 'Main Entrance'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📄 Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('📡 Expected error (no auth):', error.response?.status);
    console.log('📄 Error response:', error.response?.data);
    
    if (error.response?.status === 401) {
      console.log('✅ Endpoint is working - correctly rejecting unauthorized requests');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
}

// Run the test
testQRGenerationNoAuth();
