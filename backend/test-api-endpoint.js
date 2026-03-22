const axios = require('axios');

async function testApiEndpoint() {
  try {
    console.log('🔍 Testing API endpoint for medication tasks...');
    
    // Test the nurse-tasks endpoint
    const response = await axios.get('http://localhost:5002/api/nurse-tasks?taskType=MEDICATION&status=PENDING', {
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without authentication, but we can see the response
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:', response.data);
    console.log(`📊 Found ${response.data.length} medication tasks via API`);
    
  } catch (error) {
    console.log('❌ API Error:', error.response?.status || error.code);
    console.log('❌ Error Message:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔐 Authentication required - this is expected');
    }
  }
}

testApiEndpoint();
