const https = require('https');

function getDiagnose() {
  return new Promise((resolve) => {
    console.log('Fetching database diagnostic from Render...');
    const req = https.get('https://new-life-clinic.onrender.com/api/diagnose-db', { timeout: 25000 }, (res) => {
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
      resolve({ error: 'Timeout after 25s' });
    });
    
    req.on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

async function run() {
  const result = await getDiagnose();
  console.log('Result:');
  console.log(JSON.stringify(result, null, 2));
}

run();
