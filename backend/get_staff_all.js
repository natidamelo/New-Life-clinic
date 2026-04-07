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
    
    console.log('Fetching ALL staff list via /api/staff...');
    const response = await axios.get(`${API_URL}/api/staff`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'x-clinic-id': 'all'
      }
    });

    const staff = response.data.data;
    console.log(`Found ${staff.length} staff.`);
    
    const doctors = staff.filter(s => s.role === 'doctor');
    console.log('Doctors:', JSON.stringify(doctors.map(d => ({
      _id: d._id,
      name: `${d.firstName} ${d.lastName}`,
      username: d.username,
      clinicId: d.clinicId
    })), null, 2));

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
