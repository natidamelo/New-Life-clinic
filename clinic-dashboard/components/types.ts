export type TriagePriority = 'Normal' | 'Urgent';

export type PatientQueueStatus = 'Waiting' | 'In Consultation' | 'Completed';

export interface PatientQueueItem {
  id: string;
  token: string;
  patientName: string;
  patientId: string;
  age: number;
  gender: 'M' | 'F';
  department: 'General OPD' | 'Pediatrics' | 'MCH / Antenatal' | 'Emergency Triage' | 'Ultrasound / Imaging';
  priority: TriagePriority;
  assignedDoctor: {
    name: string;
    specialization: string;
  };
  checkInTime: string;
  waitTime: string;
  status: PatientQueueStatus;
  chiefComplaint: string;
}

export interface CriticalAlertItem {
  id: string;
  type: 'panic_lab' | 'expiring_med' | 'triage_escalation';
  title: string;
  subtitle: string;
  timestamp: string;
  urgency: 'critical' | 'warning';
}

export interface PharmacyStockItem {
  id: string;
  name: string;
  dosage: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  status: 'Critical' | 'Low';
}

export interface HourlyFlowData {
  hour: string;
  patients: number;
  isPeak?: boolean;
}

export interface DepartmentLoadData {
  name: string;
  count: number;
  percentage: number;
}
