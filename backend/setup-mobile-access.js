#!/usr/bin/env node

/**
 * Mobile Access Setup Script
 * This script helps configure the clinic system for mobile QR code access
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up mobile access for QR codes...\n');

// Get network interfaces
const networkInterfaces = os.networkInterfaces();
const availableIPs = [];

console.log('📡 Available network interfaces:');
for (const interfaceName in networkInterfaces) {
  const interfaces = networkInterfaces[interfaceName];
  console.log(`\n${interfaceName}:`);
  
  for (const iface of interfaces) {
    if (iface.family === 'IPv4' && !iface.internal) {
      console.log(`  - ${iface.address} (${iface.mac})`);
      availableIPs.push({
        interface: interfaceName,
        ip: iface.address,
        mac: iface.mac,
        internal: iface.internal
      });
    }
  }
}

// Find the best IP for mobile access
const preferredPatterns = [
  /^192\.168\./,     // 192.168.x.x (most common private range)
  /^10\./,           // 10.x.x.x (private range)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16-31.x.x (private range)
];

let bestIP = null;
let bestInterface = null;

for (const pattern of preferredPatterns) {
  for (const ipInfo of availableIPs) {
    if (pattern.test(ipInfo.ip)) {
      bestIP = ipInfo.ip;
      bestInterface = ipInfo.interface;
      break;
    }
  }
  if (bestIP) break;
}

// Fallback to any non-internal IP
if (!bestIP && availableIPs.length > 0) {
  const nonInternal = availableIPs.find(ip => !ip.ip.startsWith('169.254.'));
  if (nonInternal) {
    bestIP = nonInternal.ip;
    bestInterface = nonInternal.interface;
  }
}

console.log('\n🎯 Recommended configuration:');
if (bestIP) {
  console.log(`✅ Best IP for mobile access: ${bestIP}`);
  console.log(`📱 Frontend URL: http://${bestIP}:5175`);
  console.log(`🔧 Backend URL: http://${bestIP}:5002`);
  console.log(`📡 Network interface: ${bestInterface}`);
  
  // Create environment configuration
  const envConfig = {
    FRONTEND_URL: `http://${bestIP}:5175`,
    BACKEND_URL: `http://${bestIP}:5002`,
    MOBILE_ACCESS_IP: bestIP,
    NETWORK_INTERFACE: bestInterface,
    SETUP_DATE: new Date().toISOString()
  };
  
  // Write to .env file
  const envPath = path.join(__dirname, '.env');
  const envContent = Object.entries(envConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log(`\n✅ Environment configuration saved to: ${envPath}`);
  } catch (error) {
    console.log(`\n⚠️  Could not write .env file: ${error.message}`);
    console.log('Please manually create a .env file with:');
    console.log(envContent);
  }
  
  console.log('\n📱 Mobile setup instructions:');
  console.log('1. Make sure your phone is connected to the same WiFi network');
  console.log('2. The QR codes will now use the IP address:', bestIP);
  console.log('3. Test by opening this URL on your phone:');
  console.log(`   http://${bestIP}:5175`);
  console.log('4. If the page loads, QR codes should work on your phone');
  
} else {
  console.log('❌ No suitable network interface found');
  console.log('Please check your network connection and try again');
}

console.log('\n🔧 Troubleshooting:');
console.log('- If QR codes still don\'t work, try manually setting FRONTEND_URL in .env');
console.log('- Make sure both frontend (port 5175) and backend (port 5002) are running');
console.log('- Check Windows Firewall settings for ports 5175 and 5002');
console.log('- Ensure your phone and computer are on the same WiFi network');

console.log('\n✨ Setup complete!');
