import api from './apiService';

export interface RouteUsageEvent {
  path: string;
  label?: string;
  role?: string;
  userId?: string;
  action: 'click' | 'enter' | 'leave';
  durationMs?: number;
  timestamp?: string;
}

// Disable analytics after first 404 to avoid repeated noise when backend route is missing
let analyticsDisabled = false;
let analyticsChecked = false;

class AnalyticsService {
  async trackRouteUsage(event: RouteUsageEvent) {
    if (analyticsDisabled) return;
    // Probe endpoint once to avoid spamming missing routes
    if (!analyticsChecked) {
      analyticsChecked = true;
      try {
        await api.get('/api/analytics/ping');
      } catch (probeError: any) {
        if (probeError?.response?.status === 404) {
          analyticsDisabled = true;
          return;
        }
      }
    }
    try {
      await api.post('/api/analytics/route-usage', event);
    } catch (error: any) {
      // Silently ignore analytics errors to avoid disrupting UX
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('[analytics] failed to send event', error);
      }
      // If backend does not have the endpoint, stop future attempts in this session
      const status = error?.response?.status;
      if (status === 404) {
        analyticsDisabled = true;
      }
    }
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;


