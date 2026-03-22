const { getAllNetworkIPs, getAllFrontendURLs } = require('./utils/networkUtils');

console.log('🔍 Available Network Interfaces:');
console.log('================================');

const ips = getAllNetworkIPs();
if (ips.length === 0) {
  console.log('❌ No network interfaces found');
  process.exit(1);
}

ips.forEach((ip, index) => {
  console.log(`${index + 1}. ${ip.interface}: ${ip.address}`);
});

console.log('\n🌐 Available Frontend URLs:');
console.log('============================');
const urls = getAllFrontendURLs(5175);
urls.forEach((url, index) => {
  console.log(`${index + 1}. ${url}`);
});

console.log('\n📱 To fix the QR code registration issue:');
console.log('==========================================');
console.log('1. Choose the IP address you want to use from the list above');
console.log('2. Set the environment variable FRONTEND_IP to that IP address');
console.log('3. Restart the backend server');

console.log('\n💡 Example commands:');
console.log('====================');
ips.forEach((ip, index) => {
  console.log(`Option ${index + 1}: set FRONTEND_IP=${ip.address}`);
});

console.log('\n🚀 Quick fix - Set to Ethernet IP (169.254.50.151):');
console.log('set FRONTEND_IP=169.254.50.151');
console.log('npm start');

console.log('\n🔧 Or add to your .env file:');
console.log('FRONTEND_IP=169.254.50.151');
