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

export const createPrescription = (data) => axios.post(`${API_BASE_URL}/api/prescriptions`, data, getConfig());
export const getPrescriptionsByPatient = (patientId) => axios.get(`${API_BASE_URL}/api/prescriptions/patient/${patientId}`, getConfig());
export const updatePrescription = (id, data) => axios.put(`${API_BASE_URL}/api/prescriptions/${id}`, data, getConfig());
export const deletePrescription = (id) => axios.delete(`${API_BASE_URL}/api/prescriptions/${id}`, getConfig()); 