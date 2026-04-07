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
    
    console.log('Creating diagnostic script...');
    // We need an endpoint that can run a script or return counts.
    // I already have a script checking Patients.
    
    // Let's check 'services' and 'users'.
    const usersRes = await axios.get(`${API_URL}/api/users`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-clinic-id': 'all'
        }
    });
    console.log(`Users total (all clinics): ${usersRes.data.length}`);

    const servicesRes = await axios.get(`${API_URL}/api/services`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-clinic-id': 'all'
        }
    });
    // Check if it's an array or data wrapper
    const services = servicesRes.data.data || servicesRes.data;
    console.log(`Services total (all clinics): ${services.length}`);

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
