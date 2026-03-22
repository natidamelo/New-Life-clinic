// test-delete-direct.js - Script to test user deletion directly against the API
// Run with: node test-delete-direct.js userId

const axios = require('axios');

async function testDeleteUser(userId) {
  const API_BASE_URL = 'http://localhost:5000'; // Adjust based on your actual server URL
  const API_ADMIN_USERS = '/api/admin/users';
  const token = ''; // Add your valid admin token here

  console.log(`Testing deletion of user: ${userId}`);
  console.log(`API URL: ${API_BASE_URL}${API_ADMIN_USERS}/${userId}`);
  
  try {
    const response = await axios.delete(
      `${API_BASE_URL}${API_ADMIN_USERS}/${userId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Delete successful!');
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Delete failed!');
    
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    
    throw error;
  }
}

// Get userId from command line args
const userId = process.argv[2];
if (!userId) {
  console.error('Please provide a user ID as an argument');
  process.exit(1);
}

testDeleteUser(userId)
  .then(() => process.exit(0))
  .catch(() => process.exit(1)); 
// runTests('67f37ec7e86adbf0b8a7bb04').then(console.log); 