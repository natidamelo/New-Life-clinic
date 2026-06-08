const https = require('https');

function testCors(origin) {
  return new Promise((resolve) => {
    console.log(`Pinging with Origin: ${origin}`);
    const options = {
      hostname: 'new-life-clinic.onrender.com',
      port: 443,
      path: '/api/ping',
      method: 'GET',
      headers: {
        'Origin': origin
      },
      timeout: 10000
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
      resolve({ error: 'Timeout after 10s' });
    });
    
    req.on('error', (err) => {
      resolve({ error: err.message });
    });
    
    req.end();
  });
}

async function run() {
  const result = await testCors('https://new-life-clinic-4i51.vercel.app');
  console.log('CORS test result:');
  console.log(JSON.stringify(result, null, 2));
}

run();
