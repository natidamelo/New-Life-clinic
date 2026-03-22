const http = require('http');

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5002,
      path: path,
      method: 'GET',
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('Testing Dashboard API endpoints...\n');

  const endpoints = [
    '/ping',
    '/api/ping',
    '/api/patients/count',
    '/api/staff/count',
    '/api/tasks/pending',
    '/api/lab/stats',
    '/api/billing/revenue-stats',
    '/api/notifications/stats',
    '/api/appointments/count',
    '/api/admin/dashboard/stats'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const result = await testEndpoint(endpoint);
      console.log(`✅ ${endpoint}: ${result.status} - ${JSON.stringify(result.data).substring(0, 100)}...`);
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
    console.log('');
  }
}

runTests();
