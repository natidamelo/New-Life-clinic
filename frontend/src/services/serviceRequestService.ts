import { api } from './api';

export interface ServiceRequest {
  _id?: string;
  patient: string;
  service: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  requestDate?: Date;
  completionDate?: Date;
  assignedNurse?: string;
  assignedDoctor?: string;
  notes?: string;
  invoice?: string;
  quantity?: number;
  source?: 'doctor' | 'reception' | 'nurse' | 'admin';
}

export type CreateServiceRequestDto =
  | (Omit<ServiceRequest, '_id'> & {
      // Back-compat aliases supported by backend
      patientId?: string;
      serviceId?: string;
      assignedNurseId?: string;
      assignedDoctorId?: string;
    })
  | {
      // Minimal shape used in some parts of the app
      patientId?: string;
      patient?: string;
      serviceId?: string;
      service?: string;
      assignedNurseId?: string;
      assignedNurse?: string;
      assignedDoctorId?: string;
      assignedDoctor?: string;
      notes?: string;
      status?: ServiceRequest['status'];
      quantity?: number;
      source?: ServiceRequest['source'];
      patientInfo?: any;
      preferredDoctorId?: string;
    };

const serviceRequestService = {
  createServiceRequest: async (data: CreateServiceRequestDto) => {
    const response = await api.post('/api/service-requests', data);
    return response.data;
  },

  getServiceRequests: async (status?: string, populated: boolean = true) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (populated) params.append('populated', 'true');
    
    const response = await api.get(`/api/service-requests?${params.toString()}`);
    return response.data;
  },

  getServiceRequest: async (id: string) => {
    const response = await api.get(`/api/service-requests/${id}`);
    return response.data;
  },

  updateServiceRequest: async (id: string, data: Partial<ServiceRequest>) => {
    const response = await api.put(`/api/service-requests/${id}`, data);
    return response.data;
  },

  deleteServiceRequest: async (id: string) => {
    const response = await api.delete(`/api/service-requests/${id}`);
    return response.data;
  }
};

export default serviceRequestService; 