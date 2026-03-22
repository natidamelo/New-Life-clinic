/**
 * Global error handler to prevent React child errors
 * Converts any error object to a safe string representation
 */

export const safeErrorToString = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message || 'An error occurred';
  }
  
  if (error && typeof error === 'object') {
    // Handle API error responses
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    
    if (error.message) {
      return error.message;
    }
    
    if (error.error) {
      return typeof error.error === 'string' ? error.error : 'An error occurred';
    }
    
    // Fallback for any object
    return 'An unexpected error occurred';
  }
  
  return 'An unknown error occurred';
};

/**
 * Hook to safely handle errors in components
 */
export const useSafeError = (error: any): string => {
  return safeErrorToString(error);
};

/**
 * Error boundary error handler
 */
export const handleErrorBoundaryError = (error: Error, errorInfo: React.ErrorInfo) => {
  console.error('Error caught by boundary:', error);
  console.error('Error info:', errorInfo);
  
  // You can add error reporting here
  // reportError(error, errorInfo);
}; 