// Utility to restore user data from existing tokens
// Run this in the browser console to fix the authentication issue

function restoreUserDataFromToken() {
  try {
    // Get the first available token
    const tokenKeys = [
      'auth_token',
      'AUTH_TOKEN_KEY', 
      'authToken',
      'jwt_token',
      'token',
      'clinic_auth_token',
      'clinic_jwt_token'
    ];
    
    let token = null;
    for (const key of tokenKeys) {
      const foundToken = localStorage.getItem(key);
      if (foundToken) {
        token = foundToken;
        console.log(`Found token in ${key}`);
        break;
      }
    }
    
    if (!token) {
      console.error('No token found to restore user data from');
      return false;
    }
    
    // Decode the token to get user information
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    console.log('Decoded token payload:', decoded);
    
    // Create user data from token payload
    const userData = {
      id: decoded.userId || decoded.id || decoded.user_id,
      _id: decoded.userId || decoded.id || decoded.user_id,
      email: decoded.email || 'doctor@clinic.com',
      name: decoded.name || 'Doctor User',
      role: decoded.role || 'doctor',
      firstName: decoded.firstName || decoded.first_name || 'Doctor',
      lastName: decoded.lastName || decoded.last_name || 'User'
    };
    
    // Store the user data
    localStorage.setItem('user_data', JSON.stringify(userData));
    
    console.log('✅ User data restored from token:', userData);
    console.log('✅ Authentication should now work properly');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error restoring user data from token:', error);
    return false;
  }
}

// Auto-run the restoration
console.log('🔧 Running user data restoration...');
const success = restoreUserDataFromToken();
if (success) {
  console.log('🔄 Please refresh the page to apply the changes');
  // Optionally auto-refresh after a short delay
  setTimeout(() => {
    console.log('🔄 Auto-refreshing page...');
    window.location.reload();
  }, 2000);
} else {
  console.log('❌ Failed to restore user data');
} 