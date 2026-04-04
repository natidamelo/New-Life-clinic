import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

// Base API configuration
const API_BASE_URL = 'http://192.168.1.14:5002/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear storage and redirect to login
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    }
    return Promise.reject(error);
  }
);

// Device info helper
const getDeviceInfo = async () => {
  try {
    return {
      deviceId: await DeviceInfo.getUniqueId(),
      deviceName: await DeviceInfo.getDeviceName(),
      systemName: await DeviceInfo.getSystemName(),
      systemVersion: await DeviceInfo.getSystemVersion(),
      model: await DeviceInfo.getModel(),
      brand: await DeviceInfo.getBrand(),
      platform: Platform.OS,
      userAgent: await DeviceInfo.getUserAgent(),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    return {
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    };
  }
};

export const apiService = {
  // Authentication endpoints
  async login(username, password) {
    try {
      const response = await apiClient.post('/auth/login', {
        username,
        password,
      });
      return response.data;
    } catch (error) {
      console.error('Login API error:', error);
      throw error;
    }
  },

  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      console.error('Register API error:', error);
      throw error;
    }
  },

  async verifyToken(token) {
    try {
      const response = await apiClient.get('/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.success;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  },

  async updateProfile(userData, token) {
    try {
      const response = await apiClient.put('/auth/profile', userData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Update profile API error:', error);
      throw error;
    }
  },

  // QR Code endpoints
  async verifyQRCode(qrData, deviceInfo) {
    try {
      const deviceData = await getDeviceInfo();
      const response = await apiClient.post('/qr/verify', {
        qrData,
        deviceInfo: { ...deviceInfo, ...deviceData }
      });
      return response.data;
    } catch (error) {
      console.error('QR verification API error:', error);
      throw error;
    }
  },

  async registerDevice(userId, hash, deviceInfo) {
    try {
      const deviceData = await getDeviceInfo();
      const response = await apiClient.post('/qr/register-device', {
        userId,
        hash,
        deviceInfo: { ...deviceInfo, ...deviceData }
      });
      return response.data;
    } catch (error) {
      console.error('Device registration API error:', error);
      throw error;
    }
  },

  async verifyQRUrl(type, userId, hash, timestamp) {
    try {
      const response = await apiClient.post('/qr/verify-url', {
        type,
        userId,
        hash,
        timestamp
      });
      return response.data;
    } catch (error) {
      console.error('QR URL verification API error:', error);
      throw error;
    }
  },

  // Attendance endpoints
  async getCurrentAttendanceStatus() {
    try {
      const response = await apiClient.get('/qr/current-status');
      return response.data;
    } catch (error) {
      console.error('Get current status API error:', error);
      throw error;
    }
  },

  async checkIn(qrData, deviceInfo) {
    try {
      const deviceData = await getDeviceInfo();
      const response = await apiClient.post('/qr/verify', {
        qrData,
        deviceInfo: { ...deviceInfo, ...deviceData }
      });
      return response.data;
    } catch (error) {
      console.error('Check-in API error:', error);
      throw error;
    }
  },

  async checkOut(qrData, deviceInfo) {
    try {
      const deviceData = await getDeviceInfo();
      const response = await apiClient.post('/qr/verify', {
        qrData,
        deviceInfo: { ...deviceInfo, ...deviceData }
      });
      return response.data;
    } catch (error) {
      console.error('Check-out API error:', error);
      throw error;
    }
  },

  async getAttendanceHistory(startDate, endDate) {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await apiClient.get('/attendance/history', { params });
      return response.data;
    } catch (error) {
      console.error('Get attendance history API error:', error);
      throw error;
    }
  },

  async getTodayAttendance() {
    try {
      const response = await apiClient.get('/qr/attendance/all/today');
      return response.data;
    } catch (error) {
      console.error('Get today attendance API error:', error);
      throw error;
    }
  },

  // Staff management endpoints
  async getStaffList() {
    try {
      const response = await apiClient.get('/staff');
      return response.data;
    } catch (error) {
      console.error('Get staff list API error:', error);
      throw error;
    }
  },

  async getStaffRegistrationStatus(userId) {
    try {
      const response = await apiClient.get(`/qr/staff-registration-status/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get staff registration status API error:', error);
      throw error;
    }
  },

  async generateStaffQR(userId) {
    try {
      const response = await apiClient.get(`/qr/staff-registration/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Generate staff QR API error:', error);
      throw error;
    }
  },

  // Utility endpoints
  async ping() {
    try {
      const response = await apiClient.get('/ping');
      return response.data;
    } catch (error) {
      console.error('Ping API error:', error);
      throw error;
    }
  },

  async healthCheck() {
    try {
      const response = await apiClient.get('/health-check');
      return response.data;
    } catch (error) {
      console.error('Health check API error:', error);
      throw error;
    }
  },

  // Offline data sync
  async syncOfflineData(offlineData) {
    try {
      const response = await apiClient.post('/attendance/sync-offline', offlineData);
      return response.data;
    } catch (error) {
      console.error('Sync offline data API error:', error);
      throw error;
    }
  },
};
