export interface Patient {
  id: string;
  name: string;
  age: number;
  dateOfBirth?: string;
  gender: string;
  status: 'Admitted' | 'Discharged' | 'Outpatient' | 'Emergency' | 'scheduled' | 'waiting' | 'in-progress' | 'Active' | 'completed';
  contactNumber?: string;
  email?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  department?: string;
  priority?: 'normal' | 'urgent' | 'emergency';
  medicalHistory?: string;
  allergies?: string;
  notes?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  lastVisit?: string;
  roomNumber?: string;
  diagnosis?: string;
  prescription?: string;
  vitals?: {
    temperature?: string;
    bloodPressure?: string;
    heartRate?: string;
    respiratoryRate?: string;
    bloodSugar?: string;
    oxygenSaturation?: string;
    pain?: string;
    height?: string;
    weight?: string;
    bmi?: string;
    timestamp?: string;
  };
  medications?: {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    route: string;
    lastGiven?: string;
    nextDue?: string;
    prescribedBy: string;
  }[];
  treatments?: {
    id: string;
    type: string;
    description: string;
    frequency: string;
    lastPerformed?: string;
    nextDue?: string;
    notes?: string;
  }[];
  nextCheckup?: string;
  diabetic?: boolean;
  woundCare?: {
    location: string;
    type: string;
    lastDressing?: string;
    nextDressing?: string;
    notes?: string;
  }[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  recipientId: string;
  recipientRole: string;
  priority: 'low' | 'medium' | 'high';
  status: 'read' | 'unread';
  createdAt: string;
  metadata?: Record<string, any>;
}

// Export all types from their respective files
export * from './user';
export * from './patient';
export * from './prescription';
export * from './nurseTask';
export * from './vitalSigns';
export * from './medicalRecord';
export * from './labResult'; 