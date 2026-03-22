import api from './api';

export interface SystemSetting {
  key: string;
  value: any;
  description?: string;
  category?: string;
  updatedAt?: string;
}

export interface SystemSettingsResponse {
  success: boolean;
  count: number;
  data: SystemSetting[];
}

export interface SingleSettingResponse {
  success: boolean;
  data: SystemSetting;
}

export interface UpdateSettingRequest {
  value: any;
  description?: string;
  category?: string;
}

class SystemSettingsService {
  // Get all system settings
  async getAllSettings(): Promise<SystemSetting[]> {
    try {
      console.log('🔍 SystemSettingsService: Getting all settings...');
      const response = await api.get<SystemSettingsResponse>('/api/admin/settings');
      console.log('🔍 SystemSettingsService: All settings response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ SystemSettingsService: Failed to fetch system settings:', error);
      throw error;
    }
  }

  // Get a specific setting
  async getSetting(key: string): Promise<SystemSetting | null> {
    try {
      console.log(`🔍 SystemSettingsService: Getting setting ${key}...`);
      const response = await api.get<SingleSettingResponse>(`/api/admin/settings/${key}`);
      console.log(`🔍 SystemSettingsService: Setting ${key} response:`, response.data);
      return response.data.data;
    } catch (error) {
      console.error(`❌ SystemSettingsService: Failed to fetch setting ${key}:`, error);
      throw error;
    }
  }

  // Update a setting
  async updateSetting(key: string, data: UpdateSettingRequest): Promise<SystemSetting> {
    try {
      console.log(`🔍 SystemSettingsService: Updating setting ${key}...`, data);
      const response = await api.put<SingleSettingResponse>(`/api/admin/settings/${key}`, data);
      console.log(`🔍 SystemSettingsService: Update setting ${key} response:`, response.data);
      return response.data.data;
    } catch (error) {
      console.error(`❌ SystemSettingsService: Failed to update setting ${key}:`, error);
      throw error;
    }
  }

  // Get attendance overlay setting (public endpoint)
  async getAttendanceOverlaySetting(): Promise<{ isEnabled: boolean }> {
    try {
      console.log('🔍 SystemSettingsService: Getting attendance overlay setting...');
      const response = await api.get('/api/admin/settings/attendance/overlay');
      console.log('🔍 SystemSettingsService: Attendance overlay setting response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ SystemSettingsService: Failed to fetch attendance overlay setting:', error);
      console.log('🔍 SystemSettingsService: Defaulting to enabled (true)');
      // Default to enabled if we can't fetch the setting
      return { isEnabled: true };
    }
  }

  // Update attendance overlay setting
  async updateAttendanceOverlaySetting(isEnabled: boolean): Promise<SystemSetting> {
    console.log('🔍 SystemSettingsService: Updating attendance overlay setting to:', isEnabled);
    return this.updateSetting('attendance_overlay_enabled', {
      value: isEnabled,
      description: 'Controls whether staff must check in before accessing the system',
      category: 'attendance'
    });
  }
}

export default new SystemSettingsService();
