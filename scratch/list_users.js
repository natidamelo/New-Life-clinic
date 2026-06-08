const https = require('https');

function postJSON(url, payload) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.write(postData);
    req.end();
  });
}

function getWithAuth(url, token, clinicId = 'default') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + (urlObj.search || ''),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-clinic-id': clinicId
      },
      timeout: 15000
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.end();
  });
}

async function run() {
  try {
    console.log('Logging in as superadmin...');
    const loginResult = await postJSON('https://new-life-clinic.onrender.com/api/auth/login', {
      identifier: 'superadmin',
      password: 'Sup3rAdm!n#2026#N3wL1fe'
    });
    
    console.log('Login Status:', loginResult.statusCode);
    const loginBody = JSON.parse(loginResult.body);
    
    // In axios, the response structure has data.data.token. In our raw request, it's loginBody.data.token
    const token = loginBody.data && loginBody.data.token;
    if (!token) {
      console.log('Login failed:', loginBody);
      return;
    }
    
    console.log('Login success, fetching users list...');
    const usersResult = await getWithAuth('https://new-life-clinic.onrender.com/api/users', token, 'all');
    console.log('Users Status:', usersResult.statusCode);
    
    try {
      const users = JSON.parse(usersResult.body);
      console.log(`Retrieved ${users.length} users:`);
      users.forEach(u => {
        console.log(`- ID: ${u._id}, Name: ${u.firstName} ${u.lastName}, Username: ${u.username}, Email: ${u.email || 'N/A'}, Role: ${u.role}, Clinic: ${u.clinicId}`);
      });
    } catch (e) {
      console.log('Failed to parse users:', usersResult.body);
    }
    
  } catch (err) {
    console.error('Error occurred:', err.message);
  }
}

run();
