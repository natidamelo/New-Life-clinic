import axios from 'axios';
import { API_BASE_URL } from '../config';

// Set the base URL for all API requests using dynamic detection
axios.defaults.baseURL = API_BASE_URL;

// Configure request headers
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add a request interceptor for authentication
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for error handling
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.response) {
      // The request was made and the server responded with an error status
      console.error('Response error:', error.response.status, error.response.data);
      
      // Handle authentication errors
      if (error.response.status === 401) {
        // Redirect to login or clear authentication
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        // If you want to redirect to login page:
        // window.location.href = '/login';
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Request error - no response received:', error.request);
    } else {
      // Something else happened while setting up the request
      console.error('Error setting up request:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default axios; 