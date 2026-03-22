import { Patient } from './patient';
import { User } from './user';

export interface MedicalRecord {
  _id: string;
  id?: string;
  patientId: string;
  patientRef?: Patient;
  doctorId: string;
  doctorRef?: User;
  visitDate: string | Date;
  chiefComplaint: string;
  history?: string;
  diagnosis?: string;
  treatment?: string;
  prescriptions?: string[];
  labOrders?: string[];
  followUpDate?: string | Date;
  notes?: string;
  status: 'draft' | 'final' | 'amended';
  createdBy: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicalRecordFormData {
  patientId: string;
  doctorId: string;
  visitDate: string | Date;
  chiefComplaint: string;
  history?: string;
  diagnosis?: string;
  treatment?: string;
  prescriptions?: string[];
  labOrders?: string[];
  followUpDate?: string | Date;
  notes?: string;
  status?: 'draft' | 'final' | 'amended';
}

export interface MedicalRecordFilters {
  patientId?: string;
  doctorId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  searchTerm?: string;
} 