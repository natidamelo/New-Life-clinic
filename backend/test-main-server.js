const http = require('http');

function testEndpoint(path, port = 5002) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000
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
  console.log('🎯 Testing Main Server (Port 5002) Dashboard Endpoints...\n');

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

  let successCount = 0;
  let totalCount = endpoints.length;

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const result = await testEndpoint(endpoint);
      console.log(`✅ ${endpoint}: ${result.status} - ${JSON.stringify(result.data).substring(0, 80)}...`);
      successCount++;
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
    console.log('');
  }

  console.log(`📊 Results: ${successCount}/${totalCount} endpoints working successfully!`);
  
  if (successCount === totalCount) {
    console.log('🎉 MAIN SERVER IS WORKING! Your frontend should now be able to fetch data successfully.');
    console.log('🚀 You can now access your frontend and the 404 errors should be resolved!');
  } else {
    console.log('⚠️  Some endpoints are still having issues.');
  }
}

runTests();
