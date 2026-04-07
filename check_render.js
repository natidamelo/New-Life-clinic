const https = require('https');

// Test the live Render backend health
const url = 'https://new-life-clinic-api.onrender.com/api/health-check';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Render Backend Health:');
    console.log(JSON.parse(data));
  });
}).on('error', err => console.error('Error:', err.message));
