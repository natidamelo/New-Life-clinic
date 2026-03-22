/**
 * Safely converts any error object to a string
 * Prevents React child errors when error objects are rendered directly
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
 * Safely extracts error message from various error formats
 */
export const extractErrorMessage = (error: any): string => {
  if (!error) return 'No error information available';
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Handle Error objects
  if (error instanceof Error) {
    return error.message || 'An error occurred';
  }
  
  // Handle API error responses
  if (error && typeof error === 'object') {
    // Axios error response
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    
    // Direct error message
    if (error.message) {
      return error.message;
    }
    
    // Error object with error property
    if (error.error) {
      return typeof error.error === 'string' ? error.error : 'An error occurred';
    }
    
    // Validation errors
    if (error.errors && Array.isArray(error.errors)) {
      return error.errors.map((err: any) => 
        typeof err === 'string' ? err : err.message || err.msg || 'Validation error'
      ).join(', ');
    }
    
    // Generic object - try to stringify safely
    try {
      const errorStr = JSON.stringify(error);
      return errorStr.length > 200 ? errorStr.substring(0, 200) + '...' : errorStr;
    } catch {
      return 'An error occurred (unable to display details)';
    }
  }
  
  return 'An unknown error occurred';
}; 