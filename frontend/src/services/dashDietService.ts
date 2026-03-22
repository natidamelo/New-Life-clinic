import api from './api';

export interface AIInsights {
  summary: string;
  recommendations: string[];
  warnings: string[];
  generatedAt?: string;
}

export interface DashDietRecord {
  _id?: string;
  patientId: string;
  patientName: string;
  planType: 'dash' | 'low_sodium' | 'heart_healthy';
  riskLevel: 'low' | 'moderate' | 'high';
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  bmi: number;
  weight: number;
  height: number;
  dietaryRestrictions: string[];
  goals: string[];
  generatedAt: string;
  generatedBy: string;
  generatedByName: string;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  aiInsights?: AIInsights;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIChatResponse {
  reply: string;
  isAIAvailable: boolean;
}

export interface DashDietStats {
  totalRecords: number;
  timePeriod: string;
  riskLevel: string;
  activePlans: number;
  completedPlans: number;
  highRiskPatients: number;
  moderateRiskPatients: number;
  lowRiskPatients: number;
}

export interface DashDietFilters {
  riskLevel?: 'low' | 'moderate' | 'high' | 'all';
  status?: 'active' | 'completed' | 'cancelled' | 'all';
  timePeriod?: 'today' | 'week' | 'month' | 'all';
  searchTerm?: string;
  page?: number;
  limit?: number;
}

export interface DashDietResponse {
  data: DashDietRecord[];
  stats: DashDietStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class DashDietService {
  /**
   * Get all DASH diet records with optional filtering
   */
  async getDashDietRecords(filters: DashDietFilters = {}): Promise<DashDietResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters.riskLevel && filters.riskLevel !== 'all') {
        params.append('riskLevel', filters.riskLevel);
      }
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.timePeriod && filters.timePeriod !== 'all') {
        params.append('timePeriod', filters.timePeriod);
      }
      if (filters.searchTerm) {
        params.append('searchTerm', filters.searchTerm);
      }
      if (filters.page) {
        params.append('page', filters.page.toString());
      }
      if (filters.limit) {
        params.append('limit', filters.limit.toString());
      }

      const response = await api.get(`/api/dash-diet/records?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching DASH diet records:', error);
      throw error;
    }
  }

  /**
   * Create a new DASH diet record
   */
  async createDashDietRecord(record: Omit<DashDietRecord, '_id' | 'generatedAt' | 'generatedBy' | 'generatedByName'>): Promise<DashDietRecord> {
    try {
      const response = await api.post('/api/dash-diet/records', record);
      return response.data.data;
    } catch (error) {
      console.error('Error creating DASH diet record:', error);
      throw error;
    }
  }

  /**
   * Update an existing DASH diet record
   */
  async updateDashDietRecord(recordId: string, updates: Partial<DashDietRecord>): Promise<DashDietRecord> {
    try {
      const response = await api.put(`/api/dash-diet/records/${recordId}`, updates);
      return response.data.data;
    } catch (error) {
      console.error('Error updating DASH diet record:', error);
      throw error;
    }
  }

  /**
   * Delete a DASH diet record
   */
  async deleteDashDietRecord(recordId: string): Promise<void> {
    try {
      await api.delete(`/api/dash-diet/records/${recordId}`);
    } catch (error) {
      console.error('Error deleting DASH diet record:', error);
      throw error;
    }
  }

  /**
   * Get DASH diet record by ID
   */
  async getDashDietRecordById(recordId: string): Promise<DashDietRecord> {
    try {
      const response = await api.get(`/api/dash-diet/records/${recordId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching DASH diet record:', error);
      throw error;
    }
  }

  /**
   * Get DASH diet records for a specific patient
   */
  async getPatientDashDietRecords(patientId: string): Promise<DashDietRecord[]> {
    try {
      const response = await api.get(`/api/dash-diet/patients/${patientId}/records`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching patient DASH diet records:', error);
      throw error;
    }
  }

  /**
   * Generate a personalized DASH diet plan for a patient
   */
  async generateDashDietPlan(patientId: string, planType: 'dash' | 'low_sodium' | 'heart_healthy' = 'dash'): Promise<DashDietRecord> {
    try {
      const response = await api.post(`/api/dash-diet/generate/${patientId}`, { planType });
      return response.data.data;
    } catch (error) {
      console.error('Error generating DASH diet plan:', error);
      throw error;
    }
  }

  /**
   * Get DASH diet statistics
   */
  async getDashDietStats(): Promise<DashDietStats> {
    try {
      const response = await api.get('/api/dash-diet/stats');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching DASH diet statistics:', error);
      throw error;
    }
  }

  /**
   * Search patients for DASH diet planning
   */
  async searchPatientsForDashDiet(searchTerm: string): Promise<any[]> {
    try {
      const response = await api.get(`/api/dash-diet/search-patients?searchTerm=${encodeURIComponent(searchTerm)}`);
      return response.data.data;
    } catch (error) {
      console.error('Error searching patients for DASH diet:', error);
      throw error;
    }
  }

  /**
   * Get DASH diet recommendations based on patient's condition
   */
  async getDashDietRecommendations(patientId: string): Promise<{
    recommendedPlanType: 'dash' | 'low_sodium' | 'heart_healthy';
    riskLevel: 'low' | 'moderate' | 'high';
    dietaryRestrictions: string[];
    goals: string[];
    notes: string;
  }> {
    try {
      const response = await api.get(`/api/dash-diet/recommendations/${patientId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching DASH diet recommendations:', error);
      throw error;
    }
  }

  /**
   * Export DASH diet records to PDF
   */
  async exportDashDietRecords(filters: DashDietFilters = {}): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      
      if (filters.riskLevel && filters.riskLevel !== 'all') {
        params.append('riskLevel', filters.riskLevel);
      }
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.timePeriod && filters.timePeriod !== 'all') {
        params.append('timePeriod', filters.timePeriod);
      }

      const response = await api.get(`/api/dash-diet/export?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting DASH diet records:', error);
      throw error;
    }
  }

  /**
   * Send a message to the AI nutritionist chat
   */
  async sendAIChatMessage(
    message: string,
    patientContext?: Partial<DashDietRecord>,
    chatHistory?: ChatMessage[]
  ): Promise<AIChatResponse> {
    try {
      const response = await api.post('/api/dash-diet/ai-chat', {
        message,
        patientContext,
        chatHistory: (chatHistory || []).map(m => ({ role: m.role, content: m.content }))
      });
      return response.data;
    } catch (error) {
      console.error('Error sending AI chat message:', error);
      throw error;
    }
  }

  /**
   * Regenerate AI insights for a specific record
   */
  async regenerateAIInsights(recordId: string): Promise<AIInsights> {
    try {
      const response = await api.post(`/api/dash-diet/ai-insights/${recordId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error regenerating AI insights:', error);
      throw error;
    }
  }

  /**
   * Get DASH diet plan templates
   */
  async getDashDietTemplates(): Promise<{
    dash: any;
    low_sodium: any;
    heart_healthy: any;
  }> {
    try {
      const response = await api.get('/api/dash-diet/templates');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching DASH diet templates:', error);
      throw error;
    }
  }

  /**
   * Validate DASH diet record data
   */
  validateDashDietRecord(record: Partial<DashDietRecord>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!record.patientId) {
      errors.push('Patient ID is required');
    }
    if (!record.patientName) {
      errors.push('Patient name is required');
    }
    if (!record.planType) {
      errors.push('Plan type is required');
    }
    if (!record.riskLevel) {
      errors.push('Risk level is required');
    }
    if (!record.bloodPressure || !record.bloodPressure.systolic || !record.bloodPressure.diastolic) {
      errors.push('Blood pressure readings are required');
    }
    if (!record.bmi || record.bmi <= 0) {
      errors.push('Valid BMI is required');
    }
    if (!record.weight || record.weight <= 0) {
      errors.push('Valid weight is required');
    }
    if (!record.height || record.height <= 0) {
      errors.push('Valid height is required');
    }
    if (!record.dietaryRestrictions || record.dietaryRestrictions.length === 0) {
      errors.push('At least one dietary restriction is required');
    }
    if (!record.goals || record.goals.length === 0) {
      errors.push('At least one diet goal is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default new DashDietService();
