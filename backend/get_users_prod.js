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
    
    console.log('Fetching users from all clinics...');
    // Since /api/users DOES NOT use auth, it defaults to clinicId: 'default'.
    // Let's see if there is any other route that USES auth and returns users.
    // Maybe /api/admin/users?
    
    const usersRes = await axios.get(`${API_URL}/api/users`, {
      headers: { 
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log(`Found ${usersRes.data.length} users with clinicId: 'default'`);
    // But wait, the list might be longer if we look at the right place.
    
    // Let's try /api/staff/all if it exists
    try {
      const staffRes = await axios.get(`${API_URL}/api/staff/all`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-clinic-id': 'all'
        }
      });
      console.log(`Found ${staffRes.data.length} staff.`);
    } catch (e) {
      console.log('/api/staff/all failed');
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
