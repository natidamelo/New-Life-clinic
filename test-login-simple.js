const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login to http://localhost:5002/api/auth/test-login');

    const response = await axios.post('http://localhost:5002/api/auth/test-login', {
      identifier: 'admin@clinic.com',
      password: 'admin123'
    });

    console.log('Login successful!');
    console.log('Response status:', response.status);
    console.log('User:', response.data.data.user.email);
    console.log('Role:', response.data.data.user.role);
  } catch (error) {
    console.log('Login failed!');
    console.log('Status:', error.response?.status);
    console.log('Data:', error.response?.data);
  }
}

testLogin();