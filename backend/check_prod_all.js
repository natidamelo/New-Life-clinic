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
    
    console.log('Fetching patients from all clinics...');
    const patientsRes = await axios.get(`${API_URL}/api/patients?includeCompleted=true`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'x-clinic-id': 'all'
      }
    });
    console.log(`Found ${patientsRes.data.data.length} patients.`);
    
    if (patientsRes.data.data.length > 0) {
      const clinicIds = [...new Set(patientsRes.data.data.map(p => p.clinicId))];
      console.log('Active clinicIds in patients:', clinicIds);
    }

    console.log('Fetching users from all clinics...');
    const usersRes = await axios.get(`${API_URL}/api/users`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'x-clinic-id': 'all'
      }
    });
    
    if (usersRes.data.success) {
      console.log(`Found ${usersRes.data.data.length} users.`);
      const clinicIds = [...new Set(usersRes.data.data.map(u => u.clinicId))];
      console.log('Active clinicIds in users:', clinicIds);
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
