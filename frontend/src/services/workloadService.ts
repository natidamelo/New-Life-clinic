import api from './apiService';

export interface WorkloadSummaryItem {
  path: string;
  role?: string;
  clicks: number;
  visits: number;
  totalDurationMs: number;
  avgDurationMs: number;
  lastSeen?: string;
}

export interface WorkloadTimeseriesItem {
  bucket: string; // ISO date string
  clicks: number;
  visits: number;
  totalDurationMs: number;
  avgDurationMs: number;
}

export interface WorkloadTopItemByPath {
  path: string;
  clicks: number;
  visits: number;
  totalDurationMs: number;
  avgDurationMs: number;
  lastSeen?: string;
}

export interface WorkloadTopItemByUser {
  userId: string;
  clicks: number;
  visits: number;
  totalDurationMs: number;
  avgDurationMs: number;
  lastSeen?: string;
}

class WorkloadService {
  async getSummary(params?: { startDate?: string; endDate?: string; role?: string }) {
    try {
      const res = await api.get<{ success: boolean; data: WorkloadSummaryItem[] }>(
        '/api/analytics/route-usage/summary',
        { params }
      );
      return res.data.data || [];
    } catch (error: any) {
      // Gracefully degrade if analytics summary endpoint is missing
      if (error?.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  async getTimeseries(params?: {
    startDate?: string;
    endDate?: string;
    role?: string;
    path?: string;
    interval?: 'day' | 'week' | 'month';
    limit?: number;
  }) {
    try {
      const res = await api.get<{ success: boolean; data: WorkloadTimeseriesItem[] }>(
        '/api/analytics/route-usage/timeseries',
        { params }
      );
      return res.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  async getTop(params?: {
    startDate?: string;
    endDate?: string;
    role?: string;
    by?: 'path' | 'user';
    limit?: number;
  }) {
    try {
      const res = await api.get<{
        success: boolean;
        data: (WorkloadTopItemByPath | WorkloadTopItemByUser)[];
      }>(
        '/api/analytics/route-usage/top',
        { params }
      );
      return res.data.data || [];
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }
}

const workloadService = new WorkloadService();
export default workloadService;


