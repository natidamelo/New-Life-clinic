// Authentication testing utility
import api from '../services/apiService';
import { setAuthToken, getEffectiveToken, removeAuthToken } from './auth';

export const authTest = {
  // Test login and get a fresh token
  async testLogin(identifier: string = 'admin@clinic.com', password: string = 'admin123') {
    console.log('🧪 Testing login...');
    try {
      const response = await api.post('/api/auth/login', { identifier, password });
      console.log('✅ Login successful:', response.data);
      
      if (response.data.token) {
        console.log('💾 Storing token...');
        setAuthToken(response.data.token);
        console.log('✅ Token stored successfully');
        return response.data.token;
      } else {
        console.error('❌ No token in login response');
        return null;
      }
    } catch (error: any) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      return null;
    }
  },

  // Test the /api/auth/me endpoint
  async testAuthMe() {
    console.log('🧪 Testing /api/auth/me endpoint...');
    try {
      const response = await api.get('/api/auth/me');
      console.log('✅ Auth me successful:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Auth me failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      return null;
    }
  },

  // Check current token status
  checkTokenStatus() {
    console.log('🔍 Checking token status...');
    const token = getEffectiveToken();
    const tokenPreview = typeof token === 'string' ? token.substring(0, 20) + '...' : 'null';
    console.log('Current token:', tokenPreview);
    
    // Check axios headers
    const axiosAuth = (api.defaults.headers.common as any)?.['Authorization'];
    const axiosAuthPreview = typeof axiosAuth === 'string' ? axiosAuth.substring(0, 30) + '...' : 'null';
    console.log('Axios Authorization header:', axiosAuthPreview);
    
    return { token, axiosAuth };
  },

  // Clear all authentication data
  clearAuth() {
    console.log('🧹 Clearing all authentication data...');
    removeAuthToken();
    localStorage.clear();
    sessionStorage.clear();
    console.log('✅ Authentication data cleared');
  },

  // Full authentication test
  async fullTest() {
    console.log('🚀 Starting full authentication test...');
    
    // Step 1: Clear existing auth
    this.clearAuth();
    
    // Step 2: Test login
    const token = await this.testLogin();
    if (!token) {
      console.error('❌ Full test failed at login step');
      return false;
    }
    
    // Step 3: Check token status
    this.checkTokenStatus();
    
    // Step 4: Test auth/me endpoint
    const userData = await this.testAuthMe();
    if (!userData) {
      console.error('❌ Full test failed at auth/me step');
      return false;
    }
    
    console.log('✅ Full authentication test passed!');
    return true;
  }
};

// Make it available globally for easy testing
if (typeof window !== 'undefined') {
  (window as any).authTest = authTest;
  console.log('🔧 Auth test utilities available at window.authTest');
}
