// Test script to check if the dashboard API is working correctly
const axios = require('axios');

// Test the dashboard API endpoints
async function testDashboardAPI() {
  try {
    console.log('🔍 Testing Dashboard API endpoints...');

    // Test the universal-stats endpoint
    console.log('📊 Testing /api/dashboard/universal-stats...');
    const response = await axios.get('http://localhost:5002/api/dashboard/universal-stats', {
      headers: {
        'Authorization': 'Bearer test-token' // You'll need a real token
      }
    });

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.success) {
      console.log('✅ Dashboard API is working');
      console.log('📈 Data received:', response.data.data);
    } else {
      console.log('❌ Dashboard API returned error:', response.data);
    }

  } catch (error) {
    console.error('❌ Error testing dashboard API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testDashboardAPI();
