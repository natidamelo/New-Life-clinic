// Test script for deleting a user
// Open this file in a browser's developer console and copy-paste the function below

function testDeleteUser(userId) {
  console.log('Attempting to delete user with ID:', userId);
  
  fetch(`http://192.168.78.157:5002/api/auth/dev/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('Response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('Delete response:', data);
    alert(data.message || 'Delete successful');
  })
  .catch(error => {
    console.error('Error deleting user:', error);
    alert('Error deleting user. See console for details.');
  });
}

// Example usage:
// testDeleteUser('67feb2d8772de1e5d50629cb'); 