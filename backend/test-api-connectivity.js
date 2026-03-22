const http = require('http');

console.log('🔍 Testing API Connectivity');
console.log('===========================');

// Test backend directly
console.log('\n1. Testing Backend Direct Access:');
console.log('   URL: http://localhost:5002/api/ping');

const testBackend = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:5002/api/ping', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${data}`);
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', (err) => {
      console.log(`   Error: ${err.message}`);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      console.log('   Timeout: Backend not responding');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
};

// Test current-status endpoint (without auth for now)
console.log('\n2. Testing Current Status Endpoint:');
console.log('   URL: http://localhost:5002/api/qr/current-status/test');

const testCurrentStatus = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:5002/api/qr/current-status/test', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${data}`);
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', (err) => {
      console.log(`   Error: ${err.message}`);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      console.log('   Timeout: Endpoint not responding');
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
};

// Run tests
async function runTests() {
  try {
    await testBackend();
    await testCurrentStatus();
    
    console.log('\n✅ Backend API is accessible!');
    console.log('\n🔧 If frontend still shows "Error checking status":');
    console.log('   1. Restart the frontend server (npm run dev)');
    console.log('   2. Clear browser cache and refresh');
    console.log('   3. Check browser console for CORS errors');
    console.log('   4. Verify the proxy configuration in vite.config.ts');
    
  } catch (error) {
    console.log('\n❌ Backend API is not accessible!');
    console.log('   Please check:');
    console.log('   1. Is the backend server running? (npm start)');
    console.log('   2. Is it running on port 5002?');
    console.log('   3. Are there any firewall issues?');
  }
}

runTests();
