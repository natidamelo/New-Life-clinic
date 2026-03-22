const axios = require('axios');

// Login data
const loginData = {
  email: 'admin@clinic.com',
  password: 'admin123'
};

// API endpoint
const apiUrl = 'http://192.168.78.157:5002/api/auth/login';

// Test login
async function testLogin() {
  try {
    console.log('Attempting to login with:', loginData.email);
    
    const response = await axios.post(apiUrl, loginData);
    
    console.log('Login successful! Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('Login failed!');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      console.error('Request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    
    console.error('Error config:', error.config);
  }
}

// Run the test
testLogin(); 
