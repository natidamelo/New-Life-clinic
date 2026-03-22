import api from './api';

export interface IPDAdmission {
  _id: string;
  patientId: { _id: string; firstName?: string; lastName?: string; patientId?: string };
  patientName: string;
  wardName: string;
  roomNumber: string;
  bedNumber: string;
  admitDate: string;
  dischargeDate?: string;
  admittingDoctorId: { _id: string; firstName?: string; lastName?: string };
  admittingDoctorName?: string;
  status: 'active' | 'discharged';
  admissionNotes?: string;
  dischargeNotes?: string;
  invoiceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IPDPatient {
  _id: string;
  firstName: string;
  lastName: string;
  patientId?: string;
  status: string;
  roomNumber?: string;
  assignedDoctorId?: { firstName?: string; lastName?: string };
  assignedNurseId?: { firstName?: string; lastName?: string };
  admission?: {
    wardName: string;
    roomNumber: string;
    bedNumber: string;
    admitDate: string;
    admissionId: string;
  } | null;
}

export const ipdService = {
  async getAdmissions(status?: 'active' | 'discharged') {
    const params = status ? `?status=${status}` : '';
    const res = await api.get<{ success: boolean; data: IPDAdmission[] }>(`/api/ipd/admissions${params}`);
    return res.data.data || [];
  },

  async getPatients() {
    const res = await api.get<{ success: boolean; data: IPDPatient[] }>('/api/ipd/patients');
    return res.data.data || [];
  },

  async admitPatient(body: {
    patientId: string;
    wardName?: string;
    roomNumber: string;
    bedNumber: string;
    admissionNotes?: string;
  }) {
    const res = await api.post<{ success: boolean; data: IPDAdmission }>('/api/ipd/admit', body);
    return res.data.data;
  },

  async dischargeAdmission(admissionId: string, dischargeNotes?: string) {
    const res = await api.patch<{ success: boolean; data: IPDAdmission }>(
      `/api/ipd/admissions/${admissionId}/discharge`,
      { dischargeNotes }
    );
    return res.data.data;
  },

  async addBedCharge(admissionId: string, days: number, unitPrice: number, description?: string) {
    const res = await api.post<{ success: boolean; data: { invoiceId: string; item: unknown; total: number } }>(
      `/api/ipd/admissions/${admissionId}/bed-charge`,
      { days, unitPrice, description }
    );
    return res.data.data;
  },

  async orderVitals(admissionId: string) {
    const res = await api.post<{ success: boolean; data: unknown }>(
      `/api/ipd/admissions/${admissionId}/order-vitals`
    );
    return res.data.data;
  },

  async getAdmission(id: string) {
    const res = await api.get<{ success: boolean; data: IPDAdmission }>(`/api/ipd/admissions/${id}`);
    return res.data.data;
  },

  async sendReportToDoctor(admissionId: string, reportText: string) {
    const res = await api.post<{ success: boolean; data: { notificationId: string }; message: string }>(
      `/api/ipd/admissions/${admissionId}/send-report`,
      { reportText }
    );
    return res.data;
  },
};
