export interface Patient {
  _id: string;
  id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  dateOfBirth: string;
  gender: string;
  contactNumber?: string;
  email?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  bloodType?: string;
  allergies?: string[];
  medicalHistory?: string;
  assignedDoctor?: string;
  assignedNurse?: string;
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    expiryDate: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedPatients {
  data: Patient[];
  totalPages: number;
  currentPage: number;
  totalRecords: number;
} 