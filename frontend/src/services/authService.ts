/**
 * Centralized Authentication Service
 * 
 * This service handles all authentication-related operations including:
 * - Token management (storage, retrieval, validation)
 * - User authentication (login, logout)
 * - Token refresh and expiration handling
 * - Secure storage practices
 * 
 * Best Practices Implemented:
 * - Single source of truth for authentication state
 * - Secure token storage with fallback mechanisms
 * - Automatic token refresh
 * - Proper error handling and logging
 * - Type safety with TypeScript
 */

import { jwtDecode } from 'jwt-decode';
import { User } from '../types/user';
import api from './apiService';

// Constants
const TOKEN_KEY = 'clinic_auth_token';
const USER_KEY = 'clinic_user_data';
const REFRESH_TOKEN_KEY = 'clinic_refresh_token';

// Token payload interface
interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  username?: string;
  iat: number;
  exp: number;
}

// Authentication response interface
interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
    refreshToken?: string;
  };
  message?: string;
}

// Login credentials interface
interface LoginCredentials {
  identifier: string;
  password: string;
}

class AuthService {
  private static instance: AuthService;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private constructor() {
    this.initializeTokenRefresh();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Store authentication token securely
   */
  private setToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      
      // Verify the token was stored (silent verification)
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken !== token) {
        console.error('❌ [AuthService] Token storage verification failed');
      }
    } catch (error) {
      console.error('❌ [AuthService] Failed to store token:', error);
      // Fallback to sessionStorage if localStorage fails
      try {
        sessionStorage.setItem(TOKEN_KEY, token);
      } catch (fallbackError) {
        console.error('❌ [AuthService] Failed to store token in sessionStorage:', fallbackError);
      }
    }
  }

  /**
   * Retrieve authentication token
   */
  public getToken(): string | null {
    try {
      // Try localStorage first
      let token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        return token;
      }

      // Fallback to sessionStorage
      token = sessionStorage.getItem(TOKEN_KEY);
      if (token) {
        // Migrate to localStorage if possible
        try {
          localStorage.setItem(TOKEN_KEY, token);
          sessionStorage.removeItem(TOKEN_KEY);
        } catch (error) {
          console.warn('⚠️ [AuthService] Could not migrate token to localStorage');
        }
        return token;
      }

      // Check for legacy token keys and migrate
      const legacyKeys = [
        'auth_token',
        'AUTH_TOKEN_KEY',
        'authToken',
        'jwt_token',
        'token'
      ];

      for (const key of legacyKeys) {
        token = localStorage.getItem(key);
        if (token) {
          this.setToken(token);
          localStorage.removeItem(key);
          return token;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ [AuthService] Error retrieving token:', error);
      return null;
    }
  }

  /**
   * Store user data
   */
  public setUser(user: User): void {
    try {
      console.log('🔍 [AuthService] Storing user data:', { 
        key: USER_KEY, 
        userId: user.id,
        userName: user.name,
        userRole: user.role
      });
      
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      console.log('✅ [AuthService] User data stored successfully in localStorage');
      
      // Verify the user was stored
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.id === user.id) {
          console.log('✅ [AuthService] User storage verified');
        } else {
          console.error('❌ [AuthService] User storage verification failed');
        }
      }
    } catch (error) {
      console.error('❌ [AuthService] Failed to store user data:', error);
    }
  }

  /**
   * Retrieve user data
   */
  public getUser(): User | null {
    try {
      const userData = localStorage.getItem(USER_KEY);
      if (userData) {
        const user = JSON.parse(userData);
        if (user._id && !user.id) {
          user.id = user._id;
        }
        return user;
      }
      return null;
    } catch (error) {
      console.error('❌ [AuthService] Error retrieving user data:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = jwtDecode<TokenPayload>(token);
      if (payload.exp < Date.now() / 1000) {
        this.clearAuth();
        return false;
      }
      return true;
    } catch {
      this.clearAuth();
      return false;
    }
  }

  /**
   * Get token expiration time
   */
  public getTokenExpiration(): Date | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = jwtDecode<TokenPayload>(token);
      return new Date(payload.exp * 1000);
    } catch (error) {
      console.error('❌ [AuthService] Error decoding token:', error);
      return null;
    }
  }

  /**
   * Check if token will expire soon (within 5 minutes)
   */
  public isTokenExpiringSoon(): boolean {
    const expiration = this.getTokenExpiration();
    if (!expiration) return true;

    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return expiration <= fiveMinutesFromNow;
  }

  /**
   * Login user
   */
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('🔄 [AuthService] Attempting login...');
      console.log('🔍 [AuthService] Login credentials:', { 
        identifier: credentials.identifier, 
        hasPassword: !!credentials.password 
      });
      
      // Use backend authentication for all users
      try {
        // Ensure credentials are properly formatted
        const identifier = credentials.identifier?.trim() || '';
        const password = credentials.password || '';
        
        // Validate that we have both fields before sending
        if (!identifier) {
          throw new Error('Username or email is required');
        }
        if (!password) {
          throw new Error('Password is required');
        }
        
        // Send both identifier and email to ensure compatibility
        // Some backend validations might check for email field
        const loginPayload: any = {
          identifier: identifier,
          password: password
        };
        
        // If identifier looks like an email, also send it as email field
        // This helps with backend validation that might check for email
        if (identifier.includes('@')) {
          loginPayload.email = identifier;
        }
        
        console.log('🔍 [AuthService] Sending login request with payload:', {
          identifier: loginPayload.identifier,
          identifierLength: loginPayload.identifier.length,
          hasPassword: !!loginPayload.password,
          passwordLength: loginPayload.password.length
        });
        
        console.log('📤 [AuthService] Sending POST to /api/auth/login');
        const response = await api.post('/api/auth/login', loginPayload, { skipAuth: true });
        
        if (response.data.success && response.data.data) {
          const { user, token, refreshToken } = response.data.data;
          
          // Store authentication data
          this.setToken(token);
          this.setUser(user);
          
          if (refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
          }

          // Set up token refresh
          this.setupTokenRefresh();
          
          console.log('✅ [AuthService] Backend login successful');
          return response.data;
        } else {
          const errorMessage = response.data.message || 'Login failed';
          console.error('❌ [AuthService] Login response indicates failure:', errorMessage);
          throw new Error(errorMessage);
        }
      } catch (backendError: any) {
        console.error('❌ [AuthService] Backend authentication failed');
        console.error('   Error details:', {
          message: backendError.message,
          response: backendError.response?.data,
          status: backendError.response?.status,
          statusText: backendError.response?.statusText
        });
        
        // Log the full response data for debugging
        if (backendError.response?.data) {
          console.error('   Full response data:', JSON.stringify(backendError.response.data, null, 2));
        }
        
        // Extract error message from backend response
        let errorMessage = 'Authentication failed. Please check your credentials.';
        
        if (backendError.response) {
          // Backend responded with an error
          const responseData = backendError.response.data;
          const status = backendError.response.status;
          
          if (status === 404) {
            // Route not found - this usually means the backend route isn't registered
            errorMessage = 'Authentication endpoint not found. Please ensure the backend server is running the latest version with the test-login route.';
          } else if (status === 503) {
            errorMessage = 'Database unavailable. Please ensure MongoDB is running and try again.';
          } else if (status === 401) {
            errorMessage = 'Invalid credentials. Please check your username/email and password.';
          } else if (status === 400) {
            // Handle validation errors - they might be in an errors array or message
            console.log('🔍 [AuthService] Processing 400 error response:', responseData);
            
            if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
              // Extract validation error messages
              const validationMessages = responseData.errors.map((err: any) => {
                // Handle different error formats
                if (typeof err === 'string') return err;
                return err.message || err.msg || `${err.field}: ${err.message || err.msg || 'validation error'}`;
              }).join(', ');
              errorMessage = validationMessages || responseData.message || 'Invalid request. Please check your input.';
              console.log('🔍 [AuthService] Extracted validation errors:', validationMessages);
            } else if (responseData?.message) {
              errorMessage = responseData.message;
              console.log('🔍 [AuthService] Using response message:', errorMessage);
            } else {
              errorMessage = 'Invalid request. Please check your input.';
            }
          } else if (responseData?.message) {
            errorMessage = responseData.message;
          } else if (status >= 500) {
            errorMessage = 'Server error. Please try again later or contact support.';
          }
        } else if (backendError.request) {
          // Request was made but no response received
          if (backendError.code === 'ECONNABORTED' || backendError.message?.includes('timeout')) {
            errorMessage = 'Connection timeout. Please ensure the backend server is running on port 5002.';
          } else if (backendError.message?.includes('Network Error') || backendError.message?.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to server. Please ensure the backend server is running.';
          } else {
            errorMessage = 'Network error. Please check your connection and try again.';
          }
        } else {
          // Error setting up the request
          errorMessage = backendError.message || 'An unexpected error occurred. Please try again.';
        }
        
        console.error('❌ [AuthService] Throwing error:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ [AuthService] Login failed:', error);
      // Re-throw the error with its message (already formatted above)
      throw error;
    }
  }

  /**
   * Test login (for development)
   */
  public async testLogin(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('🔄 [AuthService] Attempting test login...');
      
      const response = await api.post('/api/auth/test-login', credentials);
      
      if (response.data.success && response.data.data) {
        const { user, token } = response.data.data;
        
        // Store authentication data
        this.setToken(token);
        this.setUser(user);
        
        // Set up token refresh
        this.setupTokenRefresh();
        
        console.log('✅ [AuthService] Test login successful');
        return response.data;
      } else {
        throw new Error(response.data.message || 'Test login failed');
      }
    } catch (error: any) {
      console.error('❌ [AuthService] Test login failed:', error);
      throw new Error(error.response?.data?.message || error.message || 'Test login failed');
    }
  }

  /**
   * Logout user
   */
  public async logout(): Promise<void> {
    try {
      console.log('🔄 [AuthService] Logging out...');
      
      // Try to notify server about logout
      try {
        await api.post('/api/auth/logout');
      } catch (error) {
        console.warn('⚠️ [AuthService] Server logout notification failed:', error);
      }
      
      this.clearAuth();
      console.log('✅ [AuthService] Logout successful');
    } catch (error) {
      console.error('❌ [AuthService] Logout error:', error);
      // Clear auth data anyway
      this.clearAuth();
    }
  }

  /**
   * Clear all authentication data
   */
  public clearAuth(): void {
    try {
      // Clear tokens
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      
      // Clear legacy token keys
      const legacyKeys = [
        'auth_token',
        'AUTH_TOKEN_KEY',
        'authToken',
        'jwt_token',
        'token',
        'user_data'
      ];
      
      legacyKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });

      // Clear token refresh timer
      if (this.tokenRefreshTimer) {
        clearTimeout(this.tokenRefreshTimer);
        this.tokenRefreshTimer = null;
      }

      console.log('✅ [AuthService] Authentication data cleared');
    } catch (error) {
      console.error('❌ [AuthService] Error clearing auth data:', error);
    }
  }

  /**
   * Refresh authentication token
   */
  public async refreshToken(): Promise<string | null> {
    if (this.isRefreshing) {
      // If already refreshing, wait for it to complete
      return new Promise((resolve) => {
        this.refreshSubscribers.push(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      console.log('🔄 [AuthService] Refreshing token...');
      
      const response = await api.post('/api/auth/refresh', { refreshToken });
      
      if (response.data.success && response.data.data) {
        const { token, refreshToken: newRefreshToken } = response.data.data;
        
        this.setToken(token);
        if (newRefreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
        }

        // Notify all subscribers
        this.refreshSubscribers.forEach(callback => callback(token));
        this.refreshSubscribers = [];

        this.setupTokenRefresh();
        console.log('✅ [AuthService] Token refreshed successfully');
        
        return token;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error: any) {
      console.error('❌ [AuthService] Token refresh failed:', error);
      this.clearAuth();
      
      // Notify subscribers of failure
      this.refreshSubscribers.forEach(callback => callback(''));
      this.refreshSubscribers = [];
      
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Get current user profile from server
   */
  public async getCurrentUser(): Promise<User | null> {
    try {
      console.log('🔄 [AuthService] Fetching current user...');
      
      const response = await api.get('/api/auth/me');
      
      if (response.data.success && response.data.data) {
        const user = response.data.data.user || response.data.data;
        
        // Ensure user has an id field
        if (user._id && !user.id) {
          user.id = user._id;
        }
        
        this.setUser(user);
        console.log('✅ [AuthService] Current user fetched successfully');
        return user;
      } else {
        throw new Error('Failed to fetch current user');
      }
    } catch (error: any) {
      console.error('❌ [AuthService] Failed to fetch current user:', error);
      
      // If it's a 401 error, clear auth data
      if (error.response?.status === 401) {
        this.clearAuth();
      }
      
      return null;
    }
  }

  /**
   * Initialize token refresh on app startup
   */
  private initializeTokenRefresh(): void {
    if (this.isAuthenticated()) {
      this.setupTokenRefresh();
    }
  }

  /**
   * Set up automatic token refresh
   */
  private setupTokenRefresh(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
    }

    const expiration = this.getTokenExpiration();
    if (!expiration) return;

    // Refresh token 5 minutes before expiration
    const refreshTime = expiration.getTime() - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.tokenRefreshTimer = setTimeout(() => {
        this.refreshToken();
      }, refreshTime);
      
      console.log(`⏰ [AuthService] Token refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`);
    } else {
      // Token is already expired or will expire very soon
      console.log('⚠️ [AuthService] Token is expired or expiring soon, refreshing now...');
      this.refreshToken();
    }
  }

  /**
   * Subscribe to token refresh events
   */
  public onTokenRefresh(callback: (token: string) => void): void {
    this.refreshSubscribers.push(callback);
  }
}

// Export singleton instance
export default AuthService.getInstance();
