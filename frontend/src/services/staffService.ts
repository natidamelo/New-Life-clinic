import api from './api';

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department?: string;
  specialization?: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  avatar?: string;
  assignedPatients?: number;
  lastActive?: string;
  email?: string;
}

export interface DepartmentStats {
  name: string;
  staffCount: number;
  activeCount: number;
  busyCount: number;
  patientCount: number;
  pendingTasks: number;
}

export interface StaffOverview {
  roleStats: Record<string, {
    total: number;
    online: number;
    busy: number;
    away: number;
    offline: number;
  }>;
  departmentStats: DepartmentStats[];
  totalStaff: number;
  onlineStaff: number;
}

export interface TimesheetStatus {
  status: 'not_clocked_in' | 'clocked_in' | 'clocked_out';
  clockInTime: string | null;
  clockOutTime: string | null;
  timesheet: any;
}

export interface Timesheet {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  userEmail: string;
  date: string;
  clockIn: {
    time: string;
    location: string;
    method: string;
  };
  clockOut?: {
    time: string;
    location: string;
    method: string;
  };
  totalWorkHours: number;
  totalBreakHours: number;
  status: 'active' | 'completed' | 'pending';
  department: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface TimesheetResponse {
  timesheets: Timesheet[];
  pagination: TimesheetPagination;
}

export interface TimesheetAnalytics {
  summary: {
    totalTimesheets: number;
    completedTimesheets: number;
    activeTimesheets: number;
    totalWorkHours: number;
    totalBreakHours: number;
    averageWorkHoursPerDay: number;
  };
  departmentStats: Record<string, {
    totalTimesheets: number;
    totalWorkHours: number;
    totalBreakHours: number;
    activeTimesheets: number;
    completedTimesheets: number;
  }>;
  userStats: Array<{
    userName: string;
    userRole: string;
    totalTimesheets: number;
    totalWorkHours: number;
    totalBreakHours: number;
    activeTimesheets: number;
    completedTimesheets: number;
  }>;
  dailyStats: Array<{
    date: string;
    totalTimesheets: number;
    totalWorkHours: number;
    activeTimesheets: number;
    completedTimesheets: number;
  }>;
}

// Frontend cache for optimized performance
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class StaffService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 2 * 60 * 1000; // 2 minutes
  private readonly OVERVIEW_TTL = 5 * 60 * 1000; // 5 minutes for overview

  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}${params ? JSON.stringify(params) : ''}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Clear cache when data changes
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 StaffService cache cleared');
  }

  // Get staff overview with department stats - OPTIMIZED
  async getStaffOverview(): Promise<StaffOverview> {
    const cacheKey = this.getCacheKey('/api/staff/overview');
    
    // Check cache first
    const cached = this.getFromCache<StaffOverview>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await api.get('/api/staff/overview');
    const data = response.data?.data || {};
    
    // Cache with longer TTL for overview data
    this.setCache(cacheKey, data, this.OVERVIEW_TTL);
    
    return data;
  }

  // Get all staff members - OPTIMIZED
  async getStaffMembers(params?: {
    role?: string;
    department?: string;
    status?: string;
  }): Promise<StaffMember[]> {
    const cacheKey = this.getCacheKey('/api/staff/members', params);
    
    // Check cache first
    const cached = this.getFromCache<StaffMember[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await api.get('/api/staff/members', { params });
    const data = response.data?.data?.members || [];
    
    // Cache the result
    this.setCache(cacheKey, data);
    
    return data;
  }

  // Get staff members with patient assignment counts - OPTIMIZED
  async getStaffMembersWithAssignments(): Promise<StaffMember[]> {
    const cacheKey = this.getCacheKey('/api/staff/patient-assignments/available-staff');
    
    // Check cache first
    const cached = this.getFromCache<StaffMember[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await api.get('/api/staff/patient-assignments/available-staff');
    const data = response.data?.data || [];
    
    // Cache the result
    this.setCache(cacheKey, data);
    
    return data;
  }

  // Get staff member details
  async getStaffMemberDetails(userId: string) {
    const response = await api.get(`/api/staff/member/${userId}`);
    return response.data;
  }

  // Clock in
  async clockIn(location?: string, method?: string) {
    const response = await api.post('/api/staff/clock-in', {
      location: location || 'Main Office',
      method: method || 'system'
    });
    return response.data;
  }

  // Clock out
  async clockOut(location?: string, method?: string) {
    const response = await api.post('/api/staff/clock-out', {
      location: location || 'Main Office',
      method: method || 'system'
    });
    return response.data;
  }

  // Get comprehensive attendance data for admin view - OPTIMIZED
  async getAttendanceData(date?: string, department?: string) {
    // Include date in cache key so different dates are cached separately
    const cacheKey = this.getCacheKey('/api/qr/attendance/all/today', { date, department });
    
    // Check cache first (shorter TTL for attendance data)
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Use the QR attendance endpoint that has the actual attendance data
    console.log('🔍 [StaffService] Calling endpoint: /api/qr/attendance/all/today');
    const params: any = {};
    if (date) {
      params.date = date;
      console.log('🔍 [StaffService] Requesting data for date:', date);
    }
    const response = await api.get('/api/qr/attendance/all/today', { params });
    console.log('🔍 [StaffService] Response URL:', response.config?.url);
    console.log('🔍 [StaffService] Response status:', response.status);
    const data = response.data;
    
    console.log('🔍 [StaffService] QR Attendance data received:', data);
    console.log('🔍 [StaffService] Response structure:', {
      success: data.success,
      hasAttendanceData: !!data.attendanceData,
      attendanceDataLength: data.attendanceData?.length,
      hasSummary: !!data.summary,
      summaryKeys: data.summary ? Object.keys(data.summary) : [],
      allKeys: Object.keys(data),
      dataType: typeof data,
      isArray: Array.isArray(data)
    });
    
    // Log the actual data structure
    console.log('🔍 [StaffService] Full response data:', JSON.stringify(data, null, 2));
    
    // Check if this is an error response
    if (data.message && data.code) {
      console.error('❌ [StaffService] Received error response:', data);
      // Return empty data structure instead of throwing error to prevent UI crashes
      return {
        success: false,
        attendanceData: [],
        summary: {
          totalStaff: 0,
          present: 0,
          late: 0,
          absent: 0,
          overtimeCheckin: 0,
          overtimeComplete: 0,
          averageWorkHours: 0
        },
        error: data.message,
        code: data.code
      };
    }
    
    // Check if the response has the expected structure
    if (!data.attendanceData || !data.summary) {
      console.error('❌ [StaffService] Response missing required fields:', {
        hasAttendanceData: !!data.attendanceData,
        hasSummary: !!data.summary,
        actualKeys: Object.keys(data)
      });
      
      // Return empty data structure
      return {
        success: false,
        attendanceData: [],
        summary: {
          totalStaff: 0,
          present: 0,
          late: 0,
          absent: 0,
          overtimeCheckin: 0,
          overtimeComplete: 0,
          averageWorkHours: 0
        },
        error: 'Invalid response structure',
        code: 'INVALID_RESPONSE'
      };
    }
    
    // Cache with very short TTL (5 seconds) for real-time attendance data
    this.setCache(cacheKey, data, 5 * 1000);
    
    return data;
  }

  // Get monthly attendance data for calendar view
  async getMonthlyAttendanceData(year?: number, month?: number, department?: string) {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    if (department) params.department = department;

    console.log('🔍 [StaffService] Fetching monthly attendance data:', params);
    
    const response = await api.get('/api/staff/monthly-attendance', { params });
    console.log('🔍 [StaffService] Monthly attendance response:', response.data);
    
    return response.data;
  }

  // Get my current status with enhanced attendance info
  async getMyStatus() {
    const response = await api.get('/api/staff/my-status');
    return response.data;
  }

  // Format Ethiopian time
  formatEthiopianTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const ethiopianTime = new Date(dateObj.getTime() + (3 * 60 * 60 * 1000)); // UTC+3
    
    return ethiopianTime.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  // Format minutes to hours and minutes
  formatMinutesToHoursAndMinutes(minutes: number): string {
    if (minutes <= 0) return '0m';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours === 0) {
      return `${remainingMinutes}m`;
    } else if (remainingMinutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${remainingMinutes}m`;
    }
  }

  // Format overtime hours
  formatOvertimeHours(hours: number): string {
    if (hours <= 0) return '0h 0m';
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    // Handle edge case where minutes rounds to 60
    if (minutes >= 60) {
      return `${wholeHours + 1}h 0m`;
    }
    
    return `${wholeHours}h ${minutes}m`;
  }

  // Get attendance status color
  getAttendanceStatusColor(status: string): string {
    switch (status) {
      case 'present':
      case 'on-time':
        return 'text-primary bg-primary/10';
      case 'late':
        return 'text-accent-foreground bg-accent/10';
      case 'absent':
        return 'text-destructive bg-destructive/10';
      case 'early-clock-out':
        return 'text-accent-foreground bg-accent/10';
      case 'partial':
        return 'text-secondary-foreground bg-secondary/10';
      case 'overtime-checkin':
        return 'text-primary bg-primary/10';
      case 'overtime-complete':
        return 'text-indigo-600 bg-indigo-50';
      default:
        return 'text-muted-foreground bg-muted/10';
    }
  }

  // Get attendance status badge variant
  getAttendanceStatusBadge(status: string): string {
    switch (status) {
      case 'present':
      case 'on-time':
        return 'default';
      case 'late':
        return 'secondary';
      case 'absent':
        return 'destructive';
      case 'early-clock-out':
        return 'outline';
      case 'partial':
        return 'secondary';
      case 'overtime-checkin':
        return 'default';
      case 'overtime-complete':
        return 'default';
      default:
        return 'outline';
    }
  }

  // Get department statistics
  async getDepartmentStats(): Promise<DepartmentStats[]> {
    const response = await api.get('/api/staff/departments');
    return response.data;
  }

  // Get all timesheets with filtering and pagination
  async getTimesheets(params?: {
    startDate?: string;
    endDate?: string;
    department?: string;
    status?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<TimesheetResponse> {
    const response = await api.get('/api/staff/timesheets', { params });

    // Backend returns: { success, data: { timesheets, pagination } }
    // but some older builds may return just { timesheets, pagination }.
    const raw = (response.data && response.data.data) ? response.data.data : response.data || {};

    const timesheets: Timesheet[] = Array.isArray(raw.timesheets) ? raw.timesheets : [];
    const pagination: TimesheetPagination = raw.pagination || {
      currentPage: 1,
      totalPages: 1,
      totalItems: timesheets.length,
      itemsPerPage: timesheets.length,
    };

    return { timesheets, pagination };
  }

  // Get timesheet analytics
  async getTimesheetAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    department?: string;
  }): Promise<any> {
    try {
      const response = await api.get('/api/staff/timesheet-analytics', { params });

      // Normalize backend structure to the UI-friendly shape expected by the dashboard.
      // Backend currently returns: { success, data: analyticsObject }
      const analyticsEnvelope = response.data as any;
      const data = analyticsEnvelope?.data ?? analyticsEnvelope ?? {};

      const totalTimesheets: number = data?.summary?.totalTimesheets ?? 0;
      const completedTimesheets: number = data?.summary?.completedTimesheets ?? 0;
      const activeTimesheets: number = data?.summary?.activeTimesheets ?? 0;
      const totalWorkHours: number = data?.summary?.totalWorkHours ?? 0;
      const averageWorkHoursPerDay: number = data?.summary?.averageWorkHoursPerDay ?? 0;

      // Simple attendance rate approximation: completed out of total (fallback)
      const attendanceRate = totalTimesheets > 0
        ? Math.min(100, Math.max(0, (completedTimesheets / totalTimesheets) * 100))
        : 0;

      // Convert departmentStats object map into array with name, staffCount, avgHours
      const departmentStatsRaw = data?.departmentStats ?? {};
      const departmentStats = Object.entries(departmentStatsRaw).map(([name, stats]: any) => {
        const deptTotalTs = stats?.totalTimesheets ?? 0;
        const deptTotalHours = stats?.totalWorkHours ?? 0;
        return {
          name,
          staffCount: deptTotalTs, // fallback proxy when unique staff count is unavailable
          avgHours: deptTotalTs > 0 ? deptTotalHours / deptTotalTs : 0
        };
      });

      return {
        totalHours: totalWorkHours,
        averageHours: averageWorkHoursPerDay,
        overtimeHours: 0, // not provided by API yet
        attendanceRate,
        lateArrivals: 0,
        earlyDepartures: 0,
        perfectAttendance: 0,
        departmentStats
      };
    } catch (error) {
      console.error('Error fetching timesheet analytics:', error);
      // Return default values if API fails
      return {
        totalHours: 0,
        averageHours: 0,
        overtimeHours: 0,
        attendanceRate: 0,
        lateArrivals: 0,
        earlyDepartures: 0,
        perfectAttendance: 0,
        departmentStats: []
      };
    }
  }

  // Export timesheets to CSV
  async exportTimesheets(params?: {
    startDate?: string;
    endDate?: string;
    department?: string;
    status?: string;
  }): Promise<Blob> {
    // If a backend CSV export endpoint is unavailable, the UI will perform client-side CSV generation.
    // Keep this method for potential future server-side export support.
    const response = await api.get('/api/staff/export-timesheets', {
      params,
      responseType: 'blob'
    });
    return response.data;
  }
}

export default new StaffService(); 