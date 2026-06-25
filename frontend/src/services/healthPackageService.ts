import api from './api';

export interface HealthPackage {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  total_visits: number;
  validity_days: number;
  price: number;
  services: string[];
  is_active?: boolean;
}

export interface PatientPackage {
  _id?: string;
  id?: string;
  patient_id: string;
  package_id: HealthPackage | string;
  purchased_date: string;
  expiry_date: string;
  total_visits: number;
  visits_used: number;
  visits_remaining: number;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  payment_status: 'paid' | 'partial' | 'pending';
  amount_paid: number;
  balance_due: number;
}

export interface PackageVisit {
  _id?: string;
  id?: string;
  patient_package_id: string;
  patient_id: string;
  visit_date: string;
  visit_number: number;
  attended_by: any;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  blood_sugar_fasting?: number;
  blood_sugar_random?: number;
  weight_kg?: number;
  bmi?: number;
  diagnosis_notes?: string;
  medications_given: string[];
  lab_results: string[];
  next_visit_due_date?: string;
  next_visit_notes?: string;
  payment_collected: number;
  needs_consultation?: boolean;
  needs_vitals?: boolean;
  needs_lab?: boolean;
  lab_services_ordered?: string[];
}

export interface PackageUtilization {
  _id: string;
  name: string;
  totalAssigned: number;
  totalVisitsAllocated: number;
  totalVisitsConsumed: number;
  activeCount: number;
  completedCount: number;
  expiredCount: number;
  utilizationRate: number;
}

export interface VitalsTrendPoint {
  visit_number: string;
  date: string;
  systolic: number | null;
  diastolic: number | null;
  sugar_fasting: number | null;
  sugar_random: number | null;
  weight: number | null;
  bmi: number | null;
}

const healthPackageService = {
  // Catalog templates
  createPackage: async (packageData: Omit<HealthPackage, 'id' | '_id'>): Promise<HealthPackage> => {
    const response = await api.post<{ success: boolean; data: HealthPackage }>('/api/packages', packageData);
    return response.data.data;
  },

  getPackages: async (): Promise<HealthPackage[]> => {
    const response = await api.get<{ success: boolean; data: HealthPackage[] }>('/api/packages');
    return response.data.data;
  },

  updatePackage: async (id: string, packageData: Partial<HealthPackage>): Promise<HealthPackage> => {
    const response = await api.put<{ success: boolean; data: HealthPackage }>(`/api/packages/${id}`, packageData);
    return response.data.data;
  },

  // Subscriptions
  assignPackage: async (patientId: string, assignData: { package_id: string; start_date?: string; amount_paid: number }): Promise<PatientPackage> => {
    const response = await api.post<{ success: boolean; data: PatientPackage }>(`/api/patients/${patientId}/packages`, assignData);
    return response.data.data;
  },

  getPatientPackages: async (patientId: string): Promise<PatientPackage[]> => {
    const response = await api.get<{ success: boolean; data: PatientPackage[] }>(`/api/patients/${patientId}/packages`);
    return response.data.data;
  },

  getAllPatientPackages: async (): Promise<PatientPackage[]> => {
    const response = await api.get<{ success: boolean; data: PatientPackage[] }>('/api/patient-packages');
    return response.data.data;
  },

  getPatientPackageDetails: async (patientId: string, pkgId: string): Promise<{ package: PatientPackage; visits: PackageVisit[] }> => {
    const response = await api.get<{ success: boolean; data: { package: PatientPackage; visits: PackageVisit[] } }>(`/api/patients/${patientId}/packages/${pkgId}`);
    return response.data.data;
  },

  // Visits
  recordVisit: async (patientPackageId: string, visitData: Partial<PackageVisit> & { bypassSameDayWarning?: boolean; assignedNurseId?: string; assignedDoctorId?: string }): Promise<{ success: boolean; message: string; vitalsWarning?: string; data: PackageVisit }> => {
    const response = await api.post<{ success: boolean; message: string; vitalsWarning?: string; data: PackageVisit }>(`/api/patient-packages/${patientPackageId}/visits`, visitData);
    return response.data;
  },

  getVisits: async (patientPackageId: string): Promise<PackageVisit[]> => {
    const response = await api.get<{ success: boolean; data: PackageVisit[] }>(`/api/patient-packages/${patientPackageId}/visits`);
    return response.data.data;
  },

  updateVisit: async (patientPackageId: string, visitId: string, visitData: Partial<PackageVisit>): Promise<PackageVisit> => {
    const response = await api.put<{ success: boolean; data: PackageVisit }>(`/api/patient-packages/${patientPackageId}/visits/${visitId}`, visitData);
    return response.data.data;
  },

  // Reports
  getPackageUtilizationReport: async (): Promise<PackageUtilization[]> => {
    const response = await api.get<{ success: boolean; data: PackageUtilization[] }>('/api/reports/packages/utilization');
    return response.data.data;
  },

  getPatientVitalsTrendReport: async (patientId: string, patientPackageId?: string): Promise<VitalsTrendPoint[]> => {
    const params = patientPackageId ? { patient_package_id: patientPackageId } : {};
    const response = await api.get<{ success: boolean; data: VitalsTrendPoint[] }>(`/api/reports/patients/${patientId}/vitals`, { params });
    return response.data.data;
  }
};

export default healthPackageService;
