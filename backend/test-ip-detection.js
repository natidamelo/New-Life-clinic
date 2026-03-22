const os = require('os');

console.log('🔍 Testing IP Detection for QR Code Generation');
console.log('===============================================');
console.log();

// Get network interfaces
const networkInterfaces = os.networkInterfaces();

console.log('📡 Available Network Interfaces:');
for (const interfaceName in networkInterfaces) {
  const interfaces = networkInterfaces[interfaceName];
  for (const iface of interfaces) {
    if (iface.family === 'IPv4' && !iface.internal) {
      console.log(`   ${interfaceName}: ${iface.address}`);
    }
  }
}

console.log();

// Test the IP selection logic (same as in QRCodeService)
let serverIP = 'localhost';

// Priority patterns (same as updated in QRCodeService)
const preferredPatterns = [
  /^10\.41\./,       // 10.41.x.x (current network segment) - highest priority
  /^10\./,           // 10.x.x.x (private range)
  /^192\.168\./,     // 192.168.x.x (most common private range)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16-31.x.x (private range)
];

console.log('🎯 IP Selection Process:');
for (const pattern of preferredPatterns) {
  console.log(`   Trying pattern: ${pattern}`);
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const iface of interfaces) {
      if (iface.family === 'IPv4' && !iface.internal && pattern.test(iface.address)) {
        serverIP = iface.address;
        console.log(`   ✅ Selected: ${serverIP} from ${interfaceName}`);
        break;
      }
    }
    if (serverIP !== 'localhost') break;
  }
  if (serverIP !== 'localhost') break;
}

console.log();
console.log(`🌐 Final Result:`);
console.log(`   Selected IP: ${serverIP}`);
console.log(`   QR Code URL: http://${serverIP}:5175/verify-qr`);
console.log(`   Expected: http://10.41.144.157:5175/verify-qr`);

if (serverIP === '10.41.144.157') {
  console.log('   ✅ SUCCESS: IP matches frontend server!');
} else {
  console.log('   ⚠️  WARNING: IP does not match frontend server');
  console.log('   💡 Set environment variable: FRONTEND_IP=10.41.144.157');
}

console.log();
console.log('Environment Variables:');
console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'not set'}`);
console.log(`   FRONTEND_IP: ${process.env.FRONTEND_IP || 'not set'}`);
