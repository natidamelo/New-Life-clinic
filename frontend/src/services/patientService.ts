import { api } from './api';
import axios from 'axios';
import { API_BASE_URL, IS_DEVELOPMENT } from '../config/index';

// Add missing type definitions
export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  patients: Patient[];
  currentPage: number;
  totalPages: number;
  totalPatients: number;
}

export interface PaginatedPatients {
  patients: Patient[];
  data?: Patient[]; // Support both formats
  currentPage: number;
  totalPages: number;
  totalPatients: number;
}

export interface Patient {
  id: string;
  _id?: string; // Add MongoDB _id field
  patientId: string;
  firstName: string;
  lastName: string;
  name?: string; // Add name field for compatibility
  age: number;
  dateOfBirth: string;
  gender: string;
  status: 'Admitted' | 'Discharged' | 'Outpatient' | 'Emergency' | 'waiting' | 'in-progress' | 'scheduled' | 'completed' | 'Active';
  contactNumber: string;
  phone?: string;
  email?: string;
  address: string;
  department?: string;
  priority?: 'normal' | 'urgent' | 'emergency';
  medicalHistory?: string;
  allergies?: string;
  notes?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  faydaId?: string;
  cardType?: {
    _id: string;
    name: string;
    value: string;
    price: number;
    validityMonths: number;
    description: string;
  };
  cardStatus?: string;
  lastVisit?: string;
  roomNumber?: string;
  diagnosis?: string;
  prescription?: string;
  assignedDoctorId?: string;
  assignedNurseId?: string;
  assignedNurseName?: string;
  lastUpdated?: string;
  lastVitalsTimestamp?: string;
  chiefComplaint?: string;
  hidden?: boolean;
  finalizedRecordsCount?: number;
  vitals?: {
    temperature: string;
    bloodPressure: string;
    heartRate: string;
    respiratoryRate: string;
    bloodSugar?: string;
    oxygenSaturation?: string;
    pain?: string;
    height?: string;
    weight?: string;
    bmi?: string;
    timestamp?: string;
  };
  medications?: {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    lastGiven?: string;
    nextDue?: string;
    prescribedBy: string;
  }[];
  treatments?: {
    id: string;
    type: string;
    description: string;
    frequency: string;
    lastPerformed?: string;
    nextDue?: string;
    notes?: string;
  }[];
  nextCheckup?: string;
  diabetic?: boolean;
  woundCare?: {
    location: string;
    type: string;
    lastDressing?: string;
    nextDressing?: string;
    notes?: string;
  }[];
  imaging?: {
    id: string;
    type: string;
    orderedBy: string;
    date: string;
    status: string;
    results?: string;
    notes?: string;
  }[];
  labResults?: {
    id: string;
    testName: string;
    orderedBy: string;
    collectionDate: string;
    status: string;
    results?: string;
    normalRange?: string;
    notes?: string;
  }[];
  doctorOrders?: {
    id: string;
    type: string;
    doctor: string;
    date: string;
    status: string;
    instructions: string;
    notes?: string;
  }[];
  appointments?: {
    id: string;
    date: string;
    time: string;
    status: string;
    reason: string;
    notes?: string;
  }[];
  [key: string]: any; // Allow additional fields
}

export interface CreatePatientDto {
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  contactNumber: string;
  email?: string;
  address?: string;
  department?: string;
  priority: 'normal' | 'urgent' | 'emergency';
  medicalHistory?: string;
  allergies?: string;
  notes?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  faydaId?: string;
  selectedCardTypeId?: string;
}

// Add caching variables
let patientsCache: ApiResponse<PaginatedPatients> | null = null;
let lastCacheTime = 0;
const CACHE_DURATION = 0; // Disable caching completely to always fetch fresh data
let fetchInProgress = false;

const getAllPatients = async (forceRefresh: boolean = false, includeHidden: boolean = false, limit: number = 1000): Promise<ApiResponse<PaginatedPatients>> => {
  console.log(`Fetching patients from API${forceRefresh ? ' (forced)' : ''}...`);
  
  // Check if a fetch is already in progress to prevent duplicate requests
  if (fetchInProgress && !forceRefresh) {
    console.log('Patient fetch already in progress, waiting...');
    // Wait for the current fetch to complete and return cached result
    let attempts = 0;
    while (fetchInProgress && attempts < 50) { // Wait up to 5 seconds
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (patientsCache && !forceRefresh) {
      console.log('Returning cached result after waiting for fetch to complete');
      return patientsCache;
    }
  }
  
  // Check cache first (unless forced refresh)
  if (!forceRefresh && patientsCache && (Date.now() - lastCacheTime) < CACHE_DURATION) {
    console.log('Returning cached patients data');
    return patientsCache;
  }
  
  // Set fetch in progress flag
  fetchInProgress = true;
  
  try {
    // Use the quick-load endpoint for better performance
    const response = await api.get<ApiResponse<PaginatedPatients>>(`/api/patients/quick-load?limit=${limit}`); 
    console.log('API response for getAllPatients (quick-load):', response.data);
    
    let processedResponse: ApiResponse<PaginatedPatients>;
    
    // If the API returns data in the expected format (paginated), return it
    if (response.data && response.data.patients) {
      // Process patients to ensure id field exists alongside _id
      const processedPatients = response.data.patients.map(patient => {
        if (patient._id && !patient.id) {
          patient.id = patient._id.toString();
        }
        return patient;
      });
      
      // Filter out hidden patients if includeHidden is false
      const filteredPatients = includeHidden 
        ? processedPatients 
        : processedPatients.filter(patient => !patient.hidden);
      
      console.log(`Filtered ${processedPatients.length - filteredPatients.length} hidden patients. Returning ${filteredPatients.length} patients.`);
      
      processedResponse = {
        ...response.data,
        patients: filteredPatients,
        totalPatients: filteredPatients.length
      };
    }
    // If the API doesn't follow the expected format but has array data
    else if (response.data && Array.isArray(response.data)) {
      // Convert to expected format and ensure id exists
      const processedPatients = response.data.map(patient => {
        if (patient._id && !patient.id) {
          patient.id = patient._id.toString();
        }
        return patient;
      });
      
      // Filter out hidden patients if includeHidden is false
      const filteredPatients = includeHidden 
        ? processedPatients 
        : processedPatients.filter(patient => !patient.hidden);
      
      console.log(`Filtered ${processedPatients.length - filteredPatients.length} hidden patients. Returning ${filteredPatients.length} patients.`);
      
      processedResponse = {
        patients: filteredPatients,
        currentPage: 1,
        totalPages: 1,
        totalPatients: filteredPatients.length
      };
    }
    else {
      // Return an empty structure if no valid data
      processedResponse = { patients: [], currentPage: 1, totalPages: 1, totalPatients: 0 };
    }
    
    // Update cache
    patientsCache = processedResponse;
    lastCacheTime = Date.now();
    
    return processedResponse;
  } catch (error) {
    console.error('Error fetching patients from API:', error);
    // If we have cached data, return it in case of error
    if (patientsCache) {
      console.log('API error, returning cached data');
      return patientsCache;
    }
    // Return an empty structure on error with no cache
    return { patients: [], currentPage: 1, totalPages: 1, totalPatients: 0 }; 
  } finally {
    // Reset fetch in progress flag
    fetchInProgress = false;
  }
};

// Export the getPatientById function directly so it can be imported by other services
export const getPatientById = async (id: string): Promise<Patient | null> => {
  if (!id || id === 'undefined') {
    console.warn('[getPatientById] Called with invalid id:', id);
    return null;
  }
  try {
    console.log(`Fetching patient data for ID ${id}`);
    const response = await api.get<{ success: boolean; data: Patient }>(`/api/patients/${id}`);
    
    // Extract the patient data from the response structure
    const patientData = response.data.data;
    if (!patientData) {
      console.warn(`No patient data found for ID ${id}`);
      return null;
    }
    
    // Add transformation to ensure id field exists and format data consistently
    if (patientData) {
      // Ensure ID field exists (for compatibility)
      if (patientData._id && !patientData.id) {
        patientData.id = patientData._id.toString();
      }
      
      // Make sure all the essential fields are present
      if (!patientData.dateOfBirth && patientData.dob) {
        patientData.dateOfBirth = patientData.dob;
      }
      
      if (!patientData.contactNumber && patientData.phone) {
        patientData.contactNumber = patientData.phone;
      }
      
      // Calculate age if not present but DOB is
      if (!patientData.age && patientData.dateOfBirth) {
        try {
          const birthDate = new Date(patientData.dateOfBirth);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          patientData.age = age;
        } catch (e) {
          console.warn('Could not calculate age from date of birth:', patientData.dateOfBirth);
        }
      }
    }
    
    return patientData;
  } catch (error) {
    console.error(`Error fetching patient by ID ${id}:`, error);
    return null; // Return null on error
  }
};

// Function to update patient status
const updatePatientStatus = async (id: string, status: string): Promise<Patient> => {
  try {
    console.log(`Updating patient ${id} status to ${status}`);
    // Assuming the API endpoint is PUT /patients/:id/status
    // Also send lastUpdated to ensure timestamp is fresh for "new patient" detection
    const response = await api.put<{ success: boolean; data: Patient }>(`/api/patients/${id}/status`, { 
      status,
      lastUpdated: new Date().toISOString()
    });
    console.log(`Patient ${id} status updated successfully:`, response.data);
    
    const updatedPatient = response.data.data || response.data;
    // Ensure id exists and transform if needed
    if (updatedPatient && 'patientId' in updatedPatient) {
      const patient = updatedPatient as Patient;
      if ((patient as any)._id && !patient.id) {
        (patient as any).id = (patient as any)._id.toString();
      }
      // TODO: Consider recalculating age if needed here
      return patient;
    }
    return updatedPatient as Patient;
  } catch (error) {
    console.error(`Error updating patient ${id} status:`, error);
    // Re-throw or handle error as appropriate for the application
    // For now, re-throwing might make issues more visible
    throw error; 
  }
};

// Function to send notification to doctor
const notifyDoctor = async (patientId: string, notificationData: { type: string; message: string; data?: any; priority?: 'normal' | 'urgent' | 'emergency'; senderRole?: string }): Promise<any> => {
  try {
    console.log(`[notifyDoctor] Starting notification process for patient ${patientId}`);
    console.log(`[notifyDoctor] Notification data:`, notificationData);
    
    if (!patientId) {
      console.error('[notifyDoctor] No patient ID provided');
      throw new Error('Patient ID is required');
    }
    
    if (!notificationData) {
      console.error('[notifyDoctor] No notification data provided');
      throw new Error('Notification data is required');
    }
    
    // Map frontend priority to backend priority
    let backendPriority: 'low' | 'medium' | 'high' | 'critical';
    switch (notificationData.priority) {
      case 'normal':
        backendPriority = 'medium';
        break;
      case 'urgent':
        backendPriority = 'high';
        break;
      case 'emergency':
        backendPriority = 'critical';
        break;
      default:
        backendPriority = 'medium'; // Default to medium
    }
    
    // Create the payload for the backend, ensuring priority and senderRole are set correctly
    const payload = {
      ...notificationData,
      priority: backendPriority, // Use the mapped backend priority
      // The backend will set senderId and senderRole based on req.user, so we don't send it from here.
      senderRole: undefined, // Explicitly set to undefined to prevent sending incorrect values
    };
    
    // First update the patient status to 'scheduled' to ensure it shows up for the doctor
    try {
      console.log(`[notifyDoctor] Updating patient ${patientId} status to scheduled...`);
      const statusResponse = await api.put(`/api/patients/${patientId}/status`, { status: 'scheduled' });
      console.log(`[notifyDoctor] Updated patient ${patientId} status to scheduled:`, statusResponse.data);
    } catch (statusError) {
      console.error(`[notifyDoctor] Error updating patient ${patientId} status:`, statusError);
      // Continue even if status update fails
    }
    
    // Now send the notification to the doctor
    console.log(`[notifyDoctor] Sending notification to doctor for patient ${patientId}...`);
    const notifyEndpoint = `/api/patients/${patientId}/notify-doctor`;
    console.log(`[notifyDoctor] POST endpoint: ${notifyEndpoint}`);
    console.log(`[notifyDoctor] Payload:`, JSON.stringify(payload, null, 2));
    
    const response = await api.post(notifyEndpoint, payload);
    console.log('[notifyDoctor] Notify doctor API response:', response.data);
    console.log('[notifyDoctor] Notification sent successfully');
    
    return response.data; // Return the response from the API
  } catch (error) {
    console.error(`[notifyDoctor] Error notifying doctor about patient ${patientId}:`, error);
    
    // Enhanced error logging
    if (error.response) {
      console.error('[notifyDoctor] Response error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('[notifyDoctor] Request error (no response received):', error.request);
    } else {
      console.error('[notifyDoctor] Setup error:', error.message);
    }
    
    // Re-throw the error with more context
    throw new Error(`Failed to notify doctor: ${error.message || 'Unknown error'}`);
  }
};

// Function to update lab results for a patient
const updateLabResult = async (patientId: string, testId: string, resultData: any): Promise<any> => {
  try {
    console.log(`Updating lab result for patient ${patientId}, test ${testId}:`, resultData);
    
    // Call the real API endpoint
    const response = await api.put(`/api/patients/${patientId}/lab-results/${testId}`, resultData);
    console.log('Update lab result API response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error(`Error updating lab result for patient ${patientId}, test ${testId}:`, error);
    throw error;
  }
};

// Function to get the latest active visit for a patient
const getLatestActiveVisit = async (patientId: string): Promise<{ id: string } | null> => {
  if (!patientId) return null;
  try {
    console.log(`Fetching latest active visit for patient ${patientId}...`);
    // Expecting response data shape like { _id: string, ... } or { id: string, ... } or { visitId: string, ... } 
    const response = await api.get<{ _id?: string; id?: string; visitId?: string } | null>(
      `/api/visits/patient/${patientId}/latest-active`
    );
    console.log(`Latest active visit response for patient ${patientId}:`, response.data);
    
    // Check for ID in common fields (_id, id, visitId)
    const visitId = response.data?._id || response.data?.id || response.data?.visitId;
    
    if (visitId) {
      console.log(`Extracted visitId: ${visitId}`);
      return { id: visitId };
    }
    console.log(`Could not extract visitId from response data.`);
    return null;
  } catch (error) {
    // Handle 404 (Not Found) gracefully - it just means no active visit
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.log(`No active visit found for patient ${patientId} (404).`);
      return null;
    }
    // Log other errors
    console.error(`Error fetching latest active visit for patient ${patientId}:`, error);
    return null; // Return null on other errors
  }
};

// Create a new patient
export const createPatient = async (patientData: CreatePatientDto): Promise<any> => {
  console.log('=== PATIENT CREATION REQUEST ===');
  console.log('Original patient data:', JSON.stringify(patientData, null, 2));
  
  // Clean up the data
  const cleanedData = { ...patientData };
  
  // Remove any undefined or null values
  Object.keys(cleanedData).forEach(key => {
    if (cleanedData[key] === undefined || cleanedData[key] === null) {
      delete cleanedData[key];
    }
  });
  
  // Convert age to number if it's a string
  if (typeof cleanedData.age === 'string') {
    cleanedData.age = parseInt(cleanedData.age, 10);
  }
  
  // Ensure arrays are properly formatted
  if (cleanedData.medicalHistory && !Array.isArray(cleanedData.medicalHistory)) {
    cleanedData.medicalHistory = cleanedData.medicalHistory as any;
  }
  
  if (cleanedData.allergies && !Array.isArray(cleanedData.allergies)) {
    cleanedData.allergies = cleanedData.allergies as any;
  }
  
  console.log('Cleaned data:', JSON.stringify(cleanedData, null, 2));
  
  // Use the same base URL configured in the shared API instance. This instance already
  // attaches the Authorization header automatically, so we no longer need to rely on
  // a separate axios.post that omits auth information.
      const patientServerUrl = api.defaults.baseURL || '';
  console.log('Sending request to patient server using shared API instance:', `${patientServerUrl}/api/patients`);
  
  // Check if patient server is reachable
  try {
    console.log('Patient server ping attempt...');
    const pingUrl = patientServerUrl ? `${patientServerUrl}/api/ping` : '/api/ping';
    await axios.get(pingUrl);
    console.log('Patient server is reachable, proceeding with patient creation');
  } catch (error) {
    console.error('Patient server is not reachable, cannot create patient', error);
    throw new Error('Patient server is not reachable. Please check if the patient server is running.');
  }
  
  try {
    // Use the shared api instance so that auth headers and interceptors are applied
    // Patient creation can trigger several backend processes (invoice generation, notifications, etc.)
    // which may take longer than the default 30 s axios timeout.  Give it up to 90 s.
    const response = await api.post(`/api/patients`, cleanedData, {
      timeout: 90000 // 90 seconds
    });
    return response.data;
  } catch (error: any) {
    console.error('Error during patient registration:', error);
    throw error;
  }
};

// Delete patient
const deletePatient = async (id: string): Promise<void> => {
  try {
    await api.delete(`/api/patients/${id}`);
  } catch (error) {
    console.error(`Error deleting patient ${id}:`, error);
    throw error;
  }
};

// Function to get patients with pagination
const getPatients = async (page: number = 1, limit: number = 10, includeHidden: boolean = false): Promise<PaginatedPatients> => {
  console.log(`Getting patients with pagination: page=${page}, limit=${limit}`);
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (includeHidden) {
      params.append('includeHidden', 'true');
    }

    // Use the API client instead of raw axios
    const response = await api.get(`/api/patients?${params.toString()}`);
    
    if (response.data && Array.isArray(response.data.patients)) {
      // Process to ensure id field exists
      const processedPatients = response.data.patients.map((patient: Patient) => {
        if (patient._id && !patient.id) {
          patient.id = patient._id.toString();
        }
        return patient;
      });
      
      return {
        patients: processedPatients,
        currentPage: response.data.currentPage || page,
        totalPages: response.data.totalPages || 1,
        totalPatients: response.data.totalPatients || processedPatients.length
      };
    }
    
    // Fallback for unexpected response format
    return {
      patients: [],
      currentPage: page,
      totalPages: 1,
      totalPatients: 0
    };
  } catch (error) {
    console.error('Error fetching patients with pagination:', error);
    throw error;
  }
};

// Function to clear cache (useful for manual refresh)
const clearPatientsCache = () => {
  console.log('Clearing patients cache');
  patientsCache = null;
  lastCacheTime = 0;
  fetchInProgress = false;
  
  // Also clear localStorage cache
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('patient') || key.includes('cache') || key.includes('dashboard'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    console.log(`Removing localStorage key: ${key}`);
    localStorage.removeItem(key);
  });
  
  console.log('All patient caches cleared');
};

interface PatientStatistics {
  totalPatients: number;
  byGender: Array<{ name: string; value: number }>;
  byAgeGroup: Array<{ name: string; value: number }>;
  monthlyTrends: Array<{ month: string; newPatients: number; returnPatients: number }>;
  byDepartment: Array<{ name: string; value: number }>;
}

// Create the service object for export
const patientService = {
  getAllPatients,
  getPatients,
  getPatientById,
  createPatient,
  updatePatientStatus,
  notifyDoctor,
  updateLabResult,
  getLatestActiveVisit,
  deletePatient,
  clearPatientsCache,
  updatePatient: async (id: string, patientData: Partial<Patient>): Promise<Patient> => {
    try {
      console.log(`Updating patient ${id} with data:`, patientData);
      const response = await api.put(`/api/patients/${id}`, patientData);
      console.log(`Patient ${id} updated successfully:`, response.data);
      
      const updatedPatient = response.data.data || response.data;
      // Ensure id exists and transform if needed
      if (updatedPatient && updatedPatient._id && !updatedPatient.id) {
        updatedPatient.id = updatedPatient._id.toString();
      }
      
      return updatedPatient;
    } catch (error) {
      console.error(`Error updating patient ${id}:`, error);
      throw error;
    }
  },
  updateVitals: async (patientId: string, vitalsData: any): Promise<any> => {
    try {
      console.log(`Updating vitals for patient ${patientId}:`, vitalsData);
      
      if (!patientId) {
        console.error('updateVitals: No patient ID provided');
        throw new Error('Patient ID is required');
      }
      
      if (!vitalsData) {
        console.error('updateVitals: No vitals data provided');
        throw new Error('Vitals data is required');
      }
      
      // Step 1: Save the vitals to the patient record via the dedicated vitals endpoint
      try {
        console.log(`Making API call to /api/patients/${patientId}/vitals with data:`, vitalsData);
        
        // Use a longer timeout specifically for vitals operations (30 seconds)
        const response = await api.put(`/api/patients/${patientId}/vitals`, vitalsData, {
          timeout: 30000 // 30 seconds timeout for vitals operations
        });
        console.log('Vitals update response:', response.data);
        
        // Step 2: Always update the patient status to 'scheduled'
        try {
          console.log(`Setting patient ${patientId} status to scheduled`);
          const statusResponse = await api.put(`/api/patients/${patientId}/status`, { status: 'scheduled' }, {
            timeout: 10000 // 10 seconds for status update
          });
          console.log(`Patient status updated successfully:`, statusResponse.data);
        } catch (statusError) {
          console.error(`Error updating patient ${patientId} status:`, statusError);
          // Continue even if status update fails
        }
        
        // Step 3: Immediately fetch the updated patient to ensure we have the latest data
        try {
          const updatedPatient = await getPatientById(patientId);
          console.log('Retrieved updated patient after vitals update:', updatedPatient);
          
          // Return the updated patient data or the original response if fetch fails
          return updatedPatient || response.data;
        } catch (fetchError) {
          console.error(`Error fetching updated patient ${patientId}:`, fetchError);
          // Return the original response data since the fetch failed
          return response.data;
        }
      } catch (apiError: any) {
        console.error(`API error updating vitals for patient ${patientId}:`, apiError);
        
        // Enhanced error reporting
        const status = apiError.response?.status;
        const statusText = apiError.response?.statusText;
        const errorData = apiError.response?.data;
        
        console.error(`API Error Details: Status: ${status} ${statusText}`);
        console.error('Error Data:', errorData);
        
        throw new Error(`Failed to update vitals: ${status} ${statusText} - ${errorData?.message || apiError.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error updating vitals for patient ${patientId}:`, error);
      throw error;
    }
  },
  getVitalsHistory: async (patientId: string): Promise<any> => {
    try {
      console.log(`Fetching vitals history for patient ${patientId}`);
      const response = await api.get(`/api/patients/${patientId}/vitals/history`);
      console.log(`Retrieved ${response.data.vitalsHistory?.length || 0} vitals records for patient ${patientId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching vitals history for patient ${patientId}:`, error);
      throw error;
    }
  },
  update: async (id: string, patientData: any): Promise<any> => {
    try {
      const response = await api.put(`/api/patients/${id}`, patientData);
      return response.data;
    } catch (error) {
      console.error(`Error updating patient ${id}:`, error);
      throw error;
    }
  },
  async getPatientStatistics(timeRange: string): Promise<PatientStatistics> {
    try {
      const response = await api.get(`/api/admin/patient-stats?timeRange=${timeRange}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching patient statistics:', error);
      throw error;
    }
  },
  searchPatients: async (query: string): Promise<Patient[]> => {
    try {
      const response = await api.get(`/api/patients/search?q=${encodeURIComponent(query)}`);
      // Backend returns { success: true, data: [...] }
      return response.data?.data || response.data?.patients || response.data || [];
    } catch (error) {
      console.error('Error searching patients:', error);
      // Fallback to local search using getAllPatients
      try {
        const allPatientsResponse = await getAllPatients(false, false, 1000);
        const patients = allPatientsResponse.patients || [];
        const lowerQuery = query.toLowerCase();
        return patients.filter(patient => 
          `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(lowerQuery) ||
          patient.patientId?.toLowerCase().includes(lowerQuery) ||
          patient.contactNumber?.includes(query)
        );
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        return [];
      }
    }
  },
  
  // New methods for doctor dashboard with separated completed reports
  getActivePatients: async (page: number = 1, limit: number = 50, search: string = ''): Promise<PaginatedPatients> => {
    try {
      console.log(`Fetching active patients (excluding completed) - page: ${page}, limit: ${limit}, search: ${search}`);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      const response = await api.get(`/api/doctor/patients/active?${params.toString()}`);
      console.log('Active patients response:', response.data);
      
      const processedPatients = response.data.data.map((patient: any) => {
        if (patient._id && !patient.id) {
          patient.id = patient._id.toString();
        }
        return patient;
      });
      
      return {
        patients: processedPatients,
        currentPage: response.data.pagination?.currentPage || page,
        totalPages: response.data.pagination?.totalPages || 1,
        totalPatients: response.data.pagination?.totalPatients || processedPatients.length
      };
    } catch (error) {
      console.error('Error fetching active patients:', error);
      throw error;
    }
  },
  
  getCompletedPatients: async (page: number = 1, limit: number = 50, search: string = '', dateFrom?: string, dateTo?: string): Promise<PaginatedPatients> => {
    try {
      console.log(`Fetching completed patients - page: ${page}, limit: ${limit}, search: ${search}`);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (search.trim()) {
        params.append('search', search.trim());
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
      }
      
      const response = await api.get(`/api/doctor/patients/completed?${params.toString()}`);
      console.log('Completed patients response:', response.data);
      
      const processedPatients = response.data.data.map((patient: any) => {
        if (patient._id && !patient.id) {
          patient.id = patient._id.toString();
        }
        return patient;
      });
      
      return {
        patients: processedPatients,
        currentPage: response.data.pagination?.currentPage || page,
        totalPages: response.data.pagination?.totalPages || 1,
        totalPatients: response.data.pagination?.totalPatients || processedPatients.length
      };
    } catch (error) {
      console.error('Error fetching completed patients:', error);
      throw error;
    }
  },
  
  completePatient: async (patientId: string, notes?: string, completionReason?: string): Promise<any> => {
    try {
      console.log(`Completing patient ${patientId} with notes: ${notes}`);
      const response = await api.put(`/api/doctor/patients/${patientId}/complete`, {
        notes,
        completionReason
      });
      console.log('Patient completion response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error completing patient ${patientId}:`, error);
      throw error;
    }
  },
  
  reopenPatient: async (patientId: string, reason: string, newStatus: string = 'scheduled'): Promise<any> => {
    try {
      console.log(`Reopening patient ${patientId} with reason: ${reason}, new status: ${newStatus}`);
      const response = await api.put(`/api/doctor/patients/${patientId}/reopen`, {
        reason,
        newStatus
      });
      console.log('Patient reopening response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error reopening patient ${patientId}:`, error);
      throw error;
    }
  },
};

export default patientService;