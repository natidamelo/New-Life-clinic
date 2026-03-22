const axios = require('axios');
require('dotenv').config();

console.log('=== LOGIN DIAGNOSTIC TOOL ===');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT_SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('HOST:', process.env.HOST);

// Test server connectivity
async function testServerConnectivity() {
  console.log('\n=== TESTING SERVER CONNECTIVITY ===');
  
  const urls = [
    'http://localhost:5002',
    'http://127.0.0.1:5002',
    'http://10.41.144.157:5002'
  ];
  
  for (const url of urls) {
    try {
      console.log(`Testing ${url}...`);
      const response = await axios.get(`${url}/api/ping`, { timeout: 5000 });
      console.log(`✅ ${url} - Status: ${response.status}`);
      console.log(`Response:`, response.data);
    } catch (error) {
      console.log(`❌ ${url} - Error: ${error.message}`);
    }
  }
}

// Test login endpoint
async function testLogin() {
  console.log('\n=== TESTING LOGIN ENDPOINT ===');
  
  const testCredentials = [
    { identifier: 'DR Natan', password: 'doctor123' },
    { identifier: 'admin@clinic.com', password: 'admin123' },
    { identifier: 'doctor@clinic.com', password: 'doctor123' }
  ];
  
  const baseUrl = 'http://10.41.144.157:5002';
  
  for (const creds of testCredentials) {
    try {
      console.log(`Testing login with: ${creds.identifier}`);
      const response = await axios.post(`${baseUrl}/api/auth/test-login`, creds, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.data.success) {
        console.log(`✅ Login successful for ${creds.identifier}`);
        console.log(`Token: ${response.data.data.token.substring(0, 50)}...`);
      } else {
        console.log(`❌ Login failed for ${creds.identifier}: ${response.data.message}`);
      }
    } catch (error) {
      console.log(`❌ Login error for ${creds.identifier}: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Test token validation
async function testTokenValidation() {
  console.log('\n=== TESTING TOKEN VALIDATION ===');
  
  try {
    // First get a valid token
    const loginResponse = await axios.post('http://10.41.144.157:5002/api/auth/test-login', {
      identifier: 'DR Natan',
      password: 'doctor123'
    }, { timeout: 10000 });
    
    if (loginResponse.data.success) {
      const token = loginResponse.data.data.token;
      console.log(`Got token: ${token.substring(0, 50)}...`);
      
      // Test /api/auth/me endpoint
      const meResponse = await axios.get('http://10.41.144.157:5002/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 10000
      });
      
      console.log(`✅ Token validation successful:`, meResponse.data);
    }
  } catch (error) {
    console.log(`❌ Token validation failed: ${error.response?.data?.message || error.message}`);
  }
}

// Run all tests
async function runDiagnostics() {
  try {
    await testServerConnectivity();
    await testLogin();
    await testTokenValidation();
    
    console.log('\n=== DIAGNOSTIC COMPLETE ===');
  } catch (error) {
    console.error('Diagnostic failed:', error.message);
  }
}

runDiagnostics();
