// frontend/src/types/prescription.ts

import { Patient } from './patient';
import { User } from './user';

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route?: string;
  notes?: string;
  // Legacy/compat fields used in various components
  medication?: string;
  medicationName?: string;
  instructions?: string;
  nurseInstructions?: string;
}

export interface Prescription {
  _id: string;
  // In some responses, patientId may be populated as an object
  patientId: string | null | {
    firstName?: string;
    lastName?: string;
    age?: number;
    gender?: string;
    address?: string;
    patientId?: string;
    id?: string;
    _id?: string;
  };
  doctorId: string;
  patientRef?: string | Patient;
  doctorRef?: string | User;
  medications: Medication[];
  instructions?: string;
  diagnosis?: string;
  status: 'pending' | 'dispensed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  dispensedBy?: string;
  dispensedAt?: string;
  // Additional fields for populated data
  patientDetails?: any; // Populated patient details
  // Legacy/compat fields
  patient?: {
    firstName?: string;
    lastName?: string;
    age?: number;
    gender?: string;
    address?: string;
    patientId?: string;
  } | null;
  patientName?: string;
  doctorDetails?: any; // Populated doctor details
}

export interface PrescriptionFormData {
  patientId: string;
  doctorId: string;
  medications: Medication[];
  instructions?: string;
  diagnosis?: string;
}

export interface PrescriptionFilters {
  status?: string;
  patientId?: string;
  doctorId?: string;
  startDate?: string;
  endDate?: string;
}

// Legacy interface removed to fix duplicate identifier error 