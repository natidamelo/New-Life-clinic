const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('=== JWT TOKEN DEBUG ===');

// Use the same JWT secret logic as the application
const jwtSecret = process.env.JWT_SECRET || 'clinic-management-system-default-secret-key-12345';

console.log('JWT_SECRET from env:', process.env.JWT_SECRET ? 'SET' : 'NOT_SET');
console.log('Using JWT secret:', jwtSecret ? 'PRESENT' : 'MISSING');
console.log('JWT secret length:', jwtSecret.length);

// Create a test token
const testPayload = {
  userId: 'test123',
  email: 'test@clinic.com',
  role: 'admin',
  username: 'test'
};

try {
  console.log('\n--- Creating Test Token ---');
  const testToken = jwt.sign(testPayload, jwtSecret, { expiresIn: '24h' });
  console.log('✅ Test token created successfully');
  console.log('Token length:', testToken.length);
  console.log('Token starts with:', testToken.substring(0, 30) + '...');
  
  console.log('\n--- Verifying Test Token ---');
  const decoded = jwt.verify(testToken, jwtSecret);
  console.log('✅ Test token verified successfully');
  console.log('Decoded payload:', decoded);
  
  console.log('\n--- Testing Token Expiration ---');
  const expiredToken = jwt.sign(testPayload, jwtSecret, { expiresIn: '1ms' });
  
  // Wait a moment for token to expire
  setTimeout(() => {
    try {
      jwt.verify(expiredToken, jwtSecret);
      console.log('❌ Expired token should have failed verification');
    } catch (error) {
      console.log('✅ Expired token correctly rejected:', error.name);
    }
  }, 10);
  
} catch (error) {
  console.error('❌ Token test failed:', error.message);
}

console.log('\n=== END DEBUG ===');
