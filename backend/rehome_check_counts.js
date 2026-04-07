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
    
    console.log('Running dry run rehome to see counts...');
    const rehomeRes = await axios.post(`${API_URL}/api/clinics/new-life/rehome-all-data`, {
      dryRun: true
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('REHOME DRY RUN RESULT:');
    console.log(JSON.stringify(rehomeRes.data, null, 2));

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
