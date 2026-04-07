// Global configuration for the application.
// Resolve API URL from both build-time and runtime env sources.
// Runtime sources are useful for static deployments where env is injected via script.
const normalizeBaseUrl = (url: string): string =>
  url.trim().replace(/\/+$/, '');

/** LAN / loopback API URLs work on a clinic network but break on public HTTPS hosts (Vercel, etc.). */
const isNonPublicApiHost = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    const parts = hostname.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  } catch {
    return false;
  }
};

const resolveApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const runtimeWindow = window as any;
    const fromWindowConfig =
      runtimeWindow.API_BASE_URL ||
      runtimeWindow?.envConfig?.API_BASE_URL ||
      runtimeWindow?._env_?.VITE_API_URL ||
      runtimeWindow?._env_?.VITE_API_BASE_URL ||
      runtimeWindow?._env_?.API_BASE_URL ||
      runtimeWindow?._env_?.REACT_APP_API_URL;

    if (fromWindowConfig && String(fromWindowConfig).trim()) {
      const candidate = normalizeBaseUrl(String(fromWindowConfig));
      if (import.meta.env.PROD && isNonPublicApiHost(candidate)) {
        console.warn(
          '[Config] Ignoring non-public API URL from env-config in production:',
          candidate
        );
      } else {
        return candidate;
      }
    }
  }

  const fromBuildEnv = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  );

  if (fromBuildEnv && String(fromBuildEnv).trim()) {
    return normalizeBaseUrl(String(fromBuildEnv));
  }

  // In local dev we intentionally use relative /api with Vite proxy.
  if (import.meta.env.DEV) {
    return '';
  }

  // In production, empty API URL causes requests to hit the frontend origin
  // and often return HTML (index/404), which surfaces as JSON parse errors.
  console.warn(
    '[Config] API base URL is empty or missing in production. Falling back to default Render backend URL.'
  );
  return 'https://new-life-clinic.onrender.com';
};

// Empty string means "use the Vite proxy" in local dev.
export const API_BASE_URL = resolveApiBaseUrl();
export const API_URL = API_BASE_URL;
export const WS_BASE_URL = API_BASE_URL
  ? API_BASE_URL.replace(/^http/, 'ws')
  : `ws://${window.location.hostname}:5002`;

// Default limits for API requests
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// Authentication settings
export const AUTH_TOKEN_KEY = 'auth_token';
export const USER_DATA_KEY = 'user_data';

// Feature flags
export const ENABLE_NOTIFICATIONS = true;
export const ENABLE_WEBSOCKETS = true;
export const ENABLE_CACHE = false; // Disable to avoid caching issues

// Application routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/app',
  DOCTOR: '/app/doctor',
  NURSE: '/app/nurse',
  ADMIN: '/app/admin',
  PROFILE: '/app/profile',
  PATIENTS: '/app/patients',
  NOT_FOUND: '/404'
};

export const IS_DEVELOPMENT = import.meta.env.DEV;

const config = {
  API_BASE_URL,
  WS_BASE_URL,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  AUTH_TOKEN_KEY,
  USER_DATA_KEY,
  ENABLE_NOTIFICATIONS,
  ENABLE_WEBSOCKETS,
  ENABLE_CACHE,
  ROUTES,
  IS_DEVELOPMENT
};

export default config;

export const AppConfig = config;

export const VITAL_SIGNS_THRESHOLDS = {
  temperature: {
    low: 36.5,
    high: 37.5,
    criticalLow: 35.0,
    criticalHigh: 38.3
  },
  bloodPressure: {
    systolic: {
      low: 90,
      high: 120,
      criticalLow: 70,
      criticalHigh: 140
    },
    diastolic: {
      low: 60,
      high: 80,
      criticalLow: 40,
      criticalHigh: 90
    }
  },
  heartRate: {
    low: 60,
    high: 100,
    criticalLow: 40,
    criticalHigh: 120
  },
  respiratoryRate: {
    low: 12,
    high: 20,
    criticalLow: 8,
    criticalHigh: 30
  },
  oxygenSaturation: {
    low: 95,
    criticalLow: 90
  },
  bloodSugar: {
    low: 70,
    high: 140,
    criticalLow: 50,
    criticalHigh: 200
  }
};

export const MEDICATION_PRIORITIES = {
  normal: {
    color: 'text-primary',
    label: 'Normal'
  },
  urgent: {
    color: 'text-accent-foreground',
    label: 'Urgent'
  },
  stat: {
    color: 'text-destructive',
    label: 'STAT'
  }
};

export const NOTIFICATION_TYPES = {
  vital_signs: {
    icon: 'HeartIcon',
    color: 'text-primary'
  },
  medication: {
    icon: 'PillIcon',
    color: 'text-secondary-foreground'
  },
  alert: {
    icon: 'AlertTriangleIcon',
    color: 'text-destructive'
  },
  message: {
    icon: 'MessageIcon',
    color: 'text-muted-foreground'
  }
};