const { getFrontendURL, getAllFrontendURLs } = require('./utils/networkUtils');

console.log('🔍 Testing QR Code IP Configuration');
console.log('==================================');

// Set the environment variable for this test
process.env.FRONTEND_IP = '169.254.50.151';

console.log('✅ Set FRONTEND_IP=169.254.50.151');

const frontendUrl = getFrontendURL(5175);
console.log(`🌐 Frontend URL: ${frontendUrl}`);

console.log('\n📱 Expected QR Code URL format:');
console.log(`${frontendUrl}/verify-qr?hash=<hash>&type=staff-registration&userId=<userId>`);

console.log('\n🔧 To make this permanent:');
console.log('1. Stop the current backend server (Ctrl+C)');
console.log('2. Run: set FRONTEND_IP=169.254.50.151');
console.log('3. Run: npm start');
console.log('4. Or use the batch file: restart-with-correct-ip.bat');

console.log('\n✅ QR codes should now work with your phone at:');
console.log('http://169.254.50.151:5175/verify-qr?hash=...');
