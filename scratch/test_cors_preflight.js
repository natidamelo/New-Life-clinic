const https = require('https');

function testCorsPreflight(origin, path) {
  return new Promise((resolve) => {
    console.log(`Sending OPTIONS preflight to ${path} with Origin: ${origin}`);
    const options = {
      hostname: 'new-life-clinic.onrender.com',
      port: 443,
      path: path,
      method: 'OPTIONS',
      headers: {
        'Origin': origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type,authorization,x-clinic-id'
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
  const result = await testCorsPreflight('https://new-life-clinic-4i51.vercel.app', '/api/attendance/my-status');
  console.log('OPTIONS test result:');
  console.log(JSON.stringify(result, null, 2));
}

run();
