// Automated login script for Mahlet user (Imaging Technician)
// For development and testing purposes only

(function loginAsMahlet() {
  // Get Mahlet's data from the MongoDB database as shown in the Compass UI
  const mahletData = {
    _id: '684591465e30c62ef13f0b73',
    username: 'Mahlet',
    email: 'mahl@clinic.com',
    role: 'imaging', 
    firstName: 'Mahlet',
    lastName: 'Yohannes', // As seen in the database
    profileImage: '',
  };

  // Generate a proper token format that the server will accept
  const tokenPayload = {
    userId: mahletData._id,
    role: mahletData.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  };
  
  // Create a token that mimics a real JWT but with our data
  const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(tokenPayload))}.mockSignature`;

  // Store in localStorage
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(mahletData));
  
  // Important: Clear any existing auth-related localStorage entries that might conflict
  localStorage.removeItem('JWT_TOKEN_KEY');
  localStorage.removeItem('USER_DATA_KEY');

  // Set up axios default headers if axios is available
  if (window.axios) {
    window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  console.log('✅ Successfully logged in as Mahlet (Imaging Technician)');
  console.log('User data:', mahletData);
  console.log('Token:', token);

  // Get the correct route based on role
  const getRoleBasedRoute = (role) => {
    switch (role) {
      case 'doctor': return '/app/doctor';
      case 'nurse': return '/nurse';
      case 'reception': return '/reception';
      case 'admin': return '/admin';
      case 'lab': return '/lab';
      case 'imaging': return '/imaging/dashboard';
      case 'pharmacy': return '/pharmacy';
      default: return '/';
    }
  };

  // Redirect to the appropriate dashboard based on role
  const redirectPath = getRoleBasedRoute(mahletData.role);
  
  if (window.location.pathname !== redirectPath) {
    console.log(`🔄 Redirecting to ${redirectPath}...`);
    window.location.href = redirectPath;
  } else {
    console.log(`✓ Already on the correct dashboard: ${redirectPath}`);
  }
})(); 