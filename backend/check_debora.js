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
    
    const response = await axios.get(`${API_URL}/api/patients?limit=100`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'x-clinic-id': 'all'
      }
    });

    const patients = response.data.data;
    const debora = patients.find(p => p.firstName === 'debora' || p.lastName === 'debora');
    
    if (debora) {
      console.log('Full Debora Patient:', JSON.stringify(debora, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
