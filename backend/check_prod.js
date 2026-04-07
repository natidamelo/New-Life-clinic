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
    
    console.log('Fetching patients...');
    const patientsRes = await axios.get(`${API_URL}/api/patients`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Found ${patientsRes.data.data.length} patients.`);
    
    console.log('Fetching users...');
    const usersRes = await axios.get(`${API_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Found ${usersRes.data.data.length} users.`);

    if (usersRes.data.data.length > 0) {
      console.log('Sample user:', usersRes.data.data[0].username, usersRes.data.data[0].clinicId);
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
