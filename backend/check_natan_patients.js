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
    
    console.log('Fetching patients list with doctor info...');
    const patientsRes = await axios.get(`${API_URL}/api/patients?includeCompleted=true&limit=100`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'x-clinic-id': 'all'
      }
    });

    const patients = patientsRes.data.data;
    console.log(`Found ${patients.length} patients.`);
    
    const natanId = '6823301cdefc7776bf7537b3';
    const assignedToNatan = patients.filter(p => p.assignedDoctorId === natanId);
    console.log(`Patients assigned to DR Natan (${natanId}): ${assignedToNatan.length}`);
    
    if (assignedToNatan.length > 0) {
      console.log('Sample Natan patient status:', assignedToNatan[0].status);
    }
    
    const waitingPatients = patients.filter(p => p.status === 'waiting');
    console.log(`Patients with status 'waiting': ${waitingPatients.length}`);
    
    const scheduledPatients = patients.filter(p => p.status === 'scheduled');
    console.log(`Patients with status 'scheduled': ${scheduledPatients.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

run();
