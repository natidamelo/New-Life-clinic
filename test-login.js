const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login to http://localhost:5002/api/auth/login');

    const response = await axios.post('http://localhost:5002/api/auth/login', {
      identifier: 'admin@clinic.com',
      password: 'admin123'
    });

    console.log('Login successful!');
    console.log('Response:', response.data);
  } catch (error) {
    console.log('Login failed!');
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
    console.log('Error:', error.message);
  }
}

testLogin();