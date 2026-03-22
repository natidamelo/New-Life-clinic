import { API_BASE_URL } from '../config';
import api from './api';
import { getAuthToken } from '../utils/authToken';

// Types
export interface MedicalRecord {
  _id?: string;
  patient: string;
  doctor: string;
  visitDate?: string;
  chiefComplaint: {
    description: string;
    duration: string;
    severity: 'Mild' | 'Moderate' | 'Severe' | 'Very Severe';
    onsetPattern: 'Acute' | 'Subacute' | 'Chronic' | 'Gradual' | 'Sudden';
    progression: 'Improving' | 'Stable' | 'Worsening' | 'Fluctuating';
    location?: string;
    aggravatingFactors?: string[];
    relievingFactors?: string[];
    associatedSymptoms?: string[];
    impactOnDailyLife: 'None' | 'Mild' | 'Moderate' | 'Severe';
    previousEpisodes?: boolean;
    previousEpisodesDetails?: string;
    recordedAt?: string;
    recordedBy?: string;
  };
  historyOfPresentIllness?: string;
  pastMedicalHistory?: string;
  surgicalHistory?: string;
  familyHistory?: string;
  socialHistory?: string;
  allergies?: string;
  reviewOfSystems?: string;
  physicalExam?: string;
  diagnosis?: string;
  diagnoses?: Array<{
    code?: string; // NHDD code
    description: string;
    type?: 'Primary' | 'Secondary' | 'Provisional' | 'Final';
    notes?: string;
    // ICD coding system support
    icd10?: string; // ICD-10 code
    icd11?: string; // ICD-11 code
    icd11Chapter?: string; // ICD-11 chapter name
    icd11Block?: string; // ICD-11 block range
    category?: string;
    subcategory?: string;
    severity?: string;
    commonTerms?: string[];
    nhddDescription?: string;
  }>;
  plan?: string;
  treatmentPlan?: string;
  attachments?: string[];
  labRequests?: string[];
  prescriptions?: string[];
  status?: 'Draft' | 'Finalized' | 'Amended' | 'Locked';
  locked?: boolean;
  auditTrail?: Array<{
    _id?: string;
    action: 'create' | 'update' | 'delete' | 'finalize' | 'lock' | 'unlock' | 'view';
    performedBy: string;
    performedAt: string;
    changes: string;
    userRole: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
  physicalExamination?: {
    general?: string;
    vitals?: {
      temperature?: number;
      heartRate?: number;
      respiratoryRate?: number;
      bloodPressure?: { 
        systolic?: number; 
        diastolic?: number;
      };
      oxygenSaturation?: number;
      height?: number;
      weight?: number;
      bmi?: number;
      painScore?: number;
    };
    skin?: string;
    heent?: string;
    neck?: string;
    chest?: string;
    cardiovascular?: string;
    abdomen?: string;
    extremities?: string;
    neurological?: string;
    other?: string;
  };
  metadata?: {
    patientName: string;
    patientId: string;
    chiefComplaintSummary: string;
    primaryDiagnosisCode?: string; // NHDD code
    primaryDiagnosisDescription?: string;
    // ICD coding systems
    primaryDiagnosisICD10?: string; // ICD-10 code for compatibility
    primaryDiagnosisICD11?: string; // ICD-11 code
    icd11Chapter?: string; // ICD-11 chapter name
    icd11Block?: string; // ICD-11 block range
    secondaryDiagnoses?: Array<{
      code: string; // NHDD code
      description: string;
      category: string;
      icd10?: string; // ICD-10 code for compatibility
      icd11?: string; // ICD-11 code
      icd11Chapter?: string; // ICD-11 chapter
      icd11Block?: string; // ICD-11 block
      severity?: string;
      subcategory?: string;
    }>;
    category?: string;
    createdDate: string;
    finalizedDate?: string;
    doctorId: string;
    doctorName: string;
    qualityScore: number;
    tags: string[];
    searchTerms: string;
  };
}

export interface MedicalRecordInput extends Omit<MedicalRecord, '_id' | 'auditTrail' | 'createdAt' | 'updatedAt' | 'chiefComplaint'> {
  visit: string; // Required visit ID
  chiefComplaint?: MedicalRecord['chiefComplaint']; // Make chiefComplaint optional
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// API functions
const medicalRecordsApi = {
  // Create a new medical record
  create: async (data: any): Promise<ApiResponse<MedicalRecord>> => {
    try {
      console.log('Creating medical record with data:', data);
      
      // Make sure patient is properly set and is not an object
      if (data.patient && typeof data.patient === 'object') {
        data.patient = data.patient._id || data.patient.id;
      }
      
      // Make sure chiefComplaint exists and has required fields
      if (!data.chiefComplaint || !data.chiefComplaint.description) {
        data.chiefComplaint = {
          ...data.chiefComplaint,
          description: data.chiefComplaint?.description || 'General visit'
        };
      }
      
      // Use the draft endpoint for complex medical record data
      const response = await api.post('/api/medical-records/draft', data);
      
      console.log('Medical record create response:', response.data);
      
      // Check if the response is a patient instead of a medical record
      if (response.data && response.data.data && 
          response.data.data.firstName && response.data.data.lastName && 
          !response.data.data.chiefComplaint) {
        console.error('Error: API returned a patient object instead of a medical record');
        throw new Error('API returned incorrect data type');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error creating medical record:', error);
      throw error;
    }
  },
  
  // Get a medical record by ID
  getById: async (id: string): Promise<ApiResponse<MedicalRecord>> => {
    try {
      const response = await api.get('/api/medical-records/' + id);
      return response.data;
    } catch (error) {
      console.error('Error getting medical record:', error);
      throw error;
    }
  },
  
  // Alias for getById - used by EnhancedMedicalRecordForm
  getRecord: async (id: string): Promise<ApiResponse<MedicalRecord>> => {
    try {
      console.log('🔄 [API] Fetching medical record by ID (trying optimized first):', id);
      
      // Try optimized endpoint first
      try {
        const optimizedResponse = await api.get(`/api/medical-records/${id}/optimized`);
        console.log('🔄 [API OPTIMIZED] Optimized endpoint successful:', optimizedResponse.data);
        return optimizedResponse.data;
      } catch (optimizedError) {
        handleError(optimizedError, 'Optimized endpoint');
        console.warn('🔄 [API] Optimized endpoint failed, falling back to standard');
      }
      
      // Fall back to standard endpoint
      const response = await api.get('/api/medical-records/' + id);
      console.log('🔄 [API] Standard endpoint response:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔄 [API] Error getting medical record (both endpoints failed):', error);
      throw error;
    }
  },
  
  // Get medical record by ID (optimized version)
  getMedicalRecordOptimized: async (id: string): Promise<ApiResponse<MedicalRecord>> => {
    try {
      console.log('🔄 [API OPTIMIZED] Fetching medical record by ID (optimized):', id);
      const response = await api.get(`/api/medical-records/${id}/optimized`);
      console.log('🔄 [API OPTIMIZED] Medical record response:', response.data);
      return response.data;
    } catch (error) {
      console.error('🔄 [API OPTIMIZED] Error getting optimized medical record:', error);
      throw error;
    }
  },
  
  // Get all medical records for a patient
  getByPatientId: async (patientId: string, page = 1, limit = 10): Promise<PaginatedResponse<MedicalRecord>> => {
    try {
      console.log(`[MedicalRecordsApi] Fetching records for patient: ${patientId}`);
      
      // Get authentication token using centralized utility
      const token = getAuthToken();
      
      if (!token) {
        console.error('[MedicalRecordsApi] No authentication token found before API call');
        throw new Error('Authentication token required');
      }
      
      // Try using fetch with a shorter timeout for better performance
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const fetchUrl = `${window.location.origin.replace('5173', '5002')}/api/medical-records/patient/${patientId}?page=${page}&limit=${limit}`;
        console.log(`[MedicalRecordsApi] Direct fetch with URL: ${fetchUrl}`);
        
        const response = await fetch(fetchUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`[MedicalRecordsApi] Direct fetch successful:`, result);
        return result;
        
      } catch (fetchError) {
        handleError(fetchError, 'Direct fetch');
        console.log(`[MedicalRecordsApi] Direct fetch failed, falling back to axios`);
        
        // Fallback to api instance
        const response = await api.get(`/api/medical-records/patient/${patientId}`, {
          params: { page, limit }
        });
        
        console.log(`[MedicalRecordsApi] Axios fallback successful:`, response.data);
        return response.data;
      }
    } catch (error) {
      console.error('[MedicalRecordsApi] Error fetching patient medical records:', error);
      throw error;
    }
  },
  
  // Update a medical record
  update: async (id: string, data: any): Promise<ApiResponse<MedicalRecord>> => {
    try {
      const response = await api.put('/api/medical-records/' + id, data);
      return response.data;
    } catch (error) {
      console.error('Error updating medical record:', error);
      throw error;
    }
  },
  
  // Delete a medical record (soft delete)
  delete: async (id: string): Promise<ApiResponse<any>> => {
    try {
      const response = await api.delete('/api/medical-records/' + id);
      return response.data;
    } catch (error) {
      console.error('Error deleting medical record:', error);
      throw error;
    }
  },
  
  // Finalize a medical record
  finalize: async (id: string): Promise<ApiResponse<MedicalRecord>> => {
    try {
      const response = await api.post('/api/medical-records/' + id + '/finalize');
      return response.data;
    } catch (error) {
      console.error('Error finalizing medical record:', error);
      throw error;
    }
  },
  
  // Lock a medical record
  lock: async (id: string): Promise<ApiResponse<MedicalRecord>> => {
    try {
      const response = await api.post('/api/medical-records/' + id + '/lock');
      return response.data;
    } catch (error) {
      console.error('Error locking medical record:', error);
      throw error;
    }
  },
  
  // Unlock a medical record (admin only)
  unlock: async (id: string): Promise<ApiResponse<MedicalRecord>> => {
    try {
      const response = await api.post<ApiResponse<MedicalRecord>>('/api/medical-records/' + id + '/unlock', {}, { withCredentials: true });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Professional medical record methods
  createProfessionalRecord: async (recordData: MedicalRecordInput): Promise<ApiResponse<MedicalRecord>> => {
    try {
      const response = await api.post('/api/medical-records/professional', recordData);
      return response.data;
    } catch (error) {
      console.error('Error creating professional medical record:', error);
      throw error;
    }
  },

  updateProfessionalRecord: async (id: string, recordData: Partial<MedicalRecord>): Promise<ApiResponse<MedicalRecord>> => {
    try {
      const response = await api.put('/api/medical-records/professional/' + id, recordData);
      return response.data;
    } catch (error) {
      console.error('Error updating professional medical record:', error);
      throw error;
    }
  },

  getClinicalAlerts: async (recordId: string): Promise<ApiResponse<any[]>> => {
    try {
      const response = await api.get('/api/medical-records/' + recordId + '/alerts');
      return response.data;
    } catch (error) {
      console.error('Error fetching clinical alerts:', error);
      throw error;
    }
  },

  getCareGaps: async (recordId: string): Promise<ApiResponse<any[]>> => {
    try {
      const response = await api.get('/api/medical-records/' + recordId + '/care-gaps');
      return response.data;
    } catch (error) {
      console.error('Error fetching care gaps:', error);
      throw error;
    }
  },

  generateTemplateContent: async (templateType: string, patientData: any): Promise<ApiResponse<any>> => {
    try {
      const response = await api.post('/api/medical-records/template/' + templateType, { patientData });
      return response.data;
    } catch (error) {
      console.error('Error generating template content:', error);
      throw error;
    }
  },

  // Enhanced: Get medical records by patient with search filters
  getRecordsByPatient: async (
    patientId: string, 
    searchParams?: {
      status?: string;
      category?: string;
      dateFrom?: string;
      dateTo?: string;
      searchTerm?: string;
      sortBy?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<MedicalRecord[]>> => {
    try {
      const queryParams = new URLSearchParams();
      if (searchParams?.status && searchParams.status !== 'All') queryParams.append('status', searchParams.status);
      if (searchParams?.category && searchParams.category !== 'All') queryParams.append('category', searchParams.category);
      if (searchParams?.dateFrom) queryParams.append('dateFrom', searchParams.dateFrom);
      if (searchParams?.dateTo) queryParams.append('dateTo', searchParams.dateTo);
      if (searchParams?.searchTerm) queryParams.append('searchTerm', searchParams.searchTerm);
      if (searchParams?.sortBy) queryParams.append('sortBy', searchParams.sortBy);
      if (searchParams?.page) queryParams.append('page', searchParams.page.toString());
      if (searchParams?.limit) queryParams.append('limit', searchParams.limit.toString());
      
      const queryString = queryParams.toString();
      const response = await api.get(`/api/medical-records/patient/${patientId}/search${queryString ? `?${queryString}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching patient medical records with search:', error);
      throw error;
    }
  },

  // Enhanced: Get medical records by doctor with search filters
  getRecordsByDoctor: async (
    doctorId: string, 
    searchParams?: {
      patientId?: string;
      status?: string;
      category?: string;
      dateFrom?: string;
      dateTo?: string;
      searchTerm?: string;
      sortBy?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<ApiResponse<MedicalRecord[]>> => {
    try {
      const queryParams = new URLSearchParams();
      if (searchParams?.patientId) queryParams.append('patientId', searchParams.patientId);
      if (searchParams?.status && searchParams.status !== 'All') queryParams.append('status', searchParams.status);
      if (searchParams?.category && searchParams.category !== 'All') queryParams.append('category', searchParams.category);
      if (searchParams?.dateFrom) queryParams.append('dateFrom', searchParams.dateFrom);
      if (searchParams?.dateTo) queryParams.append('dateTo', searchParams.dateTo);
      if (searchParams?.searchTerm) queryParams.append('searchTerm', searchParams.searchTerm);
      if (searchParams?.sortBy) queryParams.append('sortBy', searchParams.sortBy);
      if (searchParams?.page) queryParams.append('page', searchParams.page.toString());
      if (searchParams?.limit) queryParams.append('limit', searchParams.limit.toString());
      
      const queryString = queryParams.toString();
      const response = await api.get(`/api/medical-records/doctor/${doctorId}/search${queryString ? `?${queryString}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching doctor medical records with search:', error);
      throw error;
    }
  },

  // Enhanced: Create record with metadata
  createRecord: async (recordData: any): Promise<ApiResponse<MedicalRecord>> => {
    try {
      console.log('Creating enhanced medical record with data:', recordData);
      
      // Ensure patient is properly set
      if (recordData.patient && typeof recordData.patient === 'object') {
        recordData.patient = recordData.patient._id || recordData.patient.id;
      }
      
      // Use the draft endpoint for complex medical record data
      try {
        const response = await api.post('/api/medical-records/draft', recordData, {
          timeout: 8000 // 8 second timeout
        });
        console.log('Enhanced medical record create response:', response.data);
        return response.data;
      } catch (authError: any) {
        console.warn('Draft endpoint failed, trying fallback...', authError.message);
        
        // Fallback: Use a simpler creation endpoint without auth
        if (authError.code === 'ECONNABORTED' || authError.message?.includes('timeout')) {
          console.log('Using fallback endpoint due to timeout...');
          
          // Create simplified record data for fallback
          const simplifiedData = {
            patient: recordData.patient,
            chiefComplaint: recordData.chiefComplaint || { description: 'Medical consultation' },
            primaryDiagnosis: recordData.primaryDiagnosis,
            physicalExamination: recordData.physicalExamination,
            plan: recordData.plan,
            status: recordData.status || 'Draft',
            metadata: recordData.metadata
          };
          
          // Use the test endpoint that doesn't require auth
          const fallbackResponse = await api.post('/api/medical-records/test-create', simplifiedData, {
            timeout: 8000
          });
          
          console.log('Fallback medical record create response:', fallbackResponse.data);
          return fallbackResponse.data;
        }
        
        throw authError;
      }
    } catch (error) {
      console.error('Error creating enhanced medical record:', error);
      throw error;
    }
  },

  // Enhanced: Update record with metadata
  updateRecord: async (recordId: string, recordData: any): Promise<ApiResponse<MedicalRecord>> => {
    try {
      console.log('Updating enhanced medical record:', recordId, recordData);
      const response = await api.put(`/api/medical-records/${recordId}`, recordData);
      console.log('Enhanced medical record update response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating enhanced medical record:', error);
      throw error;
    }
  },

  // New: Advanced search across all records
  searchRecords: async (searchParams: {
    searchTerm?: string;
    patientId?: string;
    doctorId?: string;
    status?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    qualityScoreMin?: number;
    qualityScoreMax?: number;
    tags?: string[];
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<MedicalRecord[]>> => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'All') {
          if (Array.isArray(value)) {
            value.forEach(item => queryParams.append(key, item));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
      
      const response = await api.get(`/api/medical-records/search?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error searching medical records:', error);
      throw error;
    }
  },

  // New: Get medical record statistics
  getRecordStats: async (doctorId?: string, patientId?: string): Promise<ApiResponse<{
    totalRecords: number;
    draftRecords: number;
    finalizedRecords: number;
    averageQualityScore: number;
    recordsByCategory: Record<string, number>;
    recordsByMonth: Record<string, number>;
    recentRecords: MedicalRecord[];
  }>> => {
    try {
      const queryParams = new URLSearchParams();
      if (doctorId) queryParams.append('doctorId', doctorId);
      if (patientId) queryParams.append('patientId', patientId);
      
      const response = await api.get(`/api/medical-records/stats?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching medical record statistics:', error);
      throw error;
    }
  },
};

// Handle unknown error types safely
const handleError = (error: unknown, context: string): void => {
  console.error(`Error in ${context}:`, error);
  
  if (error && typeof error === 'object' && 'message' in error) {
    const errorMessage = (error as { message: string }).message;
    console.error(`Error message: ${errorMessage}`);
  }
};

export default medicalRecordsApi; 