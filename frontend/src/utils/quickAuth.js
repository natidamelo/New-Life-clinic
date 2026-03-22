// Quick authentication utility for testing medication administration
// This helps resolve the 403 Forbidden error by ensuring proper authentication

import api from '../services/api';

export const quickLogin = async (identifier = 'admin@clinic.com', password = 'admin123') => {
  try {
    console.log('🔐 Quick login attempt with:', identifier);
    
    const response = await api.post('/api/auth/test-login', {
      identifier,
      password
    });
    
    if (response.data.success) {
      const { token, user } = response.data.data;
      
      // Store authentication data
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      
      // Update API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      console.log('✅ Quick login successful:', user);
      console.log('🔑 Token stored and API headers updated');
      
      return { success: true, user, token };
    } else {
      throw new Error('Login failed');
    }
  } catch (error) {
    console.error('❌ Quick login failed:', error);
    return { success: false, error: error.message };
  }
};

export const checkAuthStatus = () => {
  const token = localStorage.getItem('auth_token');
  const userData = localStorage.getItem('user_data');
  
  if (token && userData) {
    try {
      const user = JSON.parse(userData);
      console.log('🔍 Current auth status:', {
        authenticated: true,
        user: user,
        token: token.substring(0, 20) + '...'
      });
      return { authenticated: true, user, token };
    } catch (e) {
      console.error('Error parsing user data:', e);
      return { authenticated: false };
    }
  }
  
  console.log('🔍 Current auth status: Not authenticated');
  return { authenticated: false };
};

export const clearAuth = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_data');
  delete api.defaults.headers.common['Authorization'];
  console.log('🧹 Authentication cleared');
};

// Test the medication administration endpoint
export const testMedicationAuth = async () => {
  try {
    console.log('🧪 Testing medication administration authentication...');
    
    const response = await api.get('/api/medication-administration/test-auth');
    console.log('✅ Medication auth test successful:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Medication auth test failed:', error);
    return { success: false, error: error.message };
  }
};
