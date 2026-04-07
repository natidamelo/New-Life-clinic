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
    
    console.log('Fetching detailed patients list...');
    const patientsRes = await axios.get(`${API_URL}/api/patients?includeCompleted=true&limit=100`, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'x-clinic-id': 'all'
      }
    });

    const patients = patientsRes.data.data;
    console.log(`Found ${patients.length} patients.`);
    
    if (patients.length > 0) {
      const doctorsInPatients = [...new Set(patients.map(p => p.assignedDoctorId))];
      console.log('Doctor IDs in patients:', doctorsInPatients);
      
      const sample = patients[0];
      console.log('Sample Patient:', JSON.stringify({
        name: `${sample.firstName} ${sample.lastName}`,
        status: sample.status,
        clinicId: sample.clinicId,
        assignedDoctorId: sample.assignedDoctorId
      }, null, 2));
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
