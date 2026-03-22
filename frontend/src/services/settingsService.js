import api from './api';

class SettingsService {
  
  /**
   * Get user preferences
   * @returns {Promise<Object>} User preferences
   */
  static async getUserPreferences() {
    try {
      const response = await api.get('/api/settings/preferences');
      return response.data;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   * @param {Object} preferences - Preferences to update
   * @returns {Promise<Object>} Updated preferences
   */
  static async updateUserPreferences(preferences) {
    try {
      const response = await api.put('/api/settings/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Reset user preferences to defaults
   * @returns {Promise<Object>} Reset preferences
   */
  static async resetUserPreferences() {
    try {
      const response = await api.post('/api/settings/preferences/reset');
      return response.data;
    } catch (error) {
      console.error('Error resetting user preferences:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated user profile
   */
  static async updateUserProfile(profileData) {
    try {
      const response = await api.put('/api/settings/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success response
   */
  static async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.post('/api/settings/change-password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Get user devices/sessions
   * @returns {Promise<Array>} User devices
   */
  static async getUserDevices() {
    try {
      const response = await api.get('/api/settings/devices');
      return response.data;
    } catch (error) {
      console.error('Error fetching user devices:', error);
      throw error;
    }
  }

  /**
   * Revoke user device/session
   * @param {string} deviceId - Device ID to revoke
   * @returns {Promise<Object>} Success response
   */
  static async revokeDevice(deviceId) {
    try {
      const response = await api.delete(`/api/settings/devices/${deviceId}`);
      return response.data;
    } catch (error) {
      console.error('Error revoking device:', error);
      throw error;
    }
  }

  /**
   * Export user data
   * @returns {Promise<Object>} User data export
   */
  static async exportUserData() {
    try {
      const response = await api.get('/api/settings/export-data');
      return response.data;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Delete user account
   * @returns {Promise<Object>} Success response
   */
  static async deleteUserAccount() {
    try {
      const response = await api.delete('/api/settings/account', {
        data: { confirmation: 'DELETE' }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }
  }

  /**
   * Get settings summary
   * @returns {Promise<Object>} Settings summary
   */
  static async getSettingsSummary() {
    try {
      const response = await api.get('/api/settings/summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching settings summary:', error);
      throw error;
    }
  }

  /**
   * Update specific preference section
   * @param {string} section - Section name (e.g., 'appearance', 'notifications')
   * @param {Object} sectionData - Section data to update
   * @returns {Promise<Object>} Updated preferences
   */
  static async updatePreferenceSection(section, sectionData) {
    try {
      const currentPreferences = await this.getUserPreferences();
      const updatedPreferences = {
        ...currentPreferences.data,
        [section]: {
          ...currentPreferences.data[section],
          ...sectionData
        }
      };
      
      return await this.updateUserPreferences(updatedPreferences);
    } catch (error) {
      console.error(`Error updating ${section} preferences:`, error);
      throw error;
    }
  }

  /**
   * Toggle a specific setting
   * @param {string} path - Dot notation path to the setting (e.g., 'notifications.email.enabled')
   * @param {boolean} value - New value for the setting
   * @returns {Promise<Object>} Updated preferences
   */
  static async toggleSetting(path, value) {
    try {
      const currentPreferences = await this.getUserPreferences();
      const updatedPreferences = { ...currentPreferences.data };
      
      // Navigate to the setting using dot notation
      const keys = path.split('.');
      let current = updatedPreferences;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      
      return await this.updateUserPreferences(updatedPreferences);
    } catch (error) {
      console.error(`Error toggling setting ${path}:`, error);
      throw error;
    }
  }
}

export default SettingsService;
