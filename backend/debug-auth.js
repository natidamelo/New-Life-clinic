const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('=== AUTH DEBUG SCRIPT ===');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT_SET');
console.log('NODE_ENV:', process.env.NODE_ENV);

// Test token creation and verification
const testUserId = '507f1f77bcf86cd799439011'; // Example ObjectId
const testToken = jwt.sign(
  { userId: testUserId, role: 'admin' }, 
  process.env.JWT_SECRET, 
  { expiresIn: '24h' }
);

console.log('\n=== TOKEN TEST ===');
console.log('Test token created:', testToken.substring(0, 50) + '...');

try {
  const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
  console.log('Token verification successful:', decoded);
} catch (error) {
  console.error('Token verification failed:', error.message);
}

console.log('\n=== INSTRUCTIONS FOR FRONTEND DEBUG ===');
console.log('1. Open browser developer tools (F12)');
console.log('2. Go to Application/Storage tab');
console.log('3. Check localStorage for these keys:');
console.log('   - auth_token');
console.log('   - AUTH_TOKEN_KEY');
console.log('   - authToken');
console.log('   - jwt_token');
console.log('   - token');
console.log('   - clinic_auth_token');
console.log('   - clinic_jwt_token');
console.log('4. If any token exists, copy it and test with this script');
console.log('5. If no token exists, you need to log in again');

console.log('\n=== TEST EXISTING TOKEN ===');
console.log('If you have a token from localStorage, run:');
console.log('node debug-auth.js <your-token-here>');

// If a token is provided as argument, test it
if (process.argv[2]) {
  const providedToken = process.argv[2];
  console.log('\n=== TESTING PROVIDED TOKEN ===');
  console.log('Token:', providedToken.substring(0, 50) + '...');
  
  try {
    const decoded = jwt.verify(providedToken, process.env.JWT_SECRET);
    console.log('✅ Token is VALID:', decoded);
  } catch (error) {
    console.log('❌ Token is INVALID:', error.message);
  }
}
