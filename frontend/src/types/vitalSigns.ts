export interface VitalSigns {
  _id?: string;
  id?: string;
  patientId: string;
  temperature?: number;
  heartRate?: number;
  respiratoryRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenSaturation?: number;
  bloodGlucose?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  pain?: number;
  notes?: string;
  measuredBy?: string;
  measuredByName?: string;
  measuredAt?: string | Date;
  createdAt?: string;
  updatedAt?: string;
}

export interface VitalSignsFormData {
  patientId: string;
  temperature?: number;
  heartRate?: number;
  respiratoryRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  oxygenSaturation?: number;
  bloodGlucose?: number;
  height?: number;
  weight?: number;
  pain?: number;
  notes?: string;
}

export interface VitalSignsFilters {
  patientId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
} 