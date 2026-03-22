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

export const createMedicalRecord = (data) => axios.post(`${API_BASE_URL}/api/medical-records`, data, getConfig());
export const getMedicalRecordsByPatient = (patientId) => axios.get(`${API_BASE_URL}/api/medical-records/patient/${patientId}`, getConfig());
export const updateMedicalRecord = (id, data) => axios.put(`${API_BASE_URL}/api/medical-records/${id}`, data, getConfig());
export const deleteMedicalRecord = (id) => axios.delete(`${API_BASE_URL}/api/medical-records/${id}`, getConfig()); 