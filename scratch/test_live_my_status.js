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

function getWithAuth(url, token, origin) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': origin,
        'x-clinic-id': 'default'
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
    console.log('Logging in to live Render backend...');
    const loginResult = await postJSON('https://new-life-clinic.onrender.com/api/auth/login', {
      identifier: 'doctor@clinic.com',
      password: 'doctor123'
    });
    
    console.log('Login Response Status:', loginResult.statusCode);
    const loginBody = JSON.parse(loginResult.body);
    
    if (!loginBody.token) {
      console.log('Login failed:', loginBody);
      return;
    }
    
    const token = loginBody.token;
    console.log('Login successful. Token acquired.');
    
    console.log('\nFetching /api/attendance/my-status...');
    const statusResult = await getWithAuth(
      'https://new-life-clinic.onrender.com/api/attendance/my-status',
      token,
      'https://new-life-clinic-4i51.vercel.app'
    );
    
    console.log('Status Response Status:', statusResult.statusCode);
    console.log('Headers:', JSON.stringify(statusResult.headers, null, 2));
    console.log('Body:', statusResult.body);
    
  } catch (err) {
    console.error('Error occurred:', err.message);
  }
}

run();
