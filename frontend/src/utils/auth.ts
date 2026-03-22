/**
 * Legacy Auth Utilities
 * 
 * This file is kept for backward compatibility but most functions
 * have been moved to the centralized AuthService.
 * 
 * @deprecated Use AuthService instead
 */

import { AUTH_TOKEN_KEY, USER_DATA_KEY } from '../config';

// Legacy token keys for migration purposes
const LEGACY_TOKEN_KEYS = [
  'auth_token',
  'AUTH_TOKEN_KEY', 
  'authToken',
  'jwt_token',
  'token'
];

/**
 * @deprecated Use AuthService.setToken() instead
 */
export const setAuthToken = (token: string): void => {
  console.warn('⚠️ setAuthToken is deprecated. Use AuthService instead.');
  if (!token) {
    removeAuthToken();
    return;
  }
  
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error('❌ Error setting auth token:', error);
  }
};

/**
 * @deprecated Use AuthService.getToken() instead
 */
export const getEffectiveToken = (): string | null => {
  console.warn('⚠️ getEffectiveToken is deprecated. Use AuthService instead.');
  try {
    // Check new token key first
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) return token;

    // Check legacy keys for migration
    for (const key of LEGACY_TOKEN_KEYS) {
      const legacyToken = localStorage.getItem(key);
      if (legacyToken) {
        // Migrate to new key
        localStorage.setItem(AUTH_TOKEN_KEY, legacyToken);
        localStorage.removeItem(key);
        return legacyToken;
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting token:', error);
    return null;
  }
};

/**
 * @deprecated Use AuthService.getToken() instead
 */
export const getAuthToken = (): string | null => {
  return getEffectiveToken();
};

/**
 * @deprecated Use AuthService.clearAuth() instead
 */
export const removeAuthToken = (): void => {
  console.warn('⚠️ removeAuthToken is deprecated. Use AuthService instead.');
  
  // Remove from new location
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
  
  // Remove from legacy locations
  LEGACY_TOKEN_KEYS.forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log('Auth tokens removed');
};

/**
 * @deprecated Use AuthService instead
 */
export const initializeAuthFromStorage = (): void => {
  console.warn('⚠️ initializeAuthFromStorage is deprecated. Use AuthService instead.');
};

/**
 * @deprecated Use AuthService instead
 */
export const consolidateAuthToken = (): void => {
  console.warn('⚠️ consolidateAuthToken is deprecated. Use AuthService instead.');
}; 