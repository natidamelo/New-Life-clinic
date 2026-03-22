import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getAuthHeader, enableDevMode } from '../services/auth';

// Enable development mode for testing
enableDevMode();

// Get auth headers for all requests
const getConfig = () => ({
  headers: {
    ...getAuthHeader()
  }
});

export const createLabRequest = (data) => axios.post(`${API_BASE_URL}/api/labs`, data, getConfig());
export const getLabRequestsByPatient = (patientId) => axios.get(`${API_BASE_URL}/api/labs/patient/${patientId}`, getConfig());
export const updateLabRequest = (id, data) => axios.put(`${API_BASE_URL}/api/labs/${id}`, data, getConfig());
export const deleteLabRequest = (id) => axios.delete(`${API_BASE_URL}/api/labs/${id}`, getConfig()); 