// Global configuration for the application
// Empty string means "use the Vite proxy" — this works on any network/IP
// because the proxy runs on the same origin as the frontend and forwards
// /api requests to localhost:5002 on the server machine.
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';
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