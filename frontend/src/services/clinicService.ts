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
  },

  /** Dry-run: preview counts. Apply: dryRun false + confirmationCode REHOME_ALL_TO_CLINIC */
  async rehomeAllData(
    clinicRef: string,
    payload: { dryRun: boolean; confirmationCode?: string }
  ): Promise<{
    targetClinicId: string;
    dryRun: boolean;
    totalDocuments: number;
    perCollection: { collection: string; count: number; error?: string }[];
  }> {
    const response = await api.post<
      ApiResponse<{
        targetClinicId: string;
        dryRun: boolean;
        totalDocuments: number;
        perCollection: { collection: string; count: number; error?: string }[];
      }>
    >(`/api/clinics/${encodeURIComponent(clinicRef)}/rehome-all-data`, payload);
    return response.data.data;
  }
};

export default clinicService;

