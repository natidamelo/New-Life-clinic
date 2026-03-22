// API configuration - always uses Vite proxy so the backend URL never
// needs to change when you switch networks or access from a different IP.
// The Vite dev-server proxy (vite.config.ts) forwards /api → localhost:5002.
function getApiUrl() {
  // Allow a hard override via VITE_API_URL env var (rarely needed)
  const envApiUrl = (window as any)._env_?.REACT_APP_API_URL || import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    console.log('✅ Using environment API URL:', envApiUrl);
    return envApiUrl;
  }

  // Always use the Vite proxy — works whether you open the app on
  // localhost, a LAN IP, or any other hostname, because the proxy
  // runs on the same origin as the frontend and forwards to localhost:5002.
  console.log('✅ Accessing via Vite proxy (network-independent)');
  return '';
}

export const API_BASE_URL = getApiUrl();

// Medical Records Configuration
export const MEDICAL_RECORDS_CONFIG = {
  ENDPOINTS: {
    BASE: '/api/medical-records',
    PATIENT: (patientId: string) => `/api/medical-records/patient/${patientId}`,
    TEST: '/api/medical-records/test',
    SAMPLE: '/api/medical-records/sample-record'
  },
  DEFAULT_PAGE_SIZE: 10,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  FALLBACK_ENABLED: true
};

// Storage keys (legacy - use AUTH_TOKEN_KEY, USER_DATA_KEY, REFRESH_TOKEN_KEY below)
export const JWT_TOKEN_KEY = 'jwt_token';

// Fallback URLs to try if main URL fails
export const API_FALLBACK_URLS = [
  // Current network IP (same as frontend)
  typeof window !== 'undefined' ? `http://${window.location.hostname}:5002` : 'http://localhost:5002',
  'http://localhost:5002',
  'http://127.0.0.1:5002',
  'http://192.168.1.9:5002', // Current frontend IP
  'http://10.252.95.124:5002',
  'http://192.168.1.4:5002',
  'http://192.168.1.2:5002',
  'http://192.168.108.157:5002',
  'http://192.168.165.90:5002',
  'http://192.168.92.157:5002',
];

// App configuration
export const APP_NAME = 'Clinic CMS';
export const APP_VERSION = '1.0.0';

// Date format configuration
export const DATE_FORMAT = 'YYYY-MM-DD';
export const TIME_FORMAT = 'HH:mm:ss';
export const DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

// Pagination configuration
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Toast configuration
export const TOAST_AUTO_CLOSE = 5000;
export const TOAST_POSITION = 'top-right';

// Define vital signs thresholds for medical monitoring
export const VITAL_SIGNS_THRESHOLDS = {
  temperature: {
    low: 35.0,
    normal: [36.1, 37.2],
    high: 38.0,
    critical: 39.5,
    unit: '°C',
  },
  heartRate: {
    low: 50,
    normal: [60, 100],
    high: 110,
    critical: 130,
    unit: 'bpm',
  },
  respiratoryRate: {
    low: 10,
    normal: [12, 20],
    high: 25,
    critical: 30,
    unit: 'breaths/min',
  },
  bloodPressureSystolic: {
    low: 90,
    normal: [100, 130],
    high: 140,
    critical: 180,
    unit: 'mmHg',
  },
  bloodPressureDiastolic: {
    low: 60,
    normal: [70, 85],
    high: 90,
    critical: 110,
    unit: 'mmHg',
  },
  oxygenSaturation: {
    low: 92,
    normal: [95, 100],
    critical: 90,
    unit: '%',
  },
  bloodGlucose: {
    fasting: {
      low: 3.9,
      normal: [4.0, 5.4],
      high: 5.5,
      critical: 7.0,
      unit: 'mmol/L',
    },
    postprandial: {
      normal: [4.0, 7.8],
      high: 7.9,
      critical: 11.1,
      unit: 'mmol/L',
    },
  },
};

// Development flag
export const IS_DEVELOPMENT = import.meta.env.DEV || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

// Authentication tokens (using consistent naming)
export const AUTH_TOKEN_KEY = 'clinic_auth_token';
export const USER_DATA_KEY = 'clinic_user_data';
export const REFRESH_TOKEN_KEY = 'clinic_refresh_token';

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    TEST_LOGIN: '/api/auth/test-login',
    REGISTER: '/api/auth/register',
    VERIFY: '/api/auth/verify',
    PROFILE: '/api/auth/profile',
  },
  MEDICAL_RECORDS: MEDICAL_RECORDS_CONFIG.ENDPOINTS,
  PATIENTS: {
    BASE: '/api/patients',
    VITALS: (id: string) => `/api/patients/${id}/vitals`,
    MEDICAL_HISTORY: (id: string) => `/api/patients/${id}/medical-history`,
    ALLERGIES: (id: string) => `/api/patients/${id}/allergies`,
  },
  APPOINTMENTS: {
    BASE: '/api/appointments',
  },
  PRESCRIPTIONS: {
    BASE: '/api/prescriptions',
    PATIENT: (id: string) => `/api/prescriptions?patientId=${id}`,
    DOCTOR: (id: string) => `/api/prescriptions?doctorId=${id}`,
  }
}; 