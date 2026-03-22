/**
 * Test utility to verify authentication token retrieval
 * This can be used for debugging authentication issues
 */

import { getAuthToken, debugTokenStatus } from './authToken';

/**
 * Test authentication token retrieval
 */
export const testAuthToken = () => {
  console.log('🧪 [TestAuth] Testing authentication token retrieval...');
  
  const token = getAuthToken();
  console.log('🧪 [TestAuth] Token retrieved:', token ? 'Found' : 'Not found');
  
  if (token) {
    console.log('🧪 [TestAuth] Token preview:', token.substring(0, 50) + '...');
    console.log('🧪 [TestAuth] Token length:', token.length);
  }
  
  const debugInfo = debugTokenStatus();
  console.log('🧪 [TestAuth] Debug info:', debugInfo);
  
  return {
    hasToken: !!token,
    token: token,
    debugInfo: debugInfo
  };
};

/**
 * Test admin login (stub for compatibility)
 */
export const testAdminLogin = async () => {
  console.log('🧪 [TestAuth] Testing admin login...');
  return { success: true, message: 'Admin login test stub' };
};

/**
 * Test financial endpoints (stub for compatibility)
 */
export const testFinancialEndpoints = async () => {
  console.log('🧪 [TestAuth] Testing financial endpoints...');
  return { success: true, message: 'Financial endpoints test stub' };
};

/**
 * Test API call with authentication
 */
export const testApiCall = async (url: string = '/api/ping') => {
  console.log('🧪 [TestAuth] Testing API call to:', url);
  
  const token = getAuthToken();
  if (!token) {
    console.error('🧪 [TestAuth] No token available for API call');
    return { success: false, error: 'No token available' };
  }
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('🧪 [TestAuth] API response:', data);
    
    return {
      success: response.ok,
      status: response.status,
      data: data
    };
  } catch (error) {
    console.error('🧪 [TestAuth] API call failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
