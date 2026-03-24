import { api } from './api';
import { toast } from 'react-hot-toast';
import { Prescription as PrescriptionType } from '../types/prescription';
import { AUTH_TOKEN_KEY, USER_DATA_KEY } from '../config';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// Use runtime env-config.js so this always points to the correct backend (never a local LAN IP)
const _apiBaseUrl = (window as any)?._env_?.REACT_APP_API_URL || (window as any)?._env_?.VITE_API_URL || '';
const debugAxios = axios.create({
    baseURL: _apiBaseUrl,
    timeout: 30000,
});

// Improved error handling function for API calls
const handleApiError = (error: unknown, defaultMessage: string): string => {
    let errorMessage = defaultMessage;
    
    if (error && typeof error === 'object') {
        // Check if it's an axios error with response
        if ('response' in error && error.response) {
            const response = error.response as any;
            if (response.data?.message) {
                errorMessage = response.data.message;
            } else if (response.data?.error) {
                errorMessage = response.data.error;
            } else if (response.status) {
                errorMessage = `API Error: ${response.status}`;
            }
            
            // Log detailed error info for debugging
            console.error("Error response data:", JSON.stringify(response.data || {}));
            console.error("Error response status:", response.status);
            console.error("Error response headers:", JSON.stringify(response.headers || {}));
        }
        // Check if it has a request property (network error)
        else if ('request' in error) {
            errorMessage = 'Network error - no response received';
            console.error("Error request details:", (error as any).request);
        }
        // Check if it has a message property
        else if ('message' in error && typeof (error as any).message === 'string') {
            errorMessage = (error as any).message;
        }
    }
    
    return errorMessage;
};

// Interface for the data sent TO the API - updated to match backend requirements 
export interface PrescriptionCreateDto {
    patient: string;             // Required by backend - patient ID
    patientId?: string;          // Kept for backwards compatibility
    visitId: string;             // Required by backend
    doctorId?: string;           // Send explicitly even though route handler has it from auth
    
    // Single medication format (legacy)
    medicationName?: string;     // Required for single medication
    dosage?: string;             // Required for single medication
    frequency?: string;          // Required for single medication
    
    // Multiple medications format (new)
    medications?: Array<{
        medication: string;
        dosage: string;
        frequency: string;
        route?: string;
        quantity?: number;
        notes?: string;
        inventoryItem?: string;
        unitPrice?: number;
        price?: number;
    }>;
    
    // Optional fields
    duration?: string;
    refills?: number;
    route?: string;
    notes?: string;
    instructions?: string;       // Additional instructions for the patient
    sendToNurse?: boolean;
    nurseInstructions?: string;
    status?: string;
    createdBy?: string;
    patientName?: string;
    patientAge?: number;
    patientGender?: string;
}

const createPrescription = async (
    prescriptionData: PrescriptionCreateDto, 
    token: string,
    doctorId: string
): Promise<Prescription> => {
    try {

        const response = await api.post<Prescription>('/api/prescriptions', prescriptionData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
                        timeout: 15000
                    });

            // Check if response includes extension information
            if ((response.data as any).extended) {
                const message = (response.data as any).message || 'Prescription extended successfully';
                if ((response.data as any).frequencyUpdated) {
                    toast.success(`${message} (Frequency updated)`);
                } else {
                    toast.success(message);
                }
            }
            
            // Return the prescription data - handle both creation and extension responses
            return (response.data as any).data ? (response.data as any).data[0] : response.data;
    } catch (error: any) {
        console.error("Error during API call:", error);
        
        const errorMsg = handleApiError(error, "createPrescription");
        
        if (error.response?.status === 401) {
            toast.error('Authentication error. Please log in again.');
        } else if (error.response?.status === 403) {
            toast.error('You do not have permission to create prescriptions.');
        } else if (error.message?.includes('Network Error')) {
            toast.error('Network error. Please check your connection and that the backend server is running.');
        } else {
            toast.error(`Failed to create prescription: ${errorMsg}`);
        }
        
        throw new Error(errorMsg);
    }
};

// Get prescriptions by patient ID
const getPrescriptionsByPatient = async (patientId: string): Promise<Prescription[]> => {
    try {
        // Add a timestamp to prevent caching
        const timestamp = Date.now();
        // Use the correct API endpoint with query parameter
        const response = await api.get<Prescription[]>(`/api/prescriptions?patientId=${patientId}&_=${timestamp}`);

        return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
        console.error('Error fetching prescriptions via API:', error);
        const errorMessage = error.response?.data?.message || 'Failed to fetch prescriptions. Please try again.';
        toast.error(errorMessage);
        throw new Error(errorMessage);
    }
};

// Get prescriptions by doctor ID
const getPrescriptionsByDoctor = async (doctorId: string): Promise<Prescription[]> => {
    try {
        // Add a timestamp to prevent caching
        const timestamp = Date.now();
        // Use the correct API endpoint with query parameter (not /doctor/{id})
        const response = await api.get<Prescription[]>(`/api/prescriptions?doctorId=${doctorId}&_=${timestamp}`);

        return Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
        console.error('Error fetching doctor prescriptions via API:', error);
        // Return empty array instead of throwing to prevent dashboard crashes

        return [];
    }
};

// Get a single prescription by ID
const getPrescriptionById = async (prescriptionId: string): Promise<Prescription> => {
    try {
        const response = await api.get<Prescription>(`/api/prescriptions/${prescriptionId}`);

        return response.data;
    } catch (error: any) {
        console.error('Error fetching prescription via API:', error);
        const errorMessage = error.response?.data?.message || 'Failed to fetch prescription. Please try again.';
        toast.error(errorMessage);
        throw new Error(errorMessage);
    }
};

// Function to sync prescriptions with medical records (temporarily disabled to fix timeout issues)
const syncPrescriptionsWithMedicalRecords = async (patientId: string): Promise<boolean> => {
    try {

        if (!patientId || patientId === 'undefined' || patientId === 'null') {

            return false;
        }
        
        // TEMPORARILY DISABLED: The prescription sync endpoint is causing 15-second timeouts
        // This will be re-enabled once the authentication issues are resolved
        
        // Only try the medical records sync endpoint (which works)
        try {

            const response = await api.post(`/api/medical-records/sync-prescriptions/${patientId}`, {}, {
                timeout: 5000  // Reduced timeout to 5 seconds
            });
            
            if (response.data && response.data.success) {

                // Sync notification removed to avoid multiple notifications
                return true;
            } else {

                return false;
            }
        } catch (medicalRecordError: any) {
            console.error('Error syncing prescriptions with medical records:', medicalRecordError);

            return false;
        }
    } catch (error: any) {
        console.error('Error syncing prescriptions:', error);
        return false;
    }
};

// Get prescriptions for a specific patient - improved with fallbacks
const getPatientPrescriptions = async (patientId: string): Promise<Prescription[]> => {
  try {

    // Use the direct endpoint with query parameter
    const response = await api.get<Prescription[]>(`/api/prescriptions?patientId=${patientId}`);
    
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {

      return response.data;
    } else {

      return [];
    }
  } catch (error: any) {
    console.error(`Error fetching prescriptions for patient ${patientId}:`, error);
    return [];
  }
};

/**
 * Update an existing prescription
 */
const updatePrescription = async (prescriptionId: string, updateData: any, token: string): Promise<any> => {
  try {

    const response = await api.patch(`/api/prescriptions/${prescriptionId}`, updateData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error updating prescription:', error);
    throw error;
    }
};

/**
 * Update prescription frequency
 * @param prescriptionId - ID of the prescription to update
 * @param frequency - New frequency (QD, BID, TID, QID)
 * @returns Promise with update result
 */
const updatePrescriptionFrequency = async (prescriptionId: string, frequency: string): Promise<any> => {
  try {
    const token = localStorage.getItem('token') || '';
    const response = await api.put(
      `/api/prescriptions/${prescriptionId}/frequency`,
      { frequency },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating prescription frequency:', error);
    throw error;
  }
};

const getPendingPrescriptionsForReception = async (): Promise<Prescription[]> => {
    try {

        const response = await api.get('/api/prescriptions/pending-for-reception');

        return response.data;
    } catch (error) {
        console.error("❌ Error fetching pending prescriptions:", error);
        
        // Enhanced error handling
        const errorMessage = handleApiError(error, "Failed to fetch pending prescriptions");
        toast.error(errorMessage);
        
        return [];
    }
};

export interface Prescription {
  _id: string;
  patient: string;
  patientId?: string;
  medicationName: string;
  dosage?: string;
  frequency?: string;
  duration?: number | string;
  status?: string;
  createdAt?: string;
}

const getByPatient = async (token: string, patientId: string): Promise<Prescription[]> => {
  try {
    // Try query param style
    const url1 = `/api/prescriptions?patientId=${patientId}`;
    const res1 = await api.get(url1, { headers: { Authorization: `Bearer ${token}` } });
    if (Array.isArray(res1.data)) return res1.data as Prescription[];
  } catch (_) {}

  try {
    // Try RESTful style fallback
    const url2 = `/api/prescriptions/patient/${patientId}`;
    const res2 = await api.get(url2, { headers: { Authorization: `Bearer ${token}` } });
    if (Array.isArray(res2.data)) return res2.data as Prescription[];
  } catch (e) {
    console.error('Failed to fetch prescriptions by patient:', e);
  }
  return [];
};

export const prescriptionService = { 
  createPrescription,
  getPatientPrescriptions,
  getPrescriptionsByPatient,
  getPrescriptionsByDoctor,
  getPrescriptionById,
  updatePrescription,
  updatePrescriptionFrequency,
  getPendingPrescriptionsForReception,
  getByPatient,
  syncPrescriptionsWithMedicalRecords
};
export default prescriptionService; 