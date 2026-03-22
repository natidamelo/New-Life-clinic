const http = require('http');
const { getFrontendURL } = require('./utils/networkUtils');

console.log('🔍 Testing Frontend Accessibility');
console.log('================================');

// Set the environment variable
process.env.FRONTEND_IP = '169.254.50.151';

const frontendUrl = getFrontendURL(5175);
console.log(`🌐 Testing frontend URL: ${frontendUrl}`);

// Test if the frontend is accessible
const testUrl = `${frontendUrl}/verify-qr?hash=test&type=staff-registration&userId=test`;

console.log('\n📱 Testing URL that should work on your phone:');
console.log(testUrl);

console.log('\n🔧 Troubleshooting Steps:');
console.log('========================');
console.log('1. Make sure your phone and computer are on the same network');
console.log('2. Try accessing the URL directly on your phone browser');
console.log('3. Check if your firewall is blocking the connection');
console.log('4. Verify the frontend server is running on port 5175');

console.log('\n💡 Quick Test:');
console.log('=============');
console.log('1. Open your phone browser');
console.log('2. Go to: http://169.254.50.151:5175');
console.log('3. If it loads, the QR codes should work');
console.log('4. If it doesn\'t load, there\'s a network connectivity issue');

console.log('\n🚀 To fix network issues:');
console.log('=======================');
console.log('1. Make sure both devices are on the same WiFi network');
console.log('2. Check Windows Firewall settings');
console.log('3. Try using the WiFi IP instead: 192.168.118.157');
console.log('4. Or use localhost if testing on the same device');
