const jwt = require('jsonwebtoken');
const axios = require('axios');

// Test the QR generation endpoint
async function testQRGeneration() {
  try {
    // Create a test JWT token for doctor@clinic.com
    const payload = {
      userId: '507f1f77bcf86cd799439011', // This will be replaced by actual user ID
      email: 'doctor@clinic.com',
      role: 'doctor'
    };
    
    const secret = 'clinic-management-system-development-secret-key-2024';
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    
    console.log('🔑 Generated test token:', token.substring(0, 50) + '...');
    
    // Test the QR generation endpoint
    const response = await axios.post('http://localhost:5002/api/qr/generate', {
      hashType: 'staff-registration',
      location: 'Main Entrance'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);
    
    const data = response.data;
    console.log('📄 Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing QR generation:', error);
  }
}

// Run the test
testQRGeneration();
