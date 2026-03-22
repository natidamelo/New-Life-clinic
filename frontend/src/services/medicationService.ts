import axios from 'axios';
import { API_BASE_URL } from '../config/index';

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate?: string;
  prescribedBy: string;
  prescribedAt: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  administeredBy?: string;
  administeredAt?: string;
  notes?: string;
  priority: 'normal' | 'urgent' | 'stat';
  instructions?: string;
  sideEffects?: string[];
  contraindications?: string[];
}

class MedicationService {
  async getMedications(patientId: string): Promise<Medication[]> {
    const response = await axios.get(`${API_BASE_URL}/medications/${patientId}`);
    return response.data;
  }

  async prescribeMedication(medication: Omit<Medication, 'id' | 'prescribedAt'>): Promise<Medication> {
    const response = await axios.post(`${API_BASE_URL}/medications`, medication);
    return response.data;
  }

  async administerMedication(medicationId: string, adminData: { administeredBy: string; notes?: string }): Promise<Medication> {
    const response = await axios.patch(`${API_BASE_URL}/medications/${medicationId}/administer`, adminData);
    return response.data;
  }

  async getPendingAdministrations(): Promise<Medication[]> {
    const response = await axios.get(`${API_BASE_URL}/medications/pending-administrations`);
    return response.data;
  }

  async getUrgentMedications(): Promise<Medication[]> {
    const response = await axios.get(`${API_BASE_URL}/medications/urgent`);
    return response.data;
  }

  async cancelMedication(medicationId: string, reason: string): Promise<Medication> {
    const response = await axios.patch(`${API_BASE_URL}/medications/${medicationId}/cancel`, { reason });
    return response.data;
  }
}

export const medicationService = new MedicationService(); 