const axios = require('axios');

async function testPatientRegistrationEndpoint() {
  try {
    console.log('🔍 Testing Patient Registration Endpoint (Test Route)...\n');
    
    // Test data that matches the form in the image
    const patientData = {
      firstName: 'Test',
      lastName: 'Patient',
      age: 30,
      gender: 'male',
      contactNumber: '1234567890',
      email: 'test@example.com',
      address: 'Test Address',
      department: 'general',
      priority: 'normal',
      // Medical information (this is what you mentioned causes the error)
      medicalHistory: 'No significant medical history',
      allergies: 'None known',
      insuranceProvider: 'Test Insurance',
      insuranceNumber: 'INS123456',
      notes: 'Test patient for debugging',
      selectedCardTypeId: '6824995c9bf3995e84ecbc18' // Using the admin user ID as card type for testing
    };
    
    console.log('📋 Sending patient registration request to test endpoint...');
    console.log('Request data:', JSON.stringify(patientData, null, 2));
    
    // Make the request to the test patient creation endpoint (no auth required)
    const response = await axios.post('http://192.168.78.157:5002/api/patients/test-create', patientData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });
    
    console.log('✅ Patient registration successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Patient registration failed!');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      
      // Show validation errors in detail
      if (error.response.data && error.response.data.errors) {
        console.error('\n🔍 Validation Errors:');
        Object.entries(error.response.data.errors).forEach(([field, message]) => {
          console.error(`  - ${field}: ${message}`);
        });
      }
      
      console.error('Response Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
    
    console.error('Full error:', error);
  }
}

testPatientRegistrationEndpoint(); 