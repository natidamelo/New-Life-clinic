const { getAllNetworkIPs } = require('./utils/networkUtils');

console.log('🔍 Network Connectivity Test for QR Codes');
console.log('========================================');

const ips = getAllNetworkIPs();
console.log('\n📱 Available Network Interfaces:');
ips.forEach((ip, index) => {
  console.log(`${index + 1}. ${ip.interface}: ${ip.address}`);
});

console.log('\n🌐 QR Code URLs to test on your phone:');
ips.forEach((ip, index) => {
  console.log(`${index + 1}. http://${ip.address}:5175/verify-qr?hash=test&type=staff-registration&userId=test`);
});

console.log('\n📋 Instructions:');
console.log('1. Open your phone browser');
console.log('2. Try each URL above');
console.log('3. If any URL loads, that IP will work for QR codes');
console.log('4. Tell me which IP works, and I\'ll configure the system to use it');

console.log('\n💡 Quick Fix Options:');
console.log('Option 1: Use Ethernet IP (169.254.50.151)');
console.log('Option 2: Use WiFi IP (192.168.118.157)');
console.log('Option 3: Use localhost (if testing on same device)');

console.log('\n🚀 To fix immediately:');
console.log('1. Test the URLs on your phone');
console.log('2. Tell me which IP works');
console.log('3. I\'ll update the configuration');
