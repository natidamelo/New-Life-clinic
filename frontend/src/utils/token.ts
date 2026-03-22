import api from '../services/api';
import { USER_DATA_KEY } from '../config/index';
import { AUTH_TOKEN_KEY } from '../config';

/**
 * Enhanced token utility functions for managing authentication tokens
 */

// Token storage keys
export const TOKEN_KEYS = {
  PRIMARY: AUTH_TOKEN_KEY,
  LEGACY: 'token',
  AUTH: 'authToken'
};

/**
 * Set authentication token in localStorage and update API headers
 * @param token The JWT token string
 */
export const setToken = (token: string): void => {
  if (!token) return;
  
  // Store token in multiple locations for backwards compatibility
  localStorage.setItem(TOKEN_KEYS.PRIMARY, token);
  localStorage.setItem(TOKEN_KEYS.LEGACY, token);
  localStorage.setItem(TOKEN_KEYS.AUTH, token);
  
  // Set Authorization header for API requests
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  
  console.log('[Token Utility] Authentication token set successfully');
};

/**
 * Get the current authentication token
 * @returns The JWT token string or null if not found
 */
export const getToken = (): string | null => {
  // Try all possible token keys
  for (const key of Object.values(TOKEN_KEYS)) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }
  return null;
};

/**
 * Clear all authentication tokens and headers
 */
export const clearToken = (): void => {
  // Remove all token variants
  Object.values(TOKEN_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear user data
  localStorage.removeItem(USER_DATA_KEY);
  
  // Remove Authorization header
  delete api.defaults.headers.common['Authorization'];
  
  console.log('[Token Utility] All authentication tokens cleared');
};

/**
 * Check if user is authenticated
 * @returns Boolean indicating if a valid token exists
 */
export const isAuthenticated = (): boolean => {
  return getToken() !== null;
};

/**
 * Set a development token for testing purposes
 * This should only be used in development environments
 */
export const setDevelopmentToken = (): string => {
  // Generate a token with extended expiry for development
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODIzMzAxY2RlZmM3Nzc2YmY3NTM3YjMiLCJyb2xlIjoiZG9jdG9yIiwiaWF0IjoxNzQ4NDQ1NzkwLCJleHAiOjE4MDY0NDU3OTB9.VQm28AW4xbf_VTlR4x78mUXE1U_NBi-fGO5aJfVtK5A';
  
  // Store token and set in headers
  setToken(testToken);
  
  // Create test user data
  const userData = {
    id: '6823301cdefc7776bf7537b3',
    role: 'doctor',
    name: 'Doctor Test User',
    email: 'doctor@test.com'
  };
  
  // Store user data
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
  
  console.log('[Token Utility] Development token set');
  return testToken;
};

// Add this utility to the window object for console debugging
if (typeof window !== 'undefined' && 
    (import.meta.env.DEV || window.location.hostname === 'localhost' || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'))) {
  (window as any).tokenUtils = {
    setToken,
    getToken,
    clearToken,
    isAuthenticated,
    setDevelopmentToken,
    
    // Additional debug functions
    checkTokenStatus: () => {
      const token = getToken();
      if (!token) return { status: 'No token found' };
      
      try {
        // Decode token to check expiry
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        const now = Date.now() / 1000;
        
        return {
          status: 'Token found',
          token: token.substring(0, 15) + '...',
          payload,
          isExpired: payload.exp < now,
          timeRemaining: payload.exp - now,
          headers: api.defaults.headers.common
        };
      } catch (error) {
        return { status: 'Invalid token format', error };
      }
    },
    
    resetAuth: () => {
      clearToken();
      window.location.href = '/login';
      return 'Auth reset. Redirecting to login page...';
    }
  };
}

export default {
  setToken,
  getToken,
  clearToken,
  isAuthenticated,
  setDevelopmentToken
}; 