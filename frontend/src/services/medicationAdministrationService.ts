import { api } from './api';

export interface DoseAdministrationRequest {
  taskId: string;
  day: number;
  timeSlot: string;
  notes?: string;
}

export interface DoseAdministrationResponse {
  success: boolean;
  message: string;
  data: {
    taskId: string;
    patientName: string;
    medicationName: string;
    day: number;
    timeSlot: string;
    administeredAt: string;
    administeredBy: string;
    inventoryDeducted: boolean;
    inventoryDetails?: {
      serviceName: string;
      itemsDeducted: Array<{
        name: string;
        previousQuantity: number;
        newQuantity: number;
        quantityDeducted: number;
      }>;
      totalItems: number;
    };
    doseRecord: any;
  };
  error?: string;
}

export interface DoseStatusResponse {
  success: boolean;
  data: {
    administered: boolean;
    administeredAt: string | null;
    administeredBy: string | null;
    notes: string;
    inventoryDeducted: boolean;
    processed: boolean;
    doseRecord: any;
  };
}

class MedicationAdministrationService {
  private baseUrl = '/api/medication-administration';

  /**
   * Check if user is properly authenticated
   */
  private checkAuthentication(): { isAuthenticated: boolean; token: string | null; user: any } {
    const token = localStorage.getItem('clinic_auth_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
    const userData = localStorage.getItem('clinic_user_data') || localStorage.getItem('user_data');
    
    if (!token) {
      console.error('❌ [MED ADMIN] No authentication token found');
      return { isAuthenticated: false, token: null, user: null };
    }
    
    if (!userData) {
      console.error('❌ [MED ADMIN] No user data found');
      return { isAuthenticated: false, token: null, user: null };
    }
    
    try {
      const user = JSON.parse(userData);
      const allowedRoles = ['nurse', 'admin', 'doctor'];
      
      if (!allowedRoles.includes(user.role)) {
        console.error(`❌ [MED ADMIN] User role '${user.role}' not authorized for medication administration`);
        return { isAuthenticated: false, token: null, user: null };
      }
      
      console.log(`✅ [MED ADMIN] User authenticated: ${user.role} (${user.email || user.name})`);
      return { isAuthenticated: true, token, user };
    } catch (error) {
      console.error('❌ [MED ADMIN] Error parsing user data:', error);
      return { isAuthenticated: false, token: null, user: null };
    }
  }

  /**
   * Administer a medication dose
   */
  async administerDose(request: DoseAdministrationRequest): Promise<DoseAdministrationResponse> {
    try {
      console.log('🚀 [MED ADMIN] Administering dose:', request);
      
      // Check authentication first
      const auth = this.checkAuthentication();
      if (!auth.isAuthenticated) {
        throw new Error('Authentication required. Please log in with a valid account (nurse, doctor, or admin).');
      }
      
      // Debug: Check if we have a token
      console.log('🔐 [MED ADMIN] Token available:', !!auth.token);
      console.log('🔐 [MED ADMIN] Token preview:', auth.token ? auth.token.substring(0, 20) + '...' : 'No token');
      console.log('👤 [MED ADMIN] User role:', auth.user?.role);
      
      // Ensure the token is properly set in the API headers
      if (auth.token) {
        // Ensure token has Bearer prefix
        const tokenWithBearer = auth.token.startsWith('Bearer ') ? auth.token : `Bearer ${auth.token}`;
        api.defaults.headers.common['Authorization'] = tokenWithBearer;
        console.log('🔧 [MED ADMIN] API headers updated with token');
        console.log('🔧 [MED ADMIN] Full Authorization header:', tokenWithBearer);
      }
      
      // Debug: Log the exact request being sent
      console.log('🔍 [MED ADMIN] Request URL:', `${this.baseUrl}/administer-dose`);
      console.log('🔍 [MED ADMIN] Request body:', request);
      console.log('🔍 [MED ADMIN] Request headers:', api.defaults.headers.common);
      
      const response = await api.post(`${this.baseUrl}/administer-dose`, request);
      
      console.log('✅ [MED ADMIN] Dose administered successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [MED ADMIN] Failed to administer dose:', error);
      console.error('❌ [MED ADMIN] Error response:', error.response?.data);
      console.error('❌ [MED ADMIN] Error status:', error.response?.status);
      console.error('❌ [MED ADMIN] Error headers:', error.response?.headers);
      
      // Handle specific error cases
      if (error.response?.status === 403) {
        throw new Error('Access denied. Please check if you are logged in and have permission to administer medications. Required roles: nurse, doctor, or admin.');
      } else if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again with valid credentials.');
      } else if (error.response?.status === 409) {
        throw new Error('This dose is currently being processed. Please wait.');
      } else if (error.response?.status === 400) {
        const errorData = error.response.data;
        console.error('❌ [MED ADMIN] 400 Error details:', errorData);
        if (errorData.error === 'DOSE_ALREADY_ADMINISTERED') {
          throw new Error('This dose has already been administered.');
        } else if (errorData.error === 'INSUFFICIENT_STOCK') {
          throw new Error(errorData.message || 'Insufficient medication stock.');
        } else if (errorData.error === 'INVALID_TIME_SLOT') {
          throw new Error(errorData.message || 'Invalid time slot format.');
        } else if (errorData.error === 'MISSING_REQUIRED_FIELDS') {
          throw new Error(errorData.message || 'Missing required fields: taskId, day, and timeSlot are required.');
        } else if (errorData.error === 'DOSE_NOT_AVAILABLE_YET') {
          throw new Error(errorData.message || 'This dose is not available yet due to timing restrictions.');
        } else {
          // Log the full error data for debugging
          console.error('❌ [MED ADMIN] Unhandled 400 error:', errorData);
          throw new Error(errorData.message || `Bad Request: ${JSON.stringify(errorData)}`);
        }
      } else if (error.response?.status === 500) {
        throw new Error('Server error. Please try again or contact support.');
      }
      
      // Handle network or other errors
      if (error.message === 'Network Error') {
        throw new Error('Network error. Please check your connection and try again.');
      }
      
      throw error;
    }
  }

  /**
   * Check the status of a specific dose
   */
  async getDoseStatus(taskId: string, day: number, timeSlot: string): Promise<DoseStatusResponse> {
    try {
      // Check authentication first
      const auth = this.checkAuthentication();
      if (!auth.isAuthenticated) {
        throw new Error('Authentication required. Please log in with a valid account.');
      }
      
      const response = await api.get(`${this.baseUrl}/dose-status/${taskId}/${day}/${timeSlot}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [MED ADMIN] Failed to get dose status:', error);
      throw new Error(error.response?.data?.message || 'Failed to get dose status');
    }
  }

  /**
   * Get current administration locks (for debugging)
   */
  async getAdministrationLocks() {
    try {
      // Check authentication first
      const auth = this.checkAuthentication();
      if (!auth.isAuthenticated) {
        throw new Error('Authentication required. Please log in with a valid account.');
      }
      
      const response = await api.get(`${this.baseUrl}/locks`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [MED ADMIN] Failed to get locks:', error);
      throw new Error(error.response?.data?.message || 'Failed to get administration locks');
    }
  }

  /**
   * Delete a medication task
   */
  async deleteMedication(taskId: string) {
    try {
      console.log('🗑️ [MED ADMIN] Deleting medication task:', taskId);
      
      // Check authentication first
      const auth = this.checkAuthentication();
      if (!auth.isAuthenticated) {
        throw new Error('Authentication required. Please log in with a valid account.');
      }
      
      const response = await api.delete(`${this.baseUrl}/task/${taskId}`);
      console.log('✅ [MED ADMIN] Medication task deleted successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ [MED ADMIN] Failed to delete medication task:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete medication task');
    }
  }
}

export const medicationAdministrationService = new MedicationAdministrationService();
export default medicationAdministrationService; 