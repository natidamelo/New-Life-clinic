/**
 * Legacy API Service - Compatibility Layer
 * 
 * This file maintains backward compatibility with existing components
 * while using the new centralized apiService under the hood.
 * 
 * @deprecated Components should migrate to using apiService directly
 */

import apiService from './apiService';
import { appointmentsAPI } from './appointmentService';

// Re-export the main API instance for backward compatibility
export const api = apiService;

// Legacy function for server connection testing
export const tryConnectToServer = async (): Promise<boolean> => {
  try {
    const response = await apiService.get('/api/ping');
    return response.status === 200;
  } catch (error) {
    console.error('[Legacy API] Server connection test failed:', error);
    return false;
  }
};

// Extended API instance (for backward compatibility)
export const extendedApi = apiService;

// Patients API (simplified for backward compatibility)
export const patientsAPI = {
  getAll: () => apiService.get('/api/patients'),
  getById: (id: string) => apiService.get(`/api/patients/${id}`),
  create: (data: any) => apiService.post('/api/patients', data),
  update: (id: string, data: any) => apiService.put(`/api/patients/${id}`, data),
  delete: (id: string) => apiService.delete(`/api/patients/${id}`),
};

// Users API (simplified for backward compatibility)
export const usersAPI = apiService;

// Re-export appointments API
export { appointmentsAPI };

// Prescription API (simplified for backward compatibility)
export const prescriptionAPI = {
  getAll: () => apiService.get('/api/prescriptions'),
  getById: (id: string) => apiService.get(`/api/prescriptions/${id}`),
  create: (data: any) => apiService.post('/api/prescriptions', data),
  update: (id: string, data: any) => apiService.put(`/api/prescriptions/${id}`, data),
  delete: (id: string) => apiService.delete(`/api/prescriptions/${id}`),
  getByPatient: (patientId: string) => apiService.get(`/api/prescriptions?patientId=${patientId}`),
  getByDoctor: (doctorId: string) => apiService.get(`/api/prescriptions?doctorId=${doctorId}`),
};

// Direct fetch function (for backward compatibility)
export const directFetch = async (url: string, options: RequestInit = {}) => {
  try {
    const baseURL = apiService.defaults.baseURL || 'http://localhost:5002';
    const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;
    
    // Add auth token if available
    const token = localStorage.getItem('clinic_auth_token');
    if (token && options.headers) {
      (options.headers as any).Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error('[Legacy API] Direct fetch failed:', error);
    throw error;
  }
};

// Default export for backward compatibility
export default apiService;