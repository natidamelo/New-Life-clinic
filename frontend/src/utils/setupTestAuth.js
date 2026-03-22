// Utility to set up test authentication for debugging
export const setupTestAuth = () => {
  const testToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODI0NjFiNThhMmJmYjBhNzUzOTk4NGMiLCJyb2xlIjoicmVjZXB0aW9uIiwidXNlcm5hbWUiOiJSY2VwdGlvbiBNZXJvbiIsImlhdCI6MTc1Mjk5Mzc1OCwiZXhwIjoxNzUzMDgwMTU4fQ.Ky17NlVuzEYQQ2ThhzDYbQL7K6D0_i48JNEOf0k8ubA";
  
  const testUser = {
    id: "682461b58a2bfb0a7539984c",
    _id: "682461b58a2bfb0a7539984c",
    email: "reception@test.com",
    name: "Meron Abebe",
    firstName: "Meron",
    lastName: "Abebe",
    role: "reception",
    username: "Rception Meron",
    permissions: {
      manageUsers: false,
      managePatients: true,
      manageAppointments: true,
      manageBilling: false,
      manageInventory: false,
      generateReports: false,
      viewReports: false
    }
  };

  // Set token in all possible storage locations
  localStorage.setItem('auth_token', testToken);
  localStorage.setItem('AUTH_TOKEN_KEY', testToken);
  localStorage.setItem('authToken', testToken);
  localStorage.setItem('jwt_token', testToken);
  localStorage.setItem('token', testToken);
  localStorage.setItem('clinic_auth_token', testToken);
  localStorage.setItem('clinic_jwt_token', testToken);

  // Set user data
  localStorage.setItem('user_data', JSON.stringify(testUser));
  localStorage.setItem('USER_DATA_KEY', JSON.stringify(testUser));

  console.log('Test authentication set up successfully');
  console.log('Token:', testToken.substring(0, 50) + '...');
  console.log('User:', testUser.name);

  return { token: testToken, user: testUser };
};

// Function to clear test authentication
export const clearTestAuth = () => {
  const keys = [
    'auth_token', 'AUTH_TOKEN_KEY', 'authToken', 'jwt_token', 'token', 
    'clinic_auth_token', 'clinic_jwt_token', 'user_data', 'USER_DATA_KEY'
  ];
  
  keys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  
  console.log('Test authentication cleared');
};

// Auto-setup in development mode
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || import.meta.env?.MODE === 'development')) {
  // Check if user is already authenticated
  const existingToken = localStorage.getItem('auth_token') || localStorage.getItem('AUTH_TOKEN_KEY');
  if (!existingToken) {
    console.log('Setting up test authentication for development...');
    setupTestAuth();
  } else {
    console.log('User already authenticated, skipping test setup');
  }
} 