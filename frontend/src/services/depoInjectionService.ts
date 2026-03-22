/**
 * Depo Injection Service
 * 
 * Frontend service for managing Depo-Provera injection schedules
 */

import api from './api';

export interface DepoInjectionSchedule {
  _id: string;
  patient: {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    patientId: string;
  };
  patientName: string;
  patientId: string;
  firstInjectionDate: string;
  lastInjectionDate: string;
  nextInjectionDate: string;
  nextInjectionEthiopianDate: {
    year: number;
    month: number;
    day: number;
    monthName: string;
    formatted: string;
  };
  injectionInterval: number;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  injectionHistory: InjectionRecord[];
  reminderSettings: {
    enabled: boolean;
    daysBeforeReminder: number;
    reminderMethod: 'sms' | 'email' | 'both';
  };
  prescribingDoctor: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  prescribingDoctorName: string;
  notes?: string;
  instructions?: string;
  sideEffects: SideEffect[];
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  autoScheduleNext: boolean;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  updatedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
  daysUntilNextInjection: number;
  injectionStatus: {
    status: 'overdue' | 'due' | 'due_soon' | 'upcoming';
    message: string;
    daysUntil: number;
  };
  totalInjections: number;
}

export interface InjectionRecord {
  injectionDate: string;
  ethiopianDate: {
    year: number;
    month: number;
    day: number;
    monthName: string;
    formatted: string;
  };
  administeredBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  administeredByName?: string;
  notes?: string;
  appointmentId?: string;
  visitId?: string;
  inventoryTransactionId?: string;
}

export interface SideEffect {
  date: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  reportedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateScheduleData {
  patientId: string;
  firstInjectionDate: string;
  prescribingDoctorId: string;
  prescribingDoctorName: string;
  notes?: string;
  instructions?: string;
  injectionInterval?: number;
  reminderSettings?: {
    enabled?: boolean;
    daysBeforeReminder?: number;
    reminderMethod?: 'sms' | 'email' | 'both';
  };
}

export interface RecordInjectionData {
  injectionDate: string;
  notes?: string;
  appointmentId?: string;
  visitId?: string;
  inventoryTransactionId?: string;
}

export interface UpdateScheduleData {
  notes?: string;
  instructions?: string;
  injectionInterval?: number;
  reminderSettings?: {
    enabled?: boolean;
    daysBeforeReminder?: number;
    reminderMethod?: 'sms' | 'email' | 'both';
  };
  followUpRequired?: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  autoScheduleNext?: boolean;
}

export interface DashboardData {
  statistics: {
    total: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    onSchedule: number;
  };
  upcomingInjections: DepoInjectionSchedule[];
  overdueInjections: DepoInjectionSchedule[];
  dueToday: DepoInjectionSchedule[];
}

export interface SearchCriteria {
  patientName?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  doctorId?: string;
  page?: number;
  limit?: number;
}

class DepoInjectionService {
  /**
   * Create a new Depo injection schedule
   */
  async createSchedule(data: CreateScheduleData): Promise<DepoInjectionSchedule> {
    const response = await api.post('/depo-injections/schedules', data);
    return response.data.data;
  }

  /**
   * Record a Depo injection administration
   */
  async recordInjection(scheduleId: string, data: RecordInjectionData): Promise<DepoInjectionSchedule> {
    const response = await api.post(`/depo-injections/schedules/${scheduleId}/record`, data);
    return response.data.data;
  }

  /**
   * Get all schedules for a specific patient
   */
  async getPatientSchedules(patientId: string): Promise<DepoInjectionSchedule[]> {
    const response = await api.get(`/depo-injections/patient/${patientId}`);
    return response.data.data;
  }

  /**
   * Get upcoming injections
   */
  async getUpcomingInjections(days: number = 30): Promise<DepoInjectionSchedule[]> {
    const response = await api.get(`/depo-injections/upcoming?days=${days}`);
    return response.data.data;
  }

  /**
   * Get overdue injections
   */
  async getOverdueInjections(): Promise<DepoInjectionSchedule[]> {
    const response = await api.get('/depo-injections/overdue');
    return response.data.data;
  }

  /**
   * Get injection statistics
   */
  async getStatistics(): Promise<DashboardData['statistics']> {
    const response = await api.get('/depo-injections/statistics');
    return response.data.data;
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    const response = await api.get('/depo-injections/dashboard');
    return response.data.data;
  }

  /**
   * Search schedules
   */
  async searchSchedules(criteria: SearchCriteria): Promise<{
    schedules: DepoInjectionSchedule[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const response = await api.get('/depo-injections/search', { params: criteria });
    return response.data.data;
  }

  /**
   * Get injection history for a schedule
   */
  async getInjectionHistory(scheduleId: string): Promise<InjectionRecord[]> {
    const response = await api.get(`/depo-injections/schedules/${scheduleId}/history`);
    return response.data.data;
  }

  /**
   * Update a schedule
   */
  async updateSchedule(scheduleId: string, data: UpdateScheduleData): Promise<DepoInjectionSchedule> {
    const response = await api.put(`/depo-injections/schedules/${scheduleId}`, data);
    return response.data.data;
  }

  /**
   * Cancel a schedule
   */
  async cancelSchedule(scheduleId: string, reason: string): Promise<DepoInjectionSchedule> {
    const response = await api.put(`/depo-injections/schedules/${scheduleId}/cancel`, { reason });
    return response.data.data;
  }

  /**
   * Schedule next appointment
   */
  async scheduleNextAppointment(scheduleId: string): Promise<any> {
    const response = await api.post(`/depo-injections/schedules/${scheduleId}/schedule-appointment`);
    return response.data.data;
  }

  /**
   * Get a single schedule
   */
  async getSchedule(scheduleId: string): Promise<DepoInjectionSchedule> {
    const response = await api.get(`/depo-injections/schedules/${scheduleId}`);
    return response.data.data;
  }

  /**
   * Get all schedules with pagination
   */
  async getAllSchedules(page: number = 1, limit: number = 10, status?: string): Promise<{
    schedules: DepoInjectionSchedule[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params: any = { page, limit };
    if (status) params.status = status;
    
    const response = await api.get('/depo-injections/schedules', { params });
    return response.data.data;
  }

  /**
   * Format Ethiopian date for display
   */
  formatEthiopianDate(ethiopianDate: DepoInjectionSchedule['nextInjectionEthiopianDate']): string {
    return ethiopianDate.formatted;
  }

  /**
   * Get status color for injection status
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'overdue':
        return 'text-destructive bg-destructive/20';
      case 'due':
        return 'text-accent-foreground bg-accent/20';
      case 'due_soon':
        return 'text-accent-foreground bg-accent/20';
      case 'upcoming':
        return 'text-primary bg-primary/20';
      default:
        return 'text-muted-foreground bg-muted/20';
    }
  }

  /**
   * Get status icon for injection status
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'overdue':
        return '⚠️';
      case 'due':
        return '🔴';
      case 'due_soon':
        return '🟡';
      case 'upcoming':
        return '🟢';
      default:
        return 'ℹ️';
    }
  }
}

export default new DepoInjectionService();

