#!/usr/bin/env node

/**
 * Mobile Connectivity Test Script
 * This script tests if the clinic system is accessible from mobile devices
 */

const http = require('http');
const os = require('os');

console.log('📱 Testing mobile connectivity for QR codes...\n');

// Get the current IP address
const networkInterfaces = os.networkInterfaces();
let serverIP = 'localhost';

// Find the best IP for mobile access
const preferredPatterns = [
  /^192\.168\./,     // 192.168.x.x (most common private range)
  /^10\./,           // 10.x.x.x (private range)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16-31.x.x (private range)
];

for (const pattern of preferredPatterns) {
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal && pattern.test(iface.address)) {
        serverIP = iface.address;
        break;
      }
    }
    if (serverIP !== 'localhost') break;
  }
  if (serverIP !== 'localhost') break;
}

console.log(`🔍 Testing connectivity for IP: ${serverIP}`);

// Test URLs
const testUrls = [
  `http://${serverIP}:5175`,
  `http://${serverIP}:5002/api/qr/test`,
  `http://${serverIP}:5175/verify-qr?hash=test123&type=staff-registration&userId=testuser`
];

async function testUrl(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      resolve({
        url,
        status: res.statusCode,
        success: res.statusCode >= 200 && res.statusCode < 400,
        message: `HTTP ${res.statusCode}`
      });
    });

    req.on('error', (error) => {
      resolve({
        url,
        status: 0,
        success: false,
        message: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        status: 0,
        success: false,
        message: 'Connection timeout'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Running connectivity tests...\n');
  
  for (const url of testUrls) {
    const result = await testUrl(url);
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.url}`);
    console.log(`   ${result.message}\n`);
  }
  
  console.log('📱 Mobile access instructions:');
  console.log('1. Make sure your phone is connected to the same WiFi network');
  console.log('2. Open your phone\'s browser and try these URLs:');
  testUrls.forEach(url => {
    console.log(`   - ${url}`);
  });
  console.log('\n3. If any URL loads on your phone, QR codes should work');
  console.log('4. If URLs don\'t load, check:');
  console.log('   - WiFi connection (same network as computer)');
  console.log('   - Windows Firewall settings');
  console.log('   - Server is running on correct ports');
  
  console.log('\n🔧 Quick fixes:');
  console.log('- Restart both frontend and backend servers');
  console.log('- Check Windows Firewall for ports 5175 and 5002');
  console.log('- Try using a different IP address if available');
}

runTests().catch(console.error);
