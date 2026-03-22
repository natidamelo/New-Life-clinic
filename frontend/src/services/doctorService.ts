import axios from 'axios';
import { API_BASE_URL } from '../config/index';
import api from './apiService'; // Assuming a configured axios instance
import { Doctor } from '../types/doctor';

export interface VitalSigns {
  patientId: string;
  timestamp: string;
  heartRate: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
}

export interface MedicationInteraction {
  medication1: string;
  medication2: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface PatientRisk {
  patientId: string;
  riskScore: number;
  factors: string[];
  recommendations: string[];
}

export interface DiagnosticSuggestion {
  symptoms: string[];
  possibleDiagnoses: {
    diagnosis: string;
    probability: number;
    supportingEvidence: string[];
  }[];
}

export interface TreatmentPathway {
  condition: string;
  steps: {
    step: number;
    action: string;
    evidence: string;
  }[];
}

export interface ClinicalAlert {
  patientId: string;
  type: 'lab' | 'vital' | 'medication';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: string;
}

export interface DashboardStats {
  patientsToday: number;
  pendingReports: number;
  completedAppointments: number;
  labResults: number;
}

export interface GetAllDoctorsResponse {
  doctors: Doctor[];
  // Add other pagination or metadata if the API returns it
  total?: number;
  page?: number;
  limit?: number;
}

const doctorService = {
  getPatientVitalSigns: async (patientId: string): Promise<VitalSigns[]> => {
    const response = await axios.get(`${API_BASE_URL}/patients/${patientId}/vitals`);
    return response.data;
  },

  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/doctor/dashboard-stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      
      // In case of API failure, calculate stats from local storage
      let patientsToday = 0;
      let completedAppointments = 0;
      let pendingReports = 0;
      let labResults = 0;
      
      try {
        // Get appointments from localStorage
        const appointments = localStorage.getItem('doctorAppointments');
        if (appointments) {
          const parsedAppointments = JSON.parse(appointments);
          if (Array.isArray(parsedAppointments)) {
            patientsToday = parsedAppointments.length;
            completedAppointments = parsedAppointments.filter(a => a.status === 'Completed').length;
            pendingReports = parsedAppointments.filter(a => a.status === 'In Progress').length;
          }
        }
        
        // Get lab results from localStorage if available
        const labData = localStorage.getItem('labResults');
        if (labData) {
          const parsedLabData = JSON.parse(labData);
          if (Array.isArray(parsedLabData)) {
            labResults = parsedLabData.length;
          }
        }
      } catch (localStorageError) {
        console.error('Error calculating stats from localStorage:', localStorageError);
      }
      
      // Return fallback data
      return {
        patientsToday,
        pendingReports,
        completedAppointments,
        labResults
      };
    }
  },

  checkMedicationInteractions: async (medications: string[]): Promise<MedicationInteraction[]> => {
    const response = await axios.post(`${API_BASE_URL}/medications/interactions`, { medications });
    return response.data;
  },

  getPatientRiskAssessment: async (patientId: string): Promise<PatientRisk> => {
    const response = await axios.get(`${API_BASE_URL}/patients/${patientId}/risk-assessment`);
    return response.data;
  },

  getDiagnosticSuggestions: async (symptoms: string[]): Promise<DiagnosticSuggestion> => {
    const response = await axios.post(`${API_BASE_URL}/diagnostics/suggest`, { symptoms });
    return response.data;
  },

  getTreatmentPathway: async (condition: string): Promise<TreatmentPathway> => {
    const response = await axios.get(`${API_BASE_URL}/treatment-pathways/${condition}`);
    return response.data;
  },

  getClinicalAlerts: async (patientId: string): Promise<ClinicalAlert[]> => {
    const response = await axios.get(`${API_BASE_URL}/patients/${patientId}/alerts`);
    return response.data;
  },

  getPerformanceMetrics: async (doctorId: string, dateRange: { start: string; end: string }) => {
    const response = await axios.get(`${API_BASE_URL}/doctors/${doctorId}/metrics`, {
      params: dateRange
    });
    return response.data;
  },

  getInsuranceEligibility: async (patientId: string, insuranceId: string) => {
    const response = await axios.get(`${API_BASE_URL}/insurance/eligibility`, {
      params: { patientId, insuranceId }
    });
    return response.data;
  },

  getPriorAuthorizations: async (patientId: string) => {
    const response = await axios.get(`${API_BASE_URL}/prior-authorizations/${patientId}`);
    return response.data;
  },

  sendSecureMessage: async (recipientId: string, message: string) => {
    const response = await axios.post(`${API_BASE_URL}/messages`, {
      recipientId,
      message
    });
    return response.data;
  },

  getPatientEducationMaterials: async (condition: string) => {
    const response = await axios.get(`${API_BASE_URL}/education-materials/${condition}`);
    return response.data;
  },

  getVaccinationSchedule: async (patientId: string) => {
    const response = await axios.get(`${API_BASE_URL}/patients/${patientId}/vaccinations`);
    return response.data;
  },

  checkAntibioticStewardship: async (patientId: string, antibioticId: string) => {
    const response = await axios.post(`${API_BASE_URL}/antibiotic-stewardship/check`, {
      patientId,
      antibioticId
    });
    return response.data;
  },

  getOpioidPrescriptionHistory: async (patientId: string) => {
    const response = await axios.get(`${API_BASE_URL}/patients/${patientId}/opioid-history`);
    return response.data;
  },

  calculatePregnancyDetails: async (lastMenstrualPeriod: string) => {
    const response = await axios.post(`${API_BASE_URL}/pregnancy-calculator`, {
      lastMenstrualPeriod
    });
    return response.data;
  },

  // Get all doctors
  async getAllDoctors(): Promise<GetAllDoctorsResponse | Doctor[]> { // Flexible return type for now
    try {
      const response = await api.get<GetAllDoctorsResponse | Doctor[]>('/api/doctors');
      // The actual structure might be response.data.doctors or just response.data if it's an array directly
      // For NewInvoicePage, it expects response.doctors or response directly if it's Doctor[]
      return response.data;
    } catch (error) {
      console.error('Error fetching doctors:', error);
      throw error;
    }
  },

  // Add other doctor-related service functions here if needed
  // e.g., getDoctorById, createDoctor, updateDoctor
};

export default doctorService; 