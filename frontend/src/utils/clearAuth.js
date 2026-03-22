// Complete authentication reset utility
// Run this in browser console to completely clear all auth data

function completeAuthReset() {
  console.log('🧹 Starting complete authentication reset...');
  
  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ Storage cleared');
  
  // Clear axios headers from all instances
  try {
    // Clear default axios
    if (window.axios && window.axios.defaults && window.axios.defaults.headers) {
      delete window.axios.defaults.headers.common['Authorization'];
      delete window.axios.defaults.headers['Authorization'];
      console.log('✅ Default axios headers cleared');
    }
    
    // Clear custom api instance
    if (window.api && window.api.defaults && window.api.defaults.headers) {
      delete window.api.defaults.headers.common['Authorization'];
      delete window.api.defaults.headers['Authorization'];
      console.log('✅ Custom api headers cleared');
    }
  } catch (e) {
    console.log('⚠️ Could not clear axios headers:', e.message);
  }
  
  // Clear any cookies
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  console.log('✅ Cookies cleared');
  
  console.log('🎉 Complete authentication reset finished!');
  console.log('🔄 Please refresh the page now');
}

// Auto-run the reset
completeAuthReset();