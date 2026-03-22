import { AUTH_TOKEN_KEY } from '../config';

// Get token from local storage
export const getToken = () => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

// Set token in local storage
export const setToken = (token) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

// Remove token from local storage
export const removeToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getToken();
  return !!token;
};

// Get auth header for API requests
export const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// For development - set a temporary test token
export const setDevelopmentToken = () => {
  // This is for DEVELOPMENT ONLY
  console.log('Setting development authentication token');
  
  // Using a long-lived token for development
  const devToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYxMDEyMzQ1Njc4OTAxMjM0NTY3ODkwMSIsInJvbGUiOiJkb2N0b3IiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6OTk5OTk5OTk5OX0.development_token_for_local_testing_only';
  
  setToken(devToken);
  return devToken;
};

// Enable development mode if needed
export const enableDevMode = () => {
  if (process.env.NODE_ENV === 'development') {
    if (!getToken()) {
      return setDevelopmentToken();
    }
  }
  return getToken();
}; 