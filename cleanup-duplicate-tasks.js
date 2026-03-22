const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5002';
const ADMIN_TOKEN = 'your-admin-token-here'; // You'll need to get this from a logged-in admin user

async function cleanupDuplicateTasks() {
  try {
    console.log('🧹 Starting cleanup of duplicate nurse tasks...');
    
    // Call the cleanup endpoint
    const response = await axios.post(`${API_BASE_URL}/api/nurse-tasks/cleanup-duplicates`, {}, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('✅ Cleanup completed successfully!');
      console.log(`📊 Results:`);
      console.log(`   - Kept: ${response.data.keptTasks} tasks`);
      console.log(`   - Deleted: ${response.data.deletedTasks} duplicates`);
      console.log(`   - Message: ${response.data.message}`);
    } else {
      console.log('❌ Cleanup failed:', response.data.message);
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
      
      if (error.response.status === 401) {
        console.log('🔐 Authentication failed. Please check your admin token.');
      } else if (error.response.status === 403) {
        console.log('🚫 Access denied. Admin role required.');
      }
    } else {
      console.error('❌ Network Error:', error.message);
    }
  }
}

// Instructions for use
console.log('📋 INSTRUCTIONS:');
console.log('1. Make sure the backend server is running on port 5002');
console.log('2. Get an admin token by logging in as an admin user');
console.log('3. Replace "your-admin-token-here" with the actual token');
console.log('4. Run this script to clean up duplicates');
console.log('');

// Check if token is set
if (ADMIN_TOKEN === 'your-admin-token-here') {
  console.log('⚠️  Please set your admin token before running this script');
  console.log('   Get it from the browser console after logging in as admin');
  console.log('   Look for: localStorage.getItem("token")');
} else {
  cleanupDuplicateTasks();
}
