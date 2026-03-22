import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getAuthHeader, enableDevMode } from '../services/auth';

// Enable development mode for testing
enableDevMode();

// Get auth headers for all requests
const getConfig = (extraHeaders = {}) => ({
  headers: {
    ...getAuthHeader(),
    ...extraHeaders
  }
});

export const uploadFile = (formData) => axios.post(
  `${API_BASE_URL}/api/files/upload`, 
  formData, 
  getConfig({ 'Content-Type': 'multipart/form-data' })
);
export const getFilesByRecord = (recordId) => axios.get(
  `${API_BASE_URL}/api/files/record/${recordId}`, 
  getConfig()
); 