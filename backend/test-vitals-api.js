const axios = require('axios');

async function testVitalsAPI() {
  try {
    console.log('🧪 Testing Vitals API...\n');

    // Test data with some empty strings (which should now be handled correctly)
    const testVitalsData = {
      temperature: '37.2',
      bloodPressure: '120/80',
      heartRate: '75',
      respiratoryRate: '16',
      bloodSugar: '', // Empty string - should be handled
      oxygenSaturation: '98',
      pain: '', // Empty string - should be handled
      height: '170',
      weight: '70',
      bmi: '24.2',
      timestamp: new Date().toISOString()
    };

    console.log('📋 Test vitals data:', testVitalsData);

    // Test the vitals endpoint
    const patientId = '687f542e30ce59314a7a49d1'; // Hana dejene's ID
    const url = `http://192.168.78.157:5002/api/patients/${patientId}/vitals`;

    console.log(`🔗 Testing URL: ${url}`);

    const response = await axios.put(url, testVitalsData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // You might need a real token
      }
    });

    console.log('✅ Vitals API test successful!');
    console.log('📊 Response status:', response.status);
    console.log('📋 Response data:', response.data);

  } catch (error) {
    console.error('❌ Vitals API test failed:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Error Data:', error.response?.data);
    console.error('Error Message:', error.message);
  }
}

// Run the test
testVitalsAPI(); 