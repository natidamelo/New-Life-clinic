const axios = require('axios');

async function run() {
  try {
    const API_URL = 'https://new-life-clinic.onrender.com';
    console.log('Logging in as super_admin...');
    
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      identifier: 'superadmin',
      password: 'Sup3rAdm!n#2026#N3wL1fe'
    });
    
    const token = loginRes.data.data.token;
    console.log('Login successful.');
    
    console.log('Fetching ALL users list via super admin...');
    // We need an endpoint that uses auth and returns all users.
    // /api/staff/all might work if it exists.
    
    try {
      const response = await axios.get(`${API_URL}/api/users`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-clinic-id': 'all'
        }
      });
      console.log('Users:', JSON.stringify(response.data, null, 2));
    } catch (e) {
      console.error('/api/users failed:', e.message);
    }

    process.exit(0);
  } catch (error) {
    if (error.response) {
      console.error('Error Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

run();
