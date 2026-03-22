import { createContext, useContext } from 'react';
import apiService from './apiService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface DashboardStats {
  totalPatients: number;
  totalAppointments: number;
  totalStaff: number;
  pendingTasks: number;
  todayRevenue: number;
  totalRevenue: number;
  pendingLabTests: number;
  completedLabTests: number;
  criticalAlerts: number;
  activeNotifications: number;
}

// Universal cache for all dashboard data
class UniversalDashboardCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly STATS_TTL = 10 * 60 * 1000; // 10 minutes for stats
  private readonly REALTIME_TTL = 30 * 1000; // 30 seconds for real-time data

  getCacheKey(service: string, method: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${service}.${method}${paramStr}`;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  clear(): void {
    this.cache.clear();
  }

  // Role-specific cache clearing
  clearByRole(role: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(role) || key.includes('dashboard')) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Clear specific data types
  clearByType(dataType: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(dataType)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Singleton cache instance
const dashboardCache = new UniversalDashboardCache();

// Universal Dashboard Service
class UniversalDashboardService {
  private cache = dashboardCache;

  // Generic method to fetch and cache any dashboard data
  async fetchWithCache<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetchFn();
    this.cache.set(cacheKey, data, ttl);
    return data;
  }

  // Get cached stats without fetching fresh data
  async getCachedStats(role: string): Promise<DashboardStats | null> {
    const cacheKey = this.cache.getCacheKey('dashboard', 'universal-stats', { role });
    return this.cache.get<DashboardStats>(cacheKey);
  }

  // Get universal dashboard stats for any role
  async getUniversalStats(role: string): Promise<DashboardStats> {
    const cacheKey = this.cache.getCacheKey('dashboard', 'universal-stats', { role });
    
    return this.fetchWithCache(
      cacheKey,
      async () => {
        try {
          // Use the new universal stats endpoint
          const response = await apiService.get('/api/dashboard/universal-stats');
          const data = response.data;
          
          if (data.success && data.data) {
            return {
              totalPatients: data.data.totalPatients || 0,
              totalAppointments: data.data.totalAppointments || 0,
              totalStaff: data.data.totalStaff || 0,
              pendingTasks: data.data.pendingTasks || 0,
              todayRevenue: data.data.todayRevenue || 0,
              totalRevenue: data.data.totalRevenue || 0,
              pendingLabTests: data.data.pendingLabTests || 0,
              completedLabTests: data.data.completedLabTests || 0,
              criticalAlerts: data.data.criticalAlerts || 0,
              activeNotifications: data.data.activeNotifications || 0
            };
          } else {
            throw new Error('Invalid response format');
          }
        } catch (error) {
          console.error('Error fetching universal stats:', error);
          
          // Fallback to individual API calls if the universal endpoint fails
          const [
            patientsResponse,
            appointmentsResponse,
            staffResponse,
            tasksResponse,
            revenueResponse,
            labResponse,
            notificationsResponse
          ] = await Promise.allSettled([
            this.getPatientStats(role),
            this.getAppointmentStats(role),
            this.getStaffStats(role),
            this.getTaskStats(role),
            this.getRevenueStats(role),
            this.getLabStats(role),
            this.getNotificationStats(role)
          ]);

          return {
            totalPatients: this.extractValue(patientsResponse, 0),
            totalAppointments: this.extractValue(appointmentsResponse, 0),
            totalStaff: this.extractValue(staffResponse, 0),
            pendingTasks: this.extractValue(tasksResponse, 0),
            todayRevenue: this.extractValue(revenueResponse, { today: 0 }).today || 0,
            totalRevenue: this.extractValue(revenueResponse, { total: 0 }).total || 0,
            pendingLabTests: this.extractValue(labResponse, { pending: 0 }).pending || 0,
            completedLabTests: this.extractValue(labResponse, { completed: 0 }).completed || 0,
            criticalAlerts: this.extractValue(notificationsResponse, { critical: 0 }).critical || 0,
            activeNotifications: this.extractValue(notificationsResponse, { active: 0 }).active || 0
          };
        }
      },
      this.cache['STATS_TTL']
    );
  }

  // Helper to extract values from Promise.allSettled results
  private extractValue(result: PromiseSettledResult<any>, defaultValue: any): any {
    if (result.status === 'fulfilled') {
      return result.value?.data || result.value || defaultValue;
    } else {
      // Handle authentication errors gracefully
      const error = result.reason;
      if (error?.response?.status === 401) {
        console.log('[DashboardService] Authentication error, returning default value');
        return defaultValue;
      }
      console.error('[DashboardService] API call failed:', error);
      return defaultValue;
    }
  }

  // Helper to get auth headers

  // Role-specific data fetchers with fallbacks
  private async getPatientStats(role: string): Promise<number> {
    try {
      const response = await apiService.get('/api/patients/count');
      const data = response.data;
      return data.data?.total || data.count || 0;
    } catch {
      return 0;
    }
  }

  private async getAppointmentStats(role: string): Promise<number> {
    try {
      const response = await apiService.get('/api/appointments/count');
      const data = response.data;
      return data.data?.total || data.count || 0;
    } catch {
      return 0;
    }
  }

  private async getStaffStats(role: string): Promise<number> {
    try {
      const response = await apiService.get('/api/staff/count');
      const data = response.data;
      return data.data?.total || data.count || 0;
    } catch {
      return 0;
    }
  }

  private async getTaskStats(role: string): Promise<number> {
    try {
      const endpoint = role === 'nurse' ? '/api/nurse-tasks/pending' : '/api/tasks/pending';
      const response = await apiService.get(endpoint);
      const data = response.data;
      return data.data?.count || data.count || 0;
    } catch {
      return 0;
    }
  }

  private async getRevenueStats(role: string): Promise<{ today: number; total: number }> {
    try {
      if (!['admin', 'finance', 'billing', 'reception'].includes(role)) {
        return { today: 0, total: 0 };
      }
      const response = await apiService.get('/api/billing/revenue-stats');
      const data = response.data;
      return {
        today: data.data?.todayRevenue || data.todayRevenue || 0,
        total: data.data?.revenue || data.totalRevenue || 0
      };
    } catch {
      return { today: 0, total: 0 };
    }
  }

  private async getLabStats(role: string): Promise<{ pending: number; completed: number }> {
    try {
      if (!['admin', 'lab', 'doctor'].includes(role)) {
        return { pending: 0, completed: 0 };
      }
      const response = await apiService.get('/api/lab/stats');
      const data = response.data;
      return {
        pending: data.data?.tests || data.data?.pendingTests || data.pendingTests || 0,
        completed: data.data?.completedTests || data.completedTests || 0
      };
    } catch {
      return { pending: 0, completed: 0 };
    }
  }

  private async getNotificationStats(role: string): Promise<{ critical: number; active: number }> {
    try {
      const response = await apiService.get('/api/notifications/stats');
      const data = response.data;
      return {
        critical: data.data?.count || data.criticalAlerts || 0,
        active: data.data?.count || data.activeNotifications || 0
      };
    } catch {
      return { critical: 0, active: 0 };
    }
  }

  // Clear cache when data changes
  invalidateCache(dataType?: string): void {
    if (dataType) {
      this.cache.clearByType(dataType);
    } else {
      this.cache.clear();
    }
  }

  // Preload data for better perceived performance
  async preloadDashboardData(role: string): Promise<void> {
    // Start loading stats in background
    this.getUniversalStats(role).catch(() => {
      // Silent fail for preloading
    });
  }
}

// Export singleton instance
export const universalDashboardService = new UniversalDashboardService();

// React Context for dashboard service
export const DashboardServiceContext = createContext(universalDashboardService);

// Custom hook to use dashboard service
export const useDashboardService = () => {
  return useContext(DashboardServiceContext);
};

export type { DashboardStats };
export default universalDashboardService;
