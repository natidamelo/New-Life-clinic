import api from './api';

export interface PatientAssignmentStats {
  departmentStats: {
    [key: string]: {
      assigned: number;
      total: number;
      capacity: number;
    };
  };
  unassignedPatients: number;
  totalAssignedPatients: number;
  totalStaff: number;
}

export interface AvailableStaff {
  id: string;
  name: string;
  role: string;
  specialization?: string;
  department?: string;
  email?: string;
  assignedPatients: number;
  available: boolean;
}

export interface AssignmentResult {
  patientId: string;
  patientName: string;
  assignedDoctor?: string;
  assignedNurse?: string;
}

export interface RebalanceResult {
  success: boolean;
  message: string;
  assignmentsMade: number;
  assignmentResults: AssignmentResult[];
}

class PatientAssignmentService {
  // Get patient assignment statistics
  async getAssignmentStats(): Promise<PatientAssignmentStats> {
    const response = await api.get('/api/staff/patient-assignments/stats');
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch assignment stats');
    }
    return response.data.data;
  }

  // Get available staff for patient assignment
  async getAvailableStaff(params?: {
    role?: string;
    department?: string;
  }): Promise<AvailableStaff[]> {
    const response = await api.get('/api/staff/patient-assignments/available-staff', { params });
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch available staff');
    }
    return response.data.data || [];
  }

  // Assign patient to staff member
  async assignPatient(data: {
    patientId: string;
    staffId: string;
    assignmentType: 'doctor' | 'nurse';
  }): Promise<any> {
    const response = await api.post('/api/staff/patient-assignments/assign', data);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to assign patient');
    }
    return response.data;
  }

  // Remove patient assignment
  async removeAssignment(data: {
    patientId: string;
    assignmentType: 'doctor' | 'nurse';
  }): Promise<any> {
    const response = await api.post('/api/staff/patient-assignments/remove', data);
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to remove assignment');
    }
    return response.data;
  }

  // Rebalance patient assignments
  async rebalanceAssignments(): Promise<RebalanceResult> {
    const response = await api.post('/api/staff/patient-assignments/rebalance');
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to rebalance assignments');
    }
    return response.data;
  }

  // Get unassigned patients
  async getUnassignedPatients(): Promise<any[]> {
    const response = await api.get('/api/patients', {
      params: {
        status: 'waiting,scheduled,Admitted',
        unassigned: true
      }
    });
    return response.data.patients || [];
  }

  // Get patients assigned to specific staff member
  async getPatientsByStaff(staffId: string): Promise<any[]> {
    const response = await api.get('/api/patients', {
      params: {
        assignedDoctorId: staffId,
        assignedNurseId: staffId
      }
    });
    return response.data.data || [];
  }
}

export default new PatientAssignmentService();
