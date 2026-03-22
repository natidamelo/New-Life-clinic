import api from './api';

export interface Timesheet {
  _id: string;
  userId: string;
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
  breaks: Array<{
    startTime: string;
    endTime?: string;
    duration?: number;
    type: string;
  }>;
  totalWorkHours: number;
  totalBreakHours: number;
  status: 'active' | 'completed' | 'approved' | 'rejected';
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  department: string;
  shift: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetStats {
  overall: {
    totalTimesheets: number;
    totalWorkHours: number;
    totalBreakHours: number;
    avgWorkHours: number;
    avgBreakHours: number;
  };
  byStatus: Array<{
    _id: string;
    count: number;
  }>;
  byDepartment: Array<{
    _id: string;
    count: number;
    totalHours: number;
    avgHours: number;
  }>;
}

export interface TimesheetFilters {
  userId?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ClockInData {
  location?: string;
  method?: string;
  notes?: string;
}

export interface ClockOutData {
  location?: string;
  method?: string;
  notes?: string;
}

export interface BreakData {
  type?: string;
}

class TimesheetService {
  // Get all timesheets (admin only)
  async getTimesheets(filters: TimesheetFilters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/timesheets?${params.toString()}`);
    return response.data;
  }

  // Get timesheets for a specific user
  async getUserTimesheets(userId: string, filters: Omit<TimesheetFilters, 'userId'> = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/timesheets/user/${userId}?${params.toString()}`);
    return response.data;
  }

  // Get current user's timesheet for today
  async getTodayTimesheet(): Promise<Timesheet | null> {
    const response = await api.get('/timesheets/today');
    return response.data;
  }

  // Clock in
  async clockIn(data: ClockInData = {}) {
    const response = await api.post('/timesheets/clock-in', data);
    return response.data;
  }

  // Clock out
  async clockOut(data: ClockOutData = {}) {
    const response = await api.post('/timesheets/clock-out', data);
    return response.data;
  }

  // Start break
  async startBreak(data: BreakData = {}) {
    const response = await api.post('/timesheets/break/start', data);
    return response.data;
  }

  // End break
  async endBreak() {
    const response = await api.post('/timesheets/break/end');
    return response.data;
  }

  // Approve timesheet (admin only)
  async approveTimesheet(timesheetId: string, notes?: string) {
    const response = await api.patch(`/timesheets/${timesheetId}/approve`, { notes });
    return response.data;
  }

  // Reject timesheet (admin only)
  async rejectTimesheet(timesheetId: string, notes: string) {
    const response = await api.patch(`/timesheets/${timesheetId}/reject`, { notes });
    return response.data;
  }

  // Get timesheet statistics (admin only)
  async getStats(filters: Pick<TimesheetFilters, 'startDate' | 'endDate' | 'department'> = {}): Promise<TimesheetStats> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });

    const response = await api.get(`/timesheets/stats?${params.toString()}`);
    return response.data;
  }

  // Helper method to format time
  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  // Helper method to format date
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Helper method to calculate duration
  calculateDuration(startTime: string, endTime?: string): string {
    if (!endTime) return 'In Progress';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  }

  // Helper method to get status color
  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'bg-primary/20 text-primary';
      case 'completed': return 'bg-accent/20 text-accent-foreground';
      case 'approved': return 'bg-primary/20 text-primary';
      case 'rejected': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  }

  // Helper method to get break type color
  getBreakTypeColor(type: string): string {
    switch (type) {
      case 'lunch': return 'bg-accent/20 text-accent-foreground';
      case 'coffee': return 'bg-brown-100 text-brown-800';
      case 'personal': return 'bg-secondary/20 text-secondary-foreground';
      case 'other': return 'bg-muted/20 text-muted-foreground';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  }
}

export default new TimesheetService(); 