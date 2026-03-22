import api from './api';
import { getToken } from '../utils/token';

export interface AttendanceStatus {
  status: 'present' | 'absent' | 'offline';
  lastActivity?: string;
  loginTime?: string;
  activeTime?: string;
  currentEthiopianTime?: string;
  workingHours?: boolean;
}

export interface AttendanceData {
  userId: string;
  userName: string;
  userRole: string;
  status: 'present' | 'absent' | 'offline';
  lastActivity?: string;
  loginTime?: string;
  activeTime?: string;
  department: string;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  offline: number;
  total: number;
  currentEthiopianTime?: string;
  workingHours?: boolean;
  totalPresent?: number;
  totalAbsent?: number;
  totalOvertime?: number;
  totalStaff?: number;
  averageWorkHours?: number;
  monthlyAttendanceData?: any[];
}

export interface AdminNotification {
  id: number;
  type: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  timestamp: Date;
  ethiopianTime: string;
  read: boolean;
}

class AttendanceService {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private activityTrackingInterval: NodeJS.Timeout | null = null;
  private lastActivityTime = Date.now();
  private isTracking = false;

  // Start automatic attendance tracking
  startActivityTracking() {
    if (this.isTracking) return;
    
    console.log('🔄 Starting automatic attendance tracking...');
    this.isTracking = true;

    // Immediately send a heartbeat so presence flips without needing a refresh
    this.sendActivityHeartbeat();
    // Then record login activity after a short delay; fall back to heartbeat if it fails
    setTimeout(() => {
      this.recordLoginActivity().catch(() => {
        // Fallback: ensure another heartbeat if login-activity isn't available yet
        this.sendActivityHeartbeat();
      });
    }, 1500);

    // Set up heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendActivityHeartbeat();
    }, 30000);

    // Track user activity (mouse movement, clicks, etc.)
    this.setupActivityTracking();

    // Set up beforeunload event to record logout
    window.addEventListener('beforeunload', () => {
      this.recordLogoutActivity();
    });

    // Set up visibility change event for tab switching
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // User switched tabs or minimized window
        this.lastActivityTime = Date.now();
      } else {
        // User returned to tab
        this.sendActivityHeartbeat();
      }
    });

    console.log('✅ Automatic attendance tracking started');
  }

  // Stop activity tracking
  stopActivityTracking() {
    if (!this.isTracking) return;

    console.log('🛑 Stopping automatic attendance tracking...');
    this.isTracking = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.activityTrackingInterval) {
      clearInterval(this.activityTrackingInterval);
      this.activityTrackingInterval = null;
    }

    // Record logout activity
    this.recordLogoutActivity();

    console.log('✅ Automatic attendance tracking stopped');
  }

  // Setup activity tracking for mouse and keyboard events
  private setupActivityTracking() {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const updateActivity = () => {
      this.lastActivityTime = Date.now();
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Check for inactivity every minute
    this.activityTrackingInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivityTime;
      
      // If no activity for 5 minutes, send a heartbeat to update status
      if (timeSinceLastActivity > 5 * 60 * 1000) {
        console.log('⚠️ No activity detected for 5 minutes, updating status...');
        this.sendActivityHeartbeat();
      }
    }, 60000);
  }

  // Record login activity
  private async recordLoginActivity() {
    try {
      const response = await api.post('/api/attendance/login-activity');
      console.log('✅ Login activity recorded:', response.data);
      return response.data;
    } catch (error) {
      // If endpoint is missing or times out, fallback silently
      const status = (error as any)?.response?.status;
      if (status === 404 || status === 405) {
        console.warn('Login-activity not available, using heartbeat fallback');
        await this.sendActivityHeartbeat();
        return null;
      }
      console.error('❌ Failed to record login activity:', error);
      return null;
    }
  }

  // Record logout activity
  async recordLogoutActivity() {
    try {
      console.log('🔄 Recording logout activity...');
      
      // Get auto clock-out setting from server
      let autoClockOut = false;
      try {
        const settingResponse = await api.get('/api/admin/auto-clockout-setting');
        if (settingResponse.data.success) {
          autoClockOut = settingResponse.data.autoClockOut;
        }
      } catch (error) {
        console.log('ℹ️ Could not fetch auto clock-out setting, defaulting to false');
        autoClockOut = false;
      }
      
      const response = await api.post('/api/attendance/logout-activity', {
        autoClockOut: autoClockOut // Use server setting, default to false
      });
      
      console.log('✅ Logout activity recorded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to record logout activity:', error);
      // Don't throw error to prevent blocking logout
    }
  }

  // Send activity heartbeat
  private async sendActivityHeartbeat() {
    try {
      // Ensure Authorization header is present even during very early startup
      const token = getToken();
      if (token) {
        api.defaults.headers.common['Authorization'] = token.startsWith('Bearer ')
          ? token
          : `Bearer ${token}`;
      }

      const response = await api.post('/api/attendance/heartbeat', {
        timestamp: Date.now(),
        lastActivity: this.lastActivityTime
      });
      
      if (response.data.success) {
        console.log('💓 Activity heartbeat sent');
      }
    } catch (error) {
      const status = (error as any)?.response?.status;
      if (status === 401) {
        // Attempt one-time token restoration and retry
        const token = getToken();
        if (token) {
          try {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const retry = await api.post('/api/attendance/heartbeat', {
              timestamp: Date.now(),
              lastActivity: this.lastActivityTime
            });
            if (retry.data.success) {
              console.log('💓 Activity heartbeat sent after token refresh');
              return;
            }
          } catch (retryErr) {
            console.error('❌ Heartbeat retry failed:', retryErr);
          }
        }
      }
      console.error('❌ Failed to send activity heartbeat:', error);
    }
  }

  // Get current user's attendance status
  async getMyAttendanceStatus(): Promise<AttendanceStatus | null> {
    try {
      console.log('🔍 AttendanceService: Getting my attendance status...');
      const response = await api.get('/api/attendance/my-status');
      console.log('🔍 AttendanceService: Attendance status response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ AttendanceService: Error fetching my attendance status:', error);
      return null;
    }
  }

  // Get automatic attendance data (admin only) - now uses real data
  async getAutomaticAttendance(): Promise<{ staff: AttendanceData[], summary: AttendanceSummary } | null> {
    try {
      // Use the real staff attendance data endpoint instead of mock data
      const response = await api.get('/api/staff/attendance-data');
      console.log('✅ Real attendance data fetched from staff endpoint');
      
      if (response.data && response.data.success) {
        return {
          staff: response.data.attendanceData || [],
          summary: response.data.summary || {}
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching real attendance data:', error);
      return null;
    }
  }

  // Get admin notifications
  async getAdminNotifications(): Promise<{ notifications: AdminNotification[], totalUnread: number } | null> {
    try {
      const response = await api.get('/api/attendance/admin-notifications');
      console.log('✅ Admin notifications fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching admin notifications:', error);
      return null;
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: number): Promise<boolean> {
    try {
      const response = await api.patch(`/api/attendance/admin-notifications/${notificationId}/read`);
      console.log('✅ Notification marked as read');
      return response.data.success;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      return false;
    }
  }

  // Manual override - mark user as present (admin only)
  async markUserAsPresent(userId: string, reason?: string): Promise<boolean> {
    try {
      const response = await api.post('/api/attendance/mark-present', { userId, reason });
      console.log('✅ User marked as present');
      return response.data.success;
    } catch (error) {
      console.error('❌ Error marking user as present:', error);
      return false;
    }
  }

  // Manual override - mark user as absent (admin only)
  async markUserAsAbsent(userId: string, reason?: string): Promise<boolean> {
    try {
      const response = await api.post('/api/attendance/mark-absent', { userId, reason });
      console.log('✅ User marked as absent');
      return response.data.success;
    } catch (error) {
      console.error('❌ Error marking user as absent:', error);
      return false;
    }
  }

  // Get attendance analytics (admin only)
  async getAttendanceAnalytics(startDate?: string, endDate?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(`/api/attendance/analytics?${params.toString()}`);
      console.log('✅ Attendance analytics fetched');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching attendance analytics:', error);
      return null;
    }
  }

  // Get monthly attendance data for all staff (admin only)
  async getMonthlyAttendance(year: number, month: number): Promise<{ staff: AttendanceData[], summary: AttendanceSummary } | null> {
    try {
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      const response = await api.get(`/api/attendance/monthly?year=${year}&month=${month + 1}&startDate=${startDate}&endDate=${endDate}`);
      console.log(`✅ Monthly attendance data fetched for ${year}-${month + 1}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching monthly attendance for ${year}-${month + 1}:`, error);
      return null;
    }
  }

  // Get current Ethiopian time
  getCurrentEthiopianTime(): string {
    const now = new Date();
    const ethiopianTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    return ethiopianTime.toLocaleString('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  // Check if current time is within working hours (2 AM to 11 PM Ethiopian time)
  isWorkingHours(): boolean {
    const now = new Date();
    const ethiopianTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    const hour = ethiopianTime.getUTCHours();
    return hour >= 2 && hour < 23;
  }

  // Format time in Ethiopian timezone
  formatEthiopianTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const ethiopianTime = new Date(dateObj.getTime() + (3 * 60 * 60 * 1000));
    return ethiopianTime.toLocaleString('en-US', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }
}

export const attendanceService = new AttendanceService();
export default attendanceService;
