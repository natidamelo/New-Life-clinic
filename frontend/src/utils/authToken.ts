/**
 * Centralized Authentication Token Utility
 * 
 * This utility provides a consistent way to retrieve authentication tokens
 * across all components and services in the application.
 * 
 * It checks multiple storage locations and token keys to ensure
 * compatibility with different authentication flows.
 */

/**
 * Get the current authentication token from storage
 * @returns The JWT token string or null if not found
 */
export const getAuthToken = (): string | null => {
  const tokenKeys = [
    'clinic_auth_token',  // Primary token key used by AuthService
    'auth_token',         // Alternative token key
    'AUTH_TOKEN_KEY',     // Config-based token key
    'authToken',          // Camel case variant
    'jwt_token',          // JWT-specific key
    'token'               // Generic token key
  ];

  // Check localStorage first
  for (const key of tokenKeys) {
    const token = localStorage.getItem(key);
    if (token) {
      console.log(`🔐 [AuthToken] Found token with key: ${key}`);
      return token;
    }
  }

  // Check sessionStorage as fallback
  for (const key of tokenKeys) {
    const token = sessionStorage.getItem(key);
    if (token) {
      console.log(`🔐 [AuthToken] Found token in sessionStorage with key: ${key}`);
      return token;
    }
  }

  console.log('❌ [AuthToken] No token found in any storage location');
  return null;
};

/**
 * Check if user is authenticated by verifying token existence
 * @returns Boolean indicating if a valid token exists
 */
export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};

/**
 * Get authentication headers for API requests
 * @returns Object with Authorization header or empty object
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
 * Clear all authentication tokens from storage
 */
export const clearAuthTokens = (): void => {
  const tokenKeys = [
    'clinic_auth_token',
    'auth_token',
    'AUTH_TOKEN_KEY',
    'authToken',
    'jwt_token',
    'token',
    'clinic_user_data',
    'user_data',
    'user'
  ];

  tokenKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  console.log('🧹 [AuthToken] All authentication tokens cleared');
};

/**
 * Debug function to check token status
 * @returns Object with token information for debugging
 */
export const debugTokenStatus = () => {
  const token = getAuthToken();
  if (!token) {
    return { status: 'No token found' };
  }
  
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
      timeRemainingMinutes: Math.round((payload.exp - now) / 60)
    };
  } catch (error) {
    return { status: 'Invalid token format', error };
  }
};

// Export default for convenience
export default {
  getAuthToken,
  isAuthenticated,
  getAuthHeaders,
  clearAuthTokens,
  debugTokenStatus
};
