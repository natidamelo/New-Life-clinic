// ─── Patient Queue Mock Data ─────────────────────────────────────────────────
export type TriagePriority = "Normal" | "Urgent" | "Critical";
export type PatientStatus = "Waiting" | "In Consultation" | "Completed" | "No Show";
export type Department = "General" | "Pediatrics" | "OB/GYN" | "Dental" | "Ophthalmology" | "Laboratory" | "Radiology" | "Pharmacy";

export interface QueuePatient {
  token: string;
  name: string;
  patientId: string;
  age: number;
  gender: "M" | "F";
  department: Department;
  triage: TriagePriority;
  doctor: string;
  status: PatientStatus;
  checkInTime: string;
  waitMinutes: number;
  reason: string;
}

export const patientQueue: QueuePatient[] = [
  { token: "T-001", name: "Abebe Kebede", patientId: "NL-2024-0847", age: 45, gender: "M", department: "General", triage: "Normal", doctor: "Dr. Natan D.", status: "In Consultation", checkInTime: "08:15", waitMinutes: 12, reason: "Follow-up checkup" },
  { token: "T-002", name: "Tigist Haile", patientId: "NL-2024-1203", age: 32, gender: "F", department: "OB/GYN", triage: "Urgent", doctor: "Dr. Sara M.", status: "Waiting", checkInTime: "08:22", waitMinutes: 34, reason: "Prenatal bleeding" },
  { token: "T-003", name: "Dawit Mekonnen", patientId: "NL-2024-0562", age: 8, gender: "M", department: "Pediatrics", triage: "Normal", doctor: "Dr. Hana T.", status: "Waiting", checkInTime: "08:30", waitMinutes: 26, reason: "Fever & cough" },
  { token: "T-004", name: "Meron Assefa", patientId: "NL-2024-1087", age: 28, gender: "F", department: "Dental", triage: "Normal", doctor: "Dr. Yonas K.", status: "In Consultation", checkInTime: "08:05", waitMinutes: 8, reason: "Tooth extraction" },
  { token: "T-005", name: "Solomon Girma", patientId: "NL-2024-0391", age: 67, gender: "M", department: "General", triage: "Critical", doctor: "Dr. Natan D.", status: "Waiting", checkInTime: "08:45", waitMinutes: 41, reason: "Chest pain, SOB" },
  { token: "T-006", name: "Bethlehem Tadesse", patientId: "NL-2024-0724", age: 23, gender: "F", department: "Laboratory", triage: "Normal", doctor: "Lab Tech", status: "Waiting", checkInTime: "08:50", waitMinutes: 18, reason: "CBC & thyroid panel" },
  { token: "T-007", name: "Yared Bekele", patientId: "NL-2024-1456", age: 52, gender: "M", department: "Ophthalmology", triage: "Normal", doctor: "Dr. Liya A.", status: "Completed", checkInTime: "07:45", waitMinutes: 0, reason: "Vision screening" },
  { token: "T-008", name: "Hiwot Gebre", patientId: "NL-2024-0198", age: 38, gender: "F", department: "General", triage: "Urgent", doctor: "Dr. Natan D.", status: "Waiting", checkInTime: "09:00", waitMinutes: 15, reason: "Severe migraine" },
  { token: "T-009", name: "Eyasu Wolde", patientId: "NL-2024-0933", age: 41, gender: "M", department: "Radiology", triage: "Normal", doctor: "Dr. Kebede S.", status: "In Consultation", checkInTime: "08:35", waitMinutes: 5, reason: "Chest X-ray" },
  { token: "T-010", name: "Selamawit Desta", patientId: "NL-2024-1678", age: 55, gender: "F", department: "General", triage: "Normal", doctor: "Dr. Natan D.", status: "Completed", checkInTime: "07:30", waitMinutes: 0, reason: "Diabetes follow-up" },
  { token: "T-011", name: "Fikru Alemu", patientId: "NL-2024-0445", age: 19, gender: "M", department: "General", triage: "Normal", doctor: "Dr. Natan D.", status: "Waiting", checkInTime: "09:10", waitMinutes: 8, reason: "Sports injury" },
  { token: "T-012", name: "Rahel Tekle", patientId: "NL-2024-1122", age: 30, gender: "F", department: "OB/GYN", triage: "Normal", doctor: "Dr. Sara M.", status: "No Show", checkInTime: "08:00", waitMinutes: 0, reason: "Routine prenatal" },
];

// ─── KPI Metrics ─────────────────────────────────────────────────────────────
export interface KPIMetrics {
  todayPatients: number;
  totalCapacity: number;
  waitingCount: number;
  avgWaitMinutes: number;
  lowStockAlerts: number;
  dailyRevenue: number;
  revenueTarget: number;
  completedToday: number;
}

export const kpiMetrics: KPIMetrics = {
  todayPatients: 47,
  totalCapacity: 80,
  waitingCount: 6,
  avgWaitMinutes: 22,
  lowStockAlerts: 4,
  dailyRevenue: 34_850,
  revenueTarget: 50_000,
  completedToday: 31,
};

// ─── Pharmacy / Low-Stock Alerts ─────────────────────────────────────────────
export interface PharmacyAlert {
  id: string;
  name: string;
  category: "low-stock" | "expiring" | "out-of-stock";
  currentStock: number;
  minThreshold: number;
  unit: string;
  expiryDate?: string;
  daysUntilExpiry?: number;
}

export const pharmacyAlerts: PharmacyAlert[] = [
  { id: "PH-001", name: "Amoxicillin 500mg", category: "low-stock", currentStock: 23, minThreshold: 50, unit: "capsules" },
  { id: "PH-002", name: "Metformin 850mg", category: "expiring", currentStock: 120, minThreshold: 30, unit: "tablets", expiryDate: "2024-12-15", daysUntilExpiry: 12 },
  { id: "PH-003", name: "Ceftriaxone 1g IV", category: "low-stock", currentStock: 5, minThreshold: 20, unit: "vials" },
  { id: "PH-004", name: "Insulin Glargine", category: "out-of-stock", currentStock: 0, minThreshold: 10, unit: "pens" },
  { id: "PH-005", name: "Diclofenac 75mg", category: "expiring", currentStock: 85, minThreshold: 25, unit: "tablets", expiryDate: "2024-12-20", daysUntilExpiry: 17 },
  { id: "PH-006", name: "Normal Saline 0.9%", category: "low-stock", currentStock: 8, minThreshold: 30, unit: "bags" },
];

// ─── Pending Lab Results ─────────────────────────────────────────────────────
export interface PendingLabResult {
  id: string;
  patientName: string;
  patientId: string;
  testType: string;
  orderedBy: string;
  orderedAt: string;
  priority: "Routine" | "Urgent" | "STAT";
  status: "Processing" | "Awaiting Review" | "Delayed";
}

export const pendingLabResults: PendingLabResult[] = [
  { id: "LB-4521", patientName: "Solomon Girma", patientId: "NL-2024-0391", testType: "Troponin I & ECG", orderedBy: "Dr. Natan D.", orderedAt: "08:50", priority: "STAT", status: "Processing" },
  { id: "LB-4519", patientName: "Tigist Haile", patientId: "NL-2024-1203", testType: "CBC & Blood Type", orderedBy: "Dr. Sara M.", orderedAt: "08:35", priority: "Urgent", status: "Processing" },
  { id: "LB-4517", patientName: "Bethlehem Tadesse", patientId: "NL-2024-0724", testType: "Thyroid Panel (TSH, T3, T4)", orderedBy: "Dr. Natan D.", orderedAt: "09:05", priority: "Routine", status: "Awaiting Review" },
  { id: "LB-4514", patientName: "Hiwot Gebre", patientId: "NL-2024-0198", testType: "Liver Function Test", orderedBy: "Dr. Natan D.", orderedAt: "09:15", priority: "Routine", status: "Delayed" },
];

// ─── Hourly Patient Flow ─────────────────────────────────────────────────────
export interface HourlyFlow {
  hour: string;
  patients: number;
  label: string;
}

export const hourlyPatientFlow: HourlyFlow[] = [
  { hour: "07", patients: 3, label: "7 AM" },
  { hour: "08", patients: 12, label: "8 AM" },
  { hour: "09", patients: 15, label: "9 AM" },
  { hour: "10", patients: 11, label: "10 AM" },
  { hour: "11", patients: 8, label: "11 AM" },
  { hour: "12", patients: 4, label: "12 PM" },
  { hour: "13", patients: 6, label: "1 PM" },
  { hour: "14", patients: 9, label: "2 PM" },
  { hour: "15", patients: 7, label: "3 PM" },
  { hour: "16", patients: 5, label: "4 PM" },
  { hour: "17", patients: 2, label: "5 PM" },
];

// ─── Department Load ─────────────────────────────────────────────────────────
export interface DepartmentLoad {
  department: Department;
  current: number;
  capacity: number;
  waiting: number;
  avgWait: number;
}

export const departmentLoad: DepartmentLoad[] = [
  { department: "General", current: 14, capacity: 25, waiting: 4, avgWait: 25 },
  { department: "Pediatrics", current: 6, capacity: 12, waiting: 2, avgWait: 18 },
  { department: "OB/GYN", current: 5, capacity: 10, waiting: 1, avgWait: 30 },
  { department: "Dental", current: 4, capacity: 8, waiting: 1, avgWait: 15 },
  { department: "Ophthalmology", current: 3, capacity: 6, waiting: 0, avgWait: 10 },
  { department: "Laboratory", current: 8, capacity: 15, waiting: 3, avgWait: 20 },
  { department: "Radiology", current: 3, capacity: 8, waiting: 1, avgWait: 12 },
  { department: "Pharmacy", current: 5, capacity: 10, waiting: 2, avgWait: 8 },
];

// ─── Navigation Items ────────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  icon: string;
  href: string;
  badge?: number;
}

export const navItems: NavItem[] = [
  { label: "Overview", icon: "LayoutDashboard", href: "/" },
  { label: "Patient Queue", icon: "Users", href: "/queue", badge: 6 },
  { label: "Appointments", icon: "CalendarDays", href: "/appointments" },
  { label: "Pharmacy & Inventory", icon: "Pill", href: "/pharmacy", badge: 4 },
  { label: "Lab Orders", icon: "FlaskConical", href: "/lab" },
  { label: "Billing & Invoices", icon: "Receipt", href: "/billing" },
  { label: "Staff", icon: "UserCog", href: "/staff" },
];

// ─── Notification Items ──────────────────────────────────────────────────────
export interface Notification {
  id: string;
  type: "urgent" | "info" | "warning";
  message: string;
  time: string;
  read: boolean;
}

export const notifications: Notification[] = [
  { id: "N-1", type: "urgent", message: "STAT: Troponin results pending for Solomon Girma (chest pain)", time: "2 min ago", read: false },
  { id: "N-2", type: "urgent", message: "Insulin Glargine is out of stock — 3 patients affected today", time: "15 min ago", read: false },
  { id: "N-3", type: "warning", message: "Amoxicillin 500mg below minimum threshold (23/50)", time: "30 min ago", read: false },
  { id: "N-4", type: "info", message: "Dr. Sara M. has arrived — OB/GYN queue activated", time: "45 min ago", read: true },
  { id: "N-5", type: "info", message: "Daily backup completed successfully", time: "1 hr ago", read: true },
];
