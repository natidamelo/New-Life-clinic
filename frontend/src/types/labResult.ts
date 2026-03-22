import { Patient } from './patient';
import { User } from './user';

export interface LabTestParameter {
  name: string;
  value: string | number;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  notes?: string;
}

export interface LabResult {
  _id: string;
  id?: string;
  patientId: string;
  patientRef?: Patient;
  doctorId: string;
  doctorRef?: User;
  labTechnicianId?: string;
  labTechnicianRef?: User;
  testName: string;
  testCategory?: string;
  parameters: LabTestParameter[];
  sampleCollectedAt?: string | Date;
  resultDate: string | Date;
  reportGeneratedAt?: string | Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  conclusion?: string;
  attachments?: string[];
  createdBy: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LabResultFormData {
  patientId: string;
  doctorId: string;
  labTechnicianId?: string;
  testName: string;
  testCategory?: string;
  parameters: LabTestParameter[];
  sampleCollectedAt?: string | Date;
  resultDate: string | Date;
  reportGeneratedAt?: string | Date;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  conclusion?: string;
  attachments?: string[];
}

export interface LabResultFilters {
  patientId?: string;
  doctorId?: string;
  labTechnicianId?: string;
  testName?: string;
  testCategory?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
} 