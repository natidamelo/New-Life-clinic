/**
 * Centralized Authentication Utilities
 * Handles token storage, retrieval, and validation across the application
 */

// All possible token storage keys used in the application
const TOKEN_KEYS = [
  'token',
  'authToken', 
  'auth_token',
  'jwt_token',
  'clinic_auth_token',
  'AUTH_TOKEN_KEY'
];

// All possible user data storage keys
const USER_DATA_KEYS = [
  'user',
  'user_data',
  'clinic_user_data',
  'USER_DATA_KEY',
  'userData',
  'auth_user_data',
  'clinic_user'
];

/**
 * Get authentication token from localStorage
 * Checks all possible token keys for compatibility
 */
export const getAuthToken = (): string | null => {
  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token && token.trim() !== '') {
      console.log(`[AuthUtils] Found token in localStorage.${key}`);
      return token;
    }
  }
  
  console.log('[AuthUtils] No authentication token found');
  return null;
};

/**
 * Get user data from localStorage
 * Checks all possible user data keys for compatibility
 * If no user data found, attempts to restore from JWT token
 */
export const getUserData = (): any | null => {
  // First, try to find existing user data
  for (const key of USER_DATA_KEYS) {
    const userData = localStorage.getItem(key);
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        console.log(`[AuthUtils] Found user data in localStorage.${key}`);
        return parsed;
      } catch (e) {
        console.warn(`[AuthUtils] Invalid user data in localStorage.${key}`);
      }
    }
  }
  
  // If no user data found, try to restore from JWT token
  console.log('[AuthUtils] No user data found, attempting to restore from token...');
  const token = getAuthToken();
  if (token) {
    try {
      // Decode JWT payload to extract user information
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      console.log('[AuthUtils] Decoded token payload:', decoded);
      
      // Create user data from token payload
      const userData = {
        id: decoded.userId || decoded.id || decoded.user_id,
        _id: decoded.userId || decoded.id || decoded.user_id,
        email: decoded.email || 'user@clinic.com',
        name: decoded.name || 'User',
        role: decoded.role || 'user',
        firstName: decoded.firstName || decoded.first_name || 'User',
        lastName: decoded.lastName || decoded.last_name || 'Name'
      };
      
      // Store the restored user data for future use
      localStorage.setItem('clinic_user_data', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('[AuthUtils] User data restored from token:', userData);
      
      return userData;
    } catch (e) {
      console.error('[AuthUtils] Failed to restore user data from token:', e);
    }
  }
  
  console.log('[AuthUtils] No user data found and token restoration failed');
  return null;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const userData = getUserData();
  
  const authenticated = !!(token && userData);
  console.log(`[AuthUtils] Authentication status: ${authenticated}`);
  return authenticated;
};

/**
 * Get authentication headers for API requests
 */
export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  
  if (!token) {
    console.log('[AuthUtils] No token available for auth headers');
    return {};
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Clear all authentication data
 */
export const clearAuthData = (): void => {
  console.log('[AuthUtils] Clearing all authentication data');
  
  // Clear all possible token keys
  TOKEN_KEYS.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  
  // Clear all possible user data keys
  USER_DATA_KEYS.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
  
  console.log('[AuthUtils] Authentication data cleared');
};

/**
 * Set authentication token and user data
 */
export const setAuthData = (token: string, userData: any): void => {
  console.log('[AuthUtils] Setting authentication data');
  
  // Store token in primary key
  localStorage.setItem('clinic_auth_token', token);
  localStorage.setItem('clinic_user_data', JSON.stringify(userData));
  
  // Also store in legacy keys for compatibility
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(userData));
  
  console.log('[AuthUtils] Authentication data set successfully');
};

/**
 * Validate token format (basic JWT structure check)
 */
export const isValidTokenFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Basic JWT structure check (3 parts separated by dots)
  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * Check if token is expired (basic check without full JWT parsing)
 */
export const isTokenExpired = (token: string): boolean => {
  if (!isValidTokenFormat(token)) {
    return true;
  }
  
  try {
    // Decode JWT payload (without verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    return payload.exp && payload.exp < currentTime;
  } catch (error) {
    console.warn('[AuthUtils] Error checking token expiration:', error);
    return true;
  }
};

/**
 * Get token expiration info
 */
export const getTokenInfo = (token: string): { expired: boolean; expiresAt?: Date; userId?: string } => {
  if (!isValidTokenFormat(token)) {
    return { expired: true };
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const expired = payload.exp && payload.exp < currentTime;
    const expiresAt = payload.exp ? new Date(payload.exp * 1000) : undefined;
    
    return {
      expired,
      expiresAt,
      userId: payload.userId || payload.id || payload.user_id
    };
  } catch (error) {
    console.warn('[AuthUtils] Error parsing token:', error);
    return { expired: true };
  }
};

/**
 * Create authenticated fetch options
 */
export const createAuthenticatedFetchOptions = (options: RequestInit = {}): RequestInit => {
  const authHeaders = getAuthHeaders();
  
  return {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers
    }
  };
};

/**
 * Handle authentication errors
 */
export const handleAuthError = (error: any): void => {
  console.error('[AuthUtils] Authentication error:', error);
  
  if (error.response?.status === 401) {
    console.log('[AuthUtils] 401 Unauthorized - clearing auth data');
    clearAuthData();
    
    // Show user-friendly message
    if (typeof window !== 'undefined' && window.alert) {
      alert('Your session has expired. Please log in again.');
    }
    
    // Redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
};
