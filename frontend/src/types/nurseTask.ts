export interface DoseRecord {
  day: number;
  timeSlot: string;
  administered: boolean;
  administeredAt?: Date | string;
  administeredBy?: string;
  notes?: string;
}

export interface MedicationDetails {
  medicationName: string;
  dosage: string;
  frequency: string;
  frequencyLabel?: string;
  route?: string;
  instructions?: string;
  duration?: number;
  startDate?: Date | string;
  doseRecords?: DoseRecord[];
}

export interface NurseTask {
  id?: string;
  _id?: string;
  patientId: string;
  patientName: string;
  taskType: 'MEDICATION' | 'VITAL_SIGNS' | 'PROCEDURE' | 'OTHER';
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedBy: string;
  assignedByName: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate: string | Date;
  completedDate?: string | Date;
  notes?: string;
  medicationDetails?: MedicationDetails;
  createdAt?: string;
  updatedAt?: string;
}

export interface NurseTaskFilters {
  nurseId?: string;
  status?: string;
  taskType?: string;
  patientId?: string;
  startDate?: string;
  endDate?: string;
} 