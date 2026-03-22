import api from './api';

export interface ReferralData {
  _id?: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientAddress: string;
  patientPhone: string;
  medicalRecordNumber: string;
  referredToDoctorName: string;
  referredToClinic: string;
  referredToPhone: string;
  referredToEmail: string;
  referredToAddress: string;
  referralDate: string;
  referralTime: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  medications: string;
  allergies: string;
  physicalExamination: string;
  diagnosis: string;
  reasonForReferral: string;
  requestedInvestigations: string;
  requestedTreatments: string;
  followUpInstructions: string;
  additionalNotes: string;
  status?: 'Draft' | 'Sent' | 'Received' | 'Completed' | 'Cancelled';
}

export interface ReferralFilters {
  page?: number;
  limit?: number;
  patientId?: string;
  doctorId?: string;
  status?: string;
  urgency?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ReferralStats {
  total: number;
  sent: number;
  received: number;
  completed: number;
  cancelled: number;
  routine: number;
  urgent: number;
  emergency: number;
}

class ReferralService {
  /**
   * Create a new referral
   */
  async createReferral(referralData: ReferralData) {
    try {
      const response = await api.post('/api/referrals', referralData);
      return response.data;
    } catch (error: any) {
      console.error('Error creating referral:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to create referral'
      );
    }
  }

  /**
   * Get all referrals with filters
   */
  async getReferrals(filters: ReferralFilters = {}) {
    try {
      const response = await api.get('/api/referrals', { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching referrals:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch referrals'
      );
    }
  }

  /**
   * Get a single referral by ID
   */
  async getReferralById(id: string) {
    try {
      const response = await api.get(`/api/referrals/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching referral:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch referral'
      );
    }
  }

  /**
   * Update a referral
   */
  async updateReferral(id: string, referralData: Partial<ReferralData>) {
    try {
      const response = await api.put(`/api/referrals/${id}`, referralData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating referral:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to update referral'
      );
    }
  }

  /**
   * Delete (cancel) a referral
   */
  async deleteReferral(id: string) {
    try {
      const response = await api.delete(`/api/referrals/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting referral:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to delete referral'
      );
    }
  }

  /**
   * Get referrals for a specific patient
   */
  async getPatientReferrals(patientId: string, status?: string, limit?: number) {
    try {
      const params: any = {};
      if (status) params.status = status;
      if (limit) params.limit = limit;
      
      const response = await api.get(`/api/referrals/patient/${patientId}`, { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching patient referrals:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch patient referrals'
      );
    }
  }

  /**
   * Get referrals by doctor
   */
  async getDoctorReferrals(doctorId: string, filters: ReferralFilters = {}) {
    try {
      const response = await api.get(`/api/referrals/doctor/${doctorId}`, { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching doctor referrals:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch doctor referrals'
      );
    }
  }

  /**
   * Get referral statistics
   */
  async getReferralStats(startDate?: string, endDate?: string, doctorId?: string) {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (doctorId) params.doctorId = doctorId;
      
      const response = await api.get('/api/referrals/stats', { params });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching referral stats:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch referral stats'
      );
    }
  }

  /**
   * Generate printable referral data
   */
  async generatePrintableReferral(id: string) {
    try {
      const response = await api.get(`/api/referrals/${id}/print`);
      return response.data;
    } catch (error: any) {
      console.error('Error generating printable referral:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to generate printable referral'
      );
    }
  }

  /**
   * Export referrals to CSV
   */
  async exportReferrals(filters: ReferralFilters = {}) {
    try {
      const response = await api.get('/api/referrals/export', {
        params: filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      console.error('Error exporting referrals:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to export referrals'
      );
    }
  }
}

const referralService = new ReferralService();
export default referralService;

