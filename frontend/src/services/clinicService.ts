import api from './apiService';

export interface Clinic {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  contactEmail?: string;
  contactPhone?: string;
  totalUsers?: number;
  adminUsers?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const clinicService = {
  async listClinics(): Promise<Clinic[]> {
    const response = await api.get<ApiResponse<Clinic[]>>('/api/clinics');
    return response.data.data || [];
  },

  async createClinic(payload: {
    name: string;
    slug?: string;
    contactEmail?: string;
    contactPhone?: string;
  }): Promise<Clinic> {
    const response = await api.post<ApiResponse<Clinic>>('/api/clinics', payload);
    return response.data.data;
  },

  async setClinicActive(clinicRef: string, isActive: boolean): Promise<Clinic> {
    const response = await api.patch<ApiResponse<Clinic>>(`/api/clinics/${clinicRef}/status`, { isActive });
    return response.data.data;
  },

  async assignClinicAdmin(clinicRef: string, payload: { userId?: string; identifier?: string; makeAdmin?: boolean }) {
    const response = await api.post<ApiResponse<any>>(`/api/clinics/${clinicRef}/assign-admin`, payload);
    return response.data.data;
  }
};

export default clinicService;

