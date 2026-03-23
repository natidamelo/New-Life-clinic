/**
 * Authentication Context
 * 
 * Provides authentication state and methods to the entire application.
 * This context uses the centralized AuthService for all authentication operations.
 * 
 * Best Practices Implemented:
 * - Centralized authentication state management
 * - Proper error handling and loading states
 * - Automatic token validation and refresh
 * - Type safety with TypeScript
 * - Clean separation of concerns
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/user';
import authService from '../services/authService.ts';
import { toast } from 'react-toastify';
import { getRoleBasedRoute } from '../utils/routing';

// Authentication context interface
interface AuthContextType {
  // State
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Methods
  login: (identifier: string, password: string, clinicId?: string) => Promise<User>;
  testLogin: (identifier: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
  getRoleBasedRoute: (role: string) => string;
  getToken: () => string | null;
  token?: string | null;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props interface for provider
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Authentication Provider Component
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Initialize authentication state on app startup
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 [AuthContext] Initializing authentication...');
        setIsLoading(true);

        // Check if user is authenticated
        if (authService.isAuthenticated()) {
          console.log('✅ [AuthContext] User is authenticated, loading user data...');
          
          // Get cached user data first and set it immediately for faster UI
          const cachedUser = authService.getUser();
          if (cachedUser && (cachedUser.id || cachedUser._id)) {
            setUser(cachedUser);
            setIsAuthenticated(true);
            setIsLoading(false); // Set loading to false immediately for cached data
            console.log('✅ [AuthContext] Cached user data loaded with valid ID');
            
            // Skip fetching fresh user data immediately to avoid logout issues
            // The cached user data is sufficient for initial authentication
            console.log('✅ [AuthContext] Using cached user data, skipping fresh fetch to avoid logout');
            return;
          }

          // Only if no cached data, try to fetch from server
          try {
            const freshUser = await authService.getCurrentUser();
            if (freshUser && (freshUser.id || freshUser._id)) {
              setUser(freshUser);
              setIsAuthenticated(true);
              console.log('✅ [AuthContext] Fresh user data loaded from server with valid ID');
            } else {
              console.log('❌ [AuthContext] No valid user data available, clearing authentication');
              authService.clearAuth();
              setIsAuthenticated(false);
            }
          } catch (error: any) {
            console.warn('⚠️ [AuthContext] Failed to fetch fresh user data:', error);
            console.log('❌ [AuthContext] No user data available, clearing authentication');
            authService.clearAuth();
            setIsAuthenticated(false);
          }
        } else {
          console.log('❌ [AuthContext] User is not authenticated');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('❌ [AuthContext] Error initializing authentication:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
        console.log('✅ [AuthContext] Authentication initialization complete');
      }
    };

    initializeAuth();
  }, []);

  /**
   * Login user with credentials
   */
  const login = async (identifier: string, password: string, clinicId?: string): Promise<User> => {
    try {
      console.log('🔄 [AuthContext] Attempting login...');
      setIsLoading(true);

      const response = await authService.login({ identifier, password, clinicId });
      
      if (response.success && response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        toast.success('Login successful! Welcome back.', {
          position: 'top-center',
          autoClose: 3000,
        });
        
        console.log('✅ [AuthContext] Login successful, user role:', response.data.user.role);
        return response.data.user;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('❌ [AuthContext] Login failed:', error);
      
      const errorMessage = error.message || 'Login failed. Please try again.';
      toast.error(errorMessage, {
        position: 'top-center',
        autoClose: 5000,
      });
      
      setUser(null);
      setIsAuthenticated(false);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Test login (for development)
   */
  const testLogin = async (identifier: string, password: string): Promise<User> => {
    try {
      console.log('🔄 [AuthContext] Attempting test login...');
      setIsLoading(true);

      const response = await authService.testLogin({ identifier, password });
      
      if (response.success && response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        toast.success('Test login successful!', {
          position: 'top-center',
          autoClose: 3000,
        });
        
        console.log('✅ [AuthContext] Test login successful, user role:', response.data.user.role);
        return response.data.user;
      } else {
        throw new Error(response.message || 'Test login failed');
      }
    } catch (error: any) {
      console.error('❌ [AuthContext] Test login failed:', error);
      
      const errorMessage = error.message || 'Test login failed. Please try again.';
      toast.error(errorMessage, {
        position: 'top-center',
        autoClose: 5000,
      });
      
      setUser(null);
      setIsAuthenticated(false);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = async (): Promise<void> => {
    try {
      console.log('🔄 [AuthContext] Logging out...');

      await authService.logout();
      
      setUser(null);
      setIsAuthenticated(false);
      
      toast.info('You have been logged out successfully.', {
        position: 'top-center',
        autoClose: 3000,
      });
      
      console.log('✅ [AuthContext] Logout successful');
    } catch (error) {
      console.error('❌ [AuthContext] Logout error:', error);
      
      // Clear state anyway
      setUser(null);
      setIsAuthenticated(false);
      
      toast.error('Logout failed, but you have been signed out locally.', {
        position: 'top-center',
        autoClose: 3000,
      });
    }
  };

  /**
   * Refresh user data from server
   */
  const refreshUser = async (): Promise<void> => {
    try {
      console.log('🔄 [AuthContext] Refreshing user data...');
      
      if (!authService.isAuthenticated()) {
        console.log('❌ [AuthContext] User is not authenticated, cannot refresh');
    setUser(null);
        setIsAuthenticated(false);
        return;
      }

      const freshUser = await authService.getCurrentUser();
      if (freshUser) {
        setUser(freshUser);
        setIsAuthenticated(true);
        console.log('✅ [AuthContext] User data refreshed successfully');
      } else {
        console.log('❌ [AuthContext] Failed to refresh user data');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ [AuthContext] Error refreshing user data:', error);
      
      // If refresh fails due to authentication error, clear auth state
      if ((error as any)?.response?.status === 401) {
        setUser(null);
        setIsAuthenticated(false);
        authService.clearAuth();
      }
    }
  };

  /**
   * Update user data locally (for profile updates, etc.)
   */
  const updateUser = (updatedUser: User): void => {
    try {
      console.log('🔄 [AuthContext] Updating user data locally...');
      
    setUser(updatedUser);
      
      // Also update in AuthService storage
      authService.setUser(updatedUser);
      
      console.log('✅ [AuthContext] User data updated successfully');
    } catch (error) {
      console.error('❌ [AuthContext] Error updating user data:', error);
    }
  };

  /**
   * Get authentication token
   */
  const getToken = (): string | null => {
    return authService.getToken();
  };

  /**
   * Get role-based route, with admin detection by email/username
   */
  const getRoleBasedRouteWithUser = (role: string): string => {
    return getRoleBasedRoute(role, user);
  };

  // Context value
  const contextValue: AuthContextType = {
    // State
        user,
        isLoading,
    isAuthenticated,
    
    // Methods
        login,
    testLogin,
        logout,
    refreshUser,
    updateUser,
        getRoleBasedRoute: getRoleBasedRouteWithUser,
        getToken,
        token: getToken(),
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use authentication context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

/**
 * Hook to get current user (convenience hook)
 */
export const useUser = (): User | null => {
  const { user } = useAuth();
  return user;
};

/**
 * Hook to check if user is authenticated (convenience hook)
 */
export const useIsAuthenticated = (): boolean => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
};

export default AuthContext;