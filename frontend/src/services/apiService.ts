/**
 * Centralized API Service
 * 
 * This service provides a single, configured axios instance for all API calls.
 * It handles:
 * - Automatic token attachment
 * - Request/response interceptors
 * - Error handling and retry logic
 * - Server URL detection and fallback
 * - Proper logging and debugging
 * 
 * Best Practices Implemented:
 * - Single axios instance to avoid conflicts
 * - Automatic token management
 * - Comprehensive error handling
 * - Request/response logging for debugging
 * - Retry logic for network failures
 * - Type safety with TypeScript
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Extended AxiosRequestConfig to support skipAuth flag
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  skipAuth?: boolean;
}
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../config';
import { getAuthToken, getClinicTenantId, CLINIC_TENANT_KEY } from '../utils/authToken';

// Request retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

class ApiService {
  private static instance: ApiService;
  private axiosInstance: AxiosInstance;
  private baseURL: string;
  private isServerTested = false;
  private lastTimeoutToastTime = 0;
  private readonly TIMEOUT_TOAST_COOLDOWN = 10000; // 10 seconds between timeout toasts

  private constructor() {
    this.baseURL = API_BASE_URL;
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * Get the axios instance
   */
  public get api(): AxiosInstance {
    return this.axiosInstance;
  }

  /**
   * Create axios instance with default configuration
   */
  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // Increased to 30 seconds for patient assignment operations
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: false, // Don't send cookies by default
    });

    return instance;
  }

  /**
   * Find and set working server URL - uses config-detected URL directly, no probing
   */
  private async findWorkingServerUrl(): Promise<string> {
    if (this.isServerTested) {
      return this.baseURL;
    }
    // Trust the URL already determined by config/index.ts at startup
    this.isServerTested = true;
    console.log(`✅ [ApiService] Using configured base URL: ${this.baseURL || '(proxy)'}`);
    return this.baseURL;
  }

  /**
   * Get authentication token using centralized utility
   */
  private getAuthToken(): string | null {
    return getAuthToken();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Ensure we have a working server URL
        if (!this.isServerTested) {
          await this.findWorkingServerUrl();
        }

        // Add authentication token (skip if explicitly disabled)
        const skipAuth = config.skipAuth || false;
        if (!skipAuth) {
          const token = this.getAuthToken();
          if (token && config.headers) {
            const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            config.headers.Authorization = authHeader;
          }
        }

        // Tenant context for super_admin data scope + consistent clinic routing
        const tenantId = getClinicTenantId();
        if (tenantId && config.headers) {
          (config.headers as Record<string, string>)['x-clinic-id'] = tenantId;
        }

        // Super-admin clinic CRUD: Clinic model has no clinicId; these routes don't need the header.
        // Omitting it avoids CORS preflight failures when the API hasn't redeployed with
        // Access-Control-Allow-Headers including x-clinic-id yet.
        const pathOnly = (config.url || '').split('?')[0];
        if (pathOnly.startsWith('/api/clinics') && config.headers) {
          delete (config.headers as Record<string, unknown>)['x-clinic-id'];
        }

        return config;
      },
      (error: AxiosError) => {
        console.error('❌ [ApiService] Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const status = error.response?.status;
        const url = error.config?.url;

        // Handle specific error cases
        await this.handleApiError(error);
        
        // For timeout errors, provide more specific error message
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          const baseUrl = this.getBaseURL() || 'http://localhost:5002';
          const timeoutError = new Error(
            `Request timeout: ${url} is not responding. ` +
            `Backend server may not be running. ` +
            `Please ensure the backend server is running on ${baseUrl}`
          );
          timeoutError.name = 'TimeoutError';
          
          // Log detailed diagnostics
          console.error('❌ [ApiService] Request timeout detected');
          console.error(`   URL: ${url}`);
          console.error(`   Base URL: ${baseUrl}`);
          console.error(`   Full URL: ${baseUrl}${url}`);
          console.error('   Possible causes:');
          console.error('   1. Backend server is not running');
          console.error('   2. Backend server is running on a different port');
          console.error('   3. Firewall is blocking the connection');
          console.error('   4. Network connectivity issues');
          
          return Promise.reject(timeoutError);
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Handle API errors with appropriate actions
   */
  private async handleApiError(error: AxiosError): Promise<void> {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const errorData = error.response?.data as any;
    const errorMessage = errorData?.message || error.message;
    const errorCode = errorData?.code;

    switch (status) {
      case 401:
        await this.handle401Error(url, errorMessage, errorCode);
        break;
        
      case 403:
        this.handle403Error(errorMessage);
        break;
        
      case 404:
        this.handle404Error(url, errorMessage);
        break;
        
      case 429:
        this.handle429Error();
        break;
        
      case 500:
      case 502:
      case 503:
      case 504:
        this.handle5xxError(status, errorMessage);
        break;
        
      default:
        if (!error.response) {
          await this.handleNetworkError(error);
        }
        break;
    }
  }

  /**
   * Handle 401 Unauthorized errors
   */
  private async handle401Error(url: string, message: string, code?: string): Promise<void> {
    console.log('🔐 [ApiService] Handling 401 Unauthorized error');
    
    // Check if this is a token-related error (including user not found in DB - stale token)
    const isTokenError = code === 'AUTH_TOKEN_EXPIRED' || 
                        code === 'AUTH_INVALID_TOKEN' || 
                        code === 'AUTH_NO_TOKEN' ||
                        code === 'AUTH_USER_NOT_FOUND' ||
                        code === 'AUTH_INVALID_PAYLOAD' ||
                        message.includes('expired') ||
                        message.includes('invalid') ||
                        message.includes('not found') ||
                        message.includes('authorization denied');

    if (isTokenError) {
      console.log('🧹 [ApiService] Token error detected, clearing authentication');
      
      // Clear authentication data
      this.clearAuthData();
      
      // Show notification
      toast.error('Your session has expired. Please log in again.', {
        position: 'top-center',
        autoClose: 5000,
      });
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else {
      console.log('🔒 [ApiService] Permission denied error');
      toast.error('Access denied. You do not have permission to perform this action.', {
        position: 'top-center',
        autoClose: 5000,
      });
    }
  }

  /**
   * Handle 403 Forbidden errors
   */
  private handle403Error(message: string): void {
    console.log('🔒 [ApiService] Handling 403 Forbidden error');
    toast.error('Access forbidden. Please check your permissions.', {
      position: 'top-center',
      autoClose: 5000,
    });
  }

  /**
   * Handle 404 Not Found errors
   */
  private handle404Error(url: string, message: string): void {
    console.log('🔍 [ApiService] Handling 404 Not Found error');
    
    // Don't show toast for 404s as they might be expected in some cases
    console.warn(`Resource not found: ${url}`);
  }

  /**
   * Handle 429 Too Many Requests errors
   */
  private handle429Error(): void {
    console.log('⏳ [ApiService] Handling 429 Too Many Requests error');
    toast.warning('Too many requests. Please wait a moment and try again.', {
      position: 'top-center',
      autoClose: 5000,
    });
  }

  /**
   * Handle 5xx Server errors
   */
  private handle5xxError(status: number, message: string): void {
    console.log(`🚨 [ApiService] Handling ${status} Server error`);
    toast.error('Server error. Please try again later.', {
      position: 'top-center',
      autoClose: 5000,
    });
  }

  /**
   * Handle network errors (no response)
   */
  private async handleNetworkError(error: AxiosError): Promise<void> {
    console.log('🌐 [ApiService] Handling network error');
    
    // Check if this is a timeout error
    const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
    
    if (isTimeout) {
      // Reset server test flag to retry server detection
      this.isServerTested = false;
      
      // Try to find a working server
      const workingUrl = await this.findWorkingServerUrl();
      
      // Show specific error message for backend connectivity (with cooldown to prevent spam)
      const currentBaseUrl = this.getBaseURL();
      const backendUrl = currentBaseUrl || 'http://localhost:5002';
      
      const now = Date.now();
      if (now - this.lastTimeoutToastTime > this.TIMEOUT_TOAST_COOLDOWN) {
        toast.error(
          `Backend server is not responding. Please ensure the backend server is running on port 5002.\n\nTried: ${backendUrl}`,
          {
            position: 'top-center',
            autoClose: 10000,
          }
        );
        
        this.lastTimeoutToastTime = now;
      }
      
      console.error('❌ [ApiService] Backend server timeout - server may not be running');
      console.error(`   Attempted URL: ${backendUrl}`);
      console.error('   Please check:');
      console.error('   1. Backend server is running (cd backend && npm start)');
      console.error('   2. Server is listening on port 5002');
      console.error('   3. No firewall blocking the connection');
    } else {
      toast.error('Network error. Please check your connection and try again.', {
        position: 'top-center',
        autoClose: 5000,
      });
    }
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    const keysToRemove = [
      'clinic_auth_token',
      'clinic_user_data',
      'clinic_refresh_token',
      // Legacy keys
      'auth_token',
      'AUTH_TOKEN_KEY',
      'authToken',
      'jwt_token',
      'token',
      'user_data',
      CLINIC_TENANT_KEY,
    ];

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    console.log('🧹 [ApiService] Authentication data cleared');
  }

  /**
   * Make a request with retry logic
   */
  public async request<T = any>(config: ExtendedAxiosRequestConfig): Promise<AxiosResponse<T>> {
    let lastError: AxiosError;
    
    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        return await this.axiosInstance.request<T>(config);
      } catch (error) {
        lastError = error as AxiosError;
        const status = lastError.response?.status;
        
        // Don't retry for certain status codes
        if (status && !RETRY_CONFIG.retryableStatuses.includes(status)) {
          throw lastError;
        }
        
        // Don't retry on the last attempt
        if (attempt === RETRY_CONFIG.maxRetries) {
          throw lastError;
        }
        
        console.log(`🔄 [ApiService] Retrying request (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay * attempt));
      }
    }
    
    throw lastError!;
  }

  /**
   * Convenience methods for common HTTP verbs
   */
  public async get<T = any>(url: string, config?: ExtendedAxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  public async post<T = any>(url: string, data?: any, config?: ExtendedAxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  public async put<T = any>(url: string, data?: any, config?: ExtendedAxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  public async patch<T = any>(url: string, data?: any, config?: ExtendedAxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  public async delete<T = any>(url: string, config?: ExtendedAxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  /**
   * Update base URL (useful for server switching)
   */
  public updateBaseURL(newBaseURL: string): void {
    this.baseURL = newBaseURL;
    this.axiosInstance.defaults.baseURL = newBaseURL;
    this.isServerTested = false;
    console.log(`🔄 [ApiService] Base URL updated to: ${newBaseURL}`);
  }

  /**
   * Get current base URL
   */
  public getBaseURL(): string {
    return this.baseURL;
  }
}

// Export singleton instance
export default ApiService.getInstance().api;
