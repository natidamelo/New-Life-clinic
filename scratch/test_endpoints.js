const https = require('https');

function pingUrl(url) {
  return new Promise((resolve) => {
    console.log(`Pinging: ${url}`);
    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, error: 'Timeout after 10s' });
    });
    
    req.on('error', (err) => {
      resolve({ url, error: err.message });
    });
  });
}

async function run() {
  const results = await Promise.all([
    pingUrl('https://new-life-clinic.onrender.com/ping'),
    pingUrl('https://new-life-clinic-api.onrender.com/ping'),
    pingUrl('https://new-life-clinic.onrender.com/api/ping'),
    pingUrl('https://new-life-clinic-api.onrender.com/api/ping')
  ]);
  
  console.log(JSON.stringify(results, null, 2));
}

run();
