const jwt = require('jsonwebtoken');
require('dotenv').config();

// Function to test if a token is valid
function testToken(token) {
  try {
    console.log('🔍 Testing token validity...');
    console.log('🔐 Token preview:', token ? token.substring(0, 20) + '...' : 'No token');
    
    if (!token) {
      console.log('❌ No token provided');
      return false;
    }
    
    // Decode the token (without verification first to see the structure)
    const decoded = jwt.decode(token);
    console.log('📋 Token payload:', decoded);
    
    if (!decoded) {
      console.log('❌ Invalid token format');
      return false;
    }
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.log('❌ Token is expired');
      console.log(`   Expires: ${new Date(decoded.exp * 1000)}`);
      console.log(`   Now: ${new Date(now * 1000)}`);
      return false;
    }
    
    console.log('✅ Token appears to be valid');
    console.log(`   User ID: ${decoded.id || decoded.userId || 'Unknown'}`);
    console.log(`   Role: ${decoded.role || 'Unknown'}`);
    console.log(`   Expires: ${decoded.exp ? new Date(decoded.exp * 1000) : 'No expiration'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error testing token:', error.message);
    return false;
  }
}

// Test with a sample token from localStorage (you can copy this from browser)
const sampleToken = process.argv[2] || '';

if (sampleToken) {
  testToken(sampleToken);
} else {
  console.log('🔍 No token provided. To test a token, run:');
  console.log('   node test-auth-token.js "your-token-here"');
  console.log('');
  console.log('📋 To get a token from the browser:');
  console.log('   1. Open browser developer tools (F12)');
  console.log('   2. Go to Application/Storage tab');
  console.log('   3. Look for localStorage');
  console.log('   4. Copy the "token" value');
  console.log('   5. Run: node test-auth-token.js "copied-token"');
}
