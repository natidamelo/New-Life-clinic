// Test authentication utility for development
// This file helps test the financial endpoints by providing admin credentials

import api from '../services/api';

export const testAdminLogin = async () => {
  try {
    console.log('🔐 Testing admin login...');
    
    const response = await api.post('/api/auth/test-login', {
      identifier: 'admin@clinic.com',
      password: 'admin123'
    });
    
    if (response.data.success) {
      const { token, user } = response.data.data;
      
      // Store the token and user data
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      
      console.log('✅ Admin login successful:', user);
      console.log('🔑 Token stored in localStorage');
      
      // Update the API instance with the new token
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { success: true, user, token };
    } else {
      throw new Error('Login failed');
    }
  } catch (error) {
    console.error('❌ Admin login failed:', error);
    return { success: false, error: error.message };
  }
};

export const testReceptionLogin = async () => {
  try {
    console.log('🔐 Testing reception login...');
    
    // Use the real backend login with actual user from database
    const response = await api.post('/api/auth/test-login', {
      identifier: 'meronabebe@clinic.com',
      password: 'reception123' // You'll need to provide the actual password
    });
    
    if (response.data.success) {
      const { token, user } = response.data.data;
      
      // Store the token and user data
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      
      console.log('✅ Reception login successful:', user);
      console.log('🔑 Token stored in localStorage');
      
      // Update the API instance with the new token
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { success: true, user, token };
    } else {
      throw new Error('Login failed');
    }
  } catch (error) {
    console.error('❌ Reception login failed:', error);
    return { success: false, error: error.message };
  }
};

export const testFinancialEndpoints = async () => {
  try {
    console.log('🧪 Testing financial endpoints...');
    
    // Test financial summary
    const summaryResponse = await api.get('/api/billing/financial-summary');
    console.log('✅ Financial summary:', summaryResponse.data);
    
    // Test aging report
    const agingResponse = await api.get('/api/billing/aging-report');
    console.log('✅ Aging report:', agingResponse.data);
    
    // Test monthly data
    const monthlyResponse = await api.get('/api/billing/monthly-data');
    console.log('✅ Monthly data:', monthlyResponse.data);
    
    return { success: true };
  } catch (error) {
    console.error('❌ Financial endpoints test failed:', error);
    return { success: false, error: error.message };
  }
};

// Add to window for easy access in browser console
if (typeof window !== 'undefined') {
  window.testAuth = {
    login: testAdminLogin,
    loginReception: testReceptionLogin,
    testFinancial: testFinancialEndpoints
  };
  
  console.log('🔧 Test auth utilities available. Use:');
  console.log('  window.testAuth.login() - to login as admin');
  console.log('  window.testAuth.loginReception() - to login as reception');
  console.log('  window.testAuth.testFinancial() - to test financial endpoints');
  
  // Auto-login as reception if not already authenticated
  const existingToken = localStorage.getItem('auth_token') || localStorage.getItem('AUTH_TOKEN_KEY');
  if (!existingToken) {
    console.log('🔐 Auto-login as reception for development...');
    testReceptionLogin();
  } else {
    console.log('✅ Already authenticated, skipping auto-login');
  }
} 