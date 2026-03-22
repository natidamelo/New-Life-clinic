import api from './api';

export interface VitalSignsData {
  patientId: string;
  patientName: string;
  measurementType?: 'blood_pressure' | 'temperature' | 'pulse' | 'weight' | 'height' | 'comprehensive';
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  spo2?: number;
  respiratoryRate?: number;
  notes: string;
  fileType: 'single' | 'weekly' | 'monthly';
  position?: 'sitting' | 'standing' | 'lying';
  arm?: 'left' | 'right';
  location: string;
  device: string;
  measurementDate: Date;
  taskId?: string;
  taskType?: string;
}

export interface VitalSignsResponse {
  _id: string;
  id?: string;
  patientId: string;
  patientName: string;
  name?: string;
  bloodSugar?: number;
  recordedAt?: string;
  fileType: string;
  measurementType: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  spo2?: number;
  respiratoryRate?: number;
  notes?: string;
  position?: string;
  arm?: string;
  location: string;
  device: string;
  measurementDate: Date | string;
  taskId?: string;
  taskType?: string;
  measuredBy?: string;
  measuredByName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

class VitalSignsService {
  // Save vital signs measurement
  async saveVitalSigns(vitalSignsData: VitalSignsData): Promise<VitalSignsResponse> {
    try {
      console.log('🔍 [VitalSignsService] Saving vital signs:', vitalSignsData);
      console.log('🔐 [VitalSignsService] Auth token check:', localStorage.getItem('clinic_auth_token') ? 'Token found' : 'No token');
      
      const response = await api.post('/api/vital-signs', vitalSignsData);
      console.log('✅ [VitalSignsService] Save successful:', response.data);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('❌ [VitalSignsService] Error saving vital signs:', error);
      throw error;
    }
  }

  // Get vital signs by measurement type
  async getVitalSignsByType(measurementType: string): Promise<VitalSignsResponse[]> {
    try {
      const response = await api.get(`/api/vital-signs/type/${measurementType}`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching vital signs by type:', error);
      throw error;
    }
  }

  // Get pending vital signs by measurement type
  async getPendingVitalSigns(measurementType: string): Promise<VitalSignsResponse[]> {
    try {
      console.log(`🔍 [VitalSignsService] Fetching pending vital signs for type: ${measurementType}`);
      const response = await api.get(`/api/vital-signs/pending/${measurementType}`);
      console.log(`✅ [VitalSignsService] API response:`, response.data);
      return response.data?.data || [];
    } catch (error) {
      console.error('❌ [VitalSignsService] Error fetching pending vital signs:', error);
      console.error('❌ [VitalSignsService] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      // Return empty array instead of throwing error to prevent UI crashes
      return [];
    }
  }

  // Get vital signs history by measurement type
  async getVitalSignsHistory(measurementType: string): Promise<VitalSignsResponse[]> {
    try {
      const response = await api.get(`/api/vital-signs/history/${measurementType}`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching vital signs history:', error);
      // Return empty array instead of throwing error to prevent UI crashes
      return [];
    }
  }

  // Get vital signs by patient
  async getVitalSignsByPatient(patientId: string): Promise<VitalSignsResponse[]> {
    try {
      const response = await api.get(`/api/vital-signs/patient/${patientId}`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching vital signs by patient:', error);
      throw error;
    }
  }

  // Search vital signs by patient name with time period filtering
  async searchVitalSignsByPatientName(
    patientName: string, 
    timePeriod?: string, 
    measurementType?: string,
    status?: 'all' | 'pending' | 'completed'
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('patientName', patientName);
      
      if (timePeriod) {
        params.append('timePeriod', timePeriod);
      }
      
      if (measurementType) {
        params.append('measurementType', measurementType);
      }
      
      if (status && status !== 'all') {
        params.append('status', status);
      }
      
      const response = await api.get(`/api/vital-signs/search?${params.toString()}`);
      return response.data || { data: [], totalRecords: 0, timePeriod: 'all', status: 'all' };
    } catch (error) {
      console.error('Error searching vital signs by patient name:', error);
      throw error;
    }
  }

  // Get pending blood pressure tasks
  async getPendingBloodPressureTasks(): Promise<any[]> {
    try {
      console.log('🔍 [VitalSignsService] Fetching pending blood pressure tasks...');
      const response = await api.get('/api/nurse-tasks?description=Blood Pressure Check&status=PENDING');
      console.log('✅ [VitalSignsService] Response:', response.data);
      // The nurse tasks API returns an array directly, not wrapped in data property
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('❌ [VitalSignsService] Error fetching pending blood pressure tasks:', error);
      // Return empty array instead of throwing error to prevent UI crashes
      return [];
    }
  }

  // Update vital signs
  async updateVitalSigns(id: string, vitalSignsData: Partial<VitalSignsData>): Promise<VitalSignsResponse> {
    try {
      const response = await api.put(`/api/vital-signs/${id}`, vitalSignsData);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error updating vital signs:', error);
      throw error;
    }
  }

  // Delete vital signs
  async deleteVitalSigns(id: string): Promise<void> {
    try {
      await api.delete(`/api/vital-signs/${id}`);
    } catch (error) {
      console.error('Error deleting vital signs:', error);
      throw error;
    }
  }

  // Get latest nurse vital signs for a patient (including BMI)
  async getLatestNurseVitals(patientId: string): Promise<any> {
    try {
      console.log(`[VitalSignsService] Fetching latest nurse vitals for patient: ${patientId}`);
      
      const response = await api.get(`/api/vital-signs/patient/${patientId}/latest`);
      
      if (response.data.success) {
        console.log(`[VitalSignsService] Found latest nurse vitals:`, response.data.data);
        return response.data.data;
      } else {
        console.log(`[VitalSignsService] No vitals found for patient: ${patientId}`);
        return null;
      }
    } catch (error: any) {
      // If 404, return null (no vitals found)
      if (error.response?.status === 404) {
        console.log(`[VitalSignsService] No vitals found for patient: ${patientId}`);
        return null;
      }
      
      console.error(`[VitalSignsService] Error fetching latest nurse vitals:`, error);
      throw error;
    }
  }

  // Get patient records for printing
  async getPatientRecordsForPrint(
    patientId: string,
    startDate: string,
    endDate: string,
    measurementType: string = 'blood_pressure'
  ): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      params.append('measurementType', measurementType);
      params.append('includeNotes', 'true');
      
      const response = await api.get(`/api/vital-signs/patient/${patientId}/print?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching patient records for print:', error);
      throw error;
    }
  }
}

const vitalSignsService = new VitalSignsService();
export default vitalSignsService; 