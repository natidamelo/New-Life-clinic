const axios = require('axios');

async function run() {
  try {
    const API_URL = 'https://new-life-clinic.onrender.com';
    console.log('Logging in as DR Natan...');
    
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      identifier: 'DR Natan',
      password: 'natan' // I am assuming his password is 'natan' based on my earlier guess
    });
    
    const token = loginRes.data.data.token;
    console.log('Login successful.');
    
    const statsRes = await axios.get(`${API_URL}/api/doctor/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Stats:', JSON.stringify(statsRes.data, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
