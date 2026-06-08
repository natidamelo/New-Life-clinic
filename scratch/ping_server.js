const https = require('https');

console.log('Sending request to Render server...');
const req = https.get('https://new-life-clinic.onrender.com/api/ping', { timeout: 15000 }, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('BODY:', data);
    process.exit(0);
  });
});

req.on('timeout', () => {
  console.error('Request timed out after 15 seconds.');
  req.destroy();
  process.exit(1);
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
  process.exit(1);
});
