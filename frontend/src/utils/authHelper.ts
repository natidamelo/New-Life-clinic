/**
 * Authentication Helper Utilities
 * 
 * This file provides centralized authentication utilities to replace
 * manual localStorage.getItem() calls throughout the application.
 * 
 * Best Practices:
 * - Single source of truth for token retrieval
 * - Consistent error handling
 * - Automatic token validation
 * - Fallback mechanisms for legacy tokens
 */

import authService from '../services/authService';

/**
 * Get the current authentication token
 * This is the recommended way to get tokens instead of manual localStorage calls
 */
export const getAuthToken = (): string | null => {
  try {
    return authService.getToken();
  } catch (error) {
    console.error('❌ [AuthHelper] Error getting auth token:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  return !!token;
};

/**
 * Get authentication headers for API requests
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  if (!token) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Create fetch options with authentication headers
 */
export const createAuthenticatedFetchOptions = (options: RequestInit = {}): RequestInit => {
  const authHeaders = getAuthHeaders();
  
  return {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  };
};

/**
 * Legacy token migration helper
 * This helps migrate from old token storage patterns to the new centralized system
 */
export const migrateLegacyTokens = (): void => {
  const legacyKeys = [
    'auth_token',
    'AUTH_TOKEN_KEY',
    'authToken',
    'jwt_token',
    'token'
  ];
  
  for (const key of legacyKeys) {
    const token = localStorage.getItem(key);
    if (token) {
      console.log(`🔄 [AuthHelper] Migrating legacy token from ${key}`);
      try {
        localStorage.setItem('clinic_auth_token', token);
      } catch (e) {}
      localStorage.removeItem(key);
      break; // Only migrate the first found token
    }
  }
};

/**
 * Debug helper to check authentication status
 */
export const debugAuthStatus = (): void => {
  console.log('=== AUTH DEBUG STATUS ===');
  console.log('🔐 Current token:', getAuthToken() ? 'Present' : 'Missing');
  console.log('✅ Is authenticated:', isAuthenticated());
  
  // Check all possible token locations
  const allKeys = [
    'clinic_auth_token',
    'auth_token',
    'AUTH_TOKEN_KEY',
    'authToken',
    'jwt_token',
    'token'
  ];
  
  console.log('📍 Token storage status:');
  allKeys.forEach(key => {
    const token = localStorage.getItem(key);
    console.log(`  ${key}: ${token ? 'Present' : 'Missing'}`);
  });
  
  console.log('=== END AUTH DEBUG ===');
};
