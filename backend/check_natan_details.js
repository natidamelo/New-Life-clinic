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
    
    const patientsRes = await axios.get(`${API_URL}/api/patients?limit=100`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'x-clinic-id': 'all'
      }
    });

    const patients = patientsRes.data.data;
    const natanId = '6823301cdefc7776bf7537b3';
    const scheduledToNatan = patients.filter(p => p.status === 'scheduled' && p.assignedDoctorId === natanId);
    
    console.log(`Checking ${scheduledToNatan.length} scheduled patients for Natan...`);
    
    scheduledToNatan.forEach(p => {
      console.log(`- ${p.firstName} ${p.lastName}: Vitals=${!!(p.vitals && Object.keys(p.vitals).length > 0)}, Services=${JSON.stringify(p.services || [])}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
