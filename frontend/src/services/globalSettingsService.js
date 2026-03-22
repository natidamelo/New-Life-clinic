import api from './apiService';

class GlobalSettingsService {
  
  /**
   * Get current global settings
   * @returns {Promise<Object>} Global settings
   */
  static async getGlobalSettings() {
    try {
      console.log('[GlobalSettingsService] Making request to /api/global-settings');
      const response = await api.get('/api/global-settings');
      console.log('[GlobalSettingsService] Response received:', response.status);
      
      // Handle different response formats
      if (response.data && response.data.data) {
        return response.data.data;
      } else if (response.data && response.data.settings) {
        return response.data.settings;
      } else {
        return response.data;
      }
    } catch (error) {
      console.error('[GlobalSettingsService] Error fetching global settings:', error);
      console.error('[GlobalSettingsService] Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      // If it's a 401 error, provide a more specific message
      if (error.response?.status === 401) {
        console.warn('[GlobalSettingsService] Authentication required - using default settings');
        // Return default settings instead of throwing error
        return {
          theme: 'light',
          primaryColor: '#3b82f6',
          language: 'en',
          timezone: 'Africa/Addis_Ababa'
        };
      }
      
      // For other errors, also return default settings instead of failing
      console.warn('[GlobalSettingsService] Using default settings due to error:', error.message);
      return {
        theme: 'light',
        primaryColor: '#3b82f6',
        language: 'en',
        timezone: 'Africa/Addis_Ababa'
      };
    }
  }

  /**
   * Update global settings
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  static async updateGlobalSettings(settings) {
    try {
      const response = await api.put('/api/global-settings', settings);
      return response.data.data;
    } catch (error) {
      console.error('Error updating global settings:', error);
      throw new Error(error.response?.data?.message || 'Failed to update global settings');
    }
  }

  /**
   * Apply settings to specific dashboards
   * @param {Array} dashboardTypes - Array of dashboard types ['lab', 'imaging', 'reception', 'nurse']
   * @param {Object} settings - Settings to apply
   * @returns {Promise<Object>} Updated settings
   */
  static async applySettingsToDashboards(dashboardTypes, settings) {
    try {
      const response = await api.post('/api/global-settings/apply-to-dashboards', {
        dashboardTypes,
        settings
      });
      return response.data.data;
    } catch (error) {
      console.error('Error applying settings to dashboards:', error);
      throw new Error(error.response?.data?.message || 'Failed to apply settings to dashboards');
    }
  }

  /**
   * Get settings for specific role
   * @param {string} role - User role ('doctor', 'lab', 'imaging', 'reception', 'nurse')
   * @returns {Promise<Object>} Role settings
   */
  static async getRoleSettings(role) {
    try {
      const response = await api.get(`/api/global-settings/role/${role}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching ${role} role settings:`, error);
      throw new Error(error.response?.data?.message || `Failed to fetch ${role} role settings`);
    }
  }

  /**
   * Update settings for specific role
   * @param {string} role - User role
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  static async updateRoleSettings(role, settings) {
    try {
      const response = await api.put(`/api/global-settings/role/${role}`, settings);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating ${role} role settings:`, error);
      throw new Error(error.response?.data?.message || `Failed to update ${role} role settings`);
    }
  }

  /**
   * Get settings for specific dashboard (deprecated - use getRoleSettings instead)
   * @param {string} dashboardType - Dashboard type ('lab', 'imaging', 'reception', 'nurse')
   * @returns {Promise<Object>} Dashboard settings
   */
  static async getDashboardSettings(dashboardType) {
    try {
      const response = await api.get(`/api/global-settings/dashboard/${dashboardType}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching ${dashboardType} dashboard settings:`, error);
      throw new Error(error.response?.data?.message || `Failed to fetch ${dashboardType} dashboard settings`);
    }
  }

  /**
   * Reset global settings to defaults
   * @returns {Promise<Object>} Reset settings
   */
  static async resetGlobalSettings() {
    try {
      const response = await api.post('/api/global-settings/reset');
      return response.data.data;
    } catch (error) {
      console.error('Error resetting global settings:', error);
      throw new Error(error.response?.data?.message || 'Failed to reset global settings');
    }
  }

  /**
   * Get settings history
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Settings history
   */
  static async getSettingsHistory(limit = 10) {
    try {
      const response = await api.get(`/api/global-settings/history?limit=${limit}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching settings history:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch settings history');
    }
  }

  /**
   * Export global settings
   * @returns {Promise<Object>} Exported settings
   */
  static async exportGlobalSettings() {
    try {
      const response = await api.get('/api/global-settings/export');
      return response.data.data;
    } catch (error) {
      console.error('Error exporting global settings:', error);
      throw new Error(error.response?.data?.message || 'Failed to export global settings');
    }
  }

  /**
   * Import global settings
   * @param {Object} settings - Settings to import
   * @returns {Promise<Object>} Imported settings
   */
  static async importGlobalSettings(settings) {
    try {
      const response = await api.post('/api/global-settings/import', { settings });
      return response.data.data;
    } catch (error) {
      console.error('Error importing global settings:', error);
      throw new Error(error.response?.data?.message || 'Failed to import global settings');
    }
  }

  /**
   * Apply appearance settings to all dashboards
   * @param {Object} appearanceSettings - Appearance settings to apply
   * @returns {Promise<Object>} Updated settings
   */
  static async applyAppearanceToAllDashboards(appearanceSettings) {
    console.log('[GlobalSettingsService] Applying appearance settings to all dashboards:', appearanceSettings);
    const dashboardTypes = ['doctor', 'lab', 'imaging', 'reception', 'nurse'];
    try {
      const result = await this.applySettingsToDashboards(dashboardTypes, {
        appearance: appearanceSettings
      });
      console.log('[GlobalSettingsService] Successfully applied appearance settings:', result);
      return result;
    } catch (error) {
      console.error('[GlobalSettingsService] Failed to apply appearance settings:', error);
      throw error;
    }
  }

  /**
   * Apply notification settings to all dashboards
   * @param {Object} notificationSettings - Notification settings to apply
   * @returns {Promise<Object>} Updated settings
   */
  static async applyNotificationsToAllDashboards(notificationSettings) {
    const dashboardTypes = ['lab', 'imaging', 'reception', 'nurse'];
    return this.applySettingsToDashboards(dashboardTypes, {
      notifications: notificationSettings
    });
  }

  /**
   * Apply dashboard-specific settings to all dashboards
   * @param {Object} dashboardSettings - Dashboard settings to apply
   * @returns {Promise<Object>} Updated settings
   */
  static async applyDashboardSettingsToAll(dashboardSettings) {
    const dashboardTypes = ['lab', 'imaging', 'reception', 'nurse'];
    return this.applySettingsToDashboards(dashboardTypes, {
      dashboard: dashboardSettings
    });
  }
}

export default GlobalSettingsService;
