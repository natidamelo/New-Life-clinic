const GlobalSettings = require('../models/GlobalSettings');
const mongoose = require('mongoose');

/**
 * Check if MongoDB is connected
 */
const isDbConnected = () => {
  return mongoose.connection && mongoose.connection.readyState === 1;
};

class GlobalSettingsService {
  
  /**
   * Get current global settings
   * @returns {Object} Global settings
   */
  static async getCurrentSettings() {
    try {
      // Check database connection before querying
      if (!isDbConnected()) {
        throw new Error('Database not connected');
      }
      return await GlobalSettings.getCurrentSettings();
    } catch (error) {
      console.error('Error getting global settings:', error);
      // Re-throw with a more specific message if it's a DB connection error
      if (error.message === 'Database not connected' || 
          error.name === 'MongooseError' || 
          error.name === 'MongoNetworkError') {
        throw new Error('Database service unavailable');
      }
      throw new Error('Failed to retrieve global settings');
    }
  }

  /**
   * Update global settings
   * @param {Object} updates - Settings updates
   * @param {string} updatedBy - User ID who made the update
   * @returns {Object} Updated settings
   */
  static async updateSettings(updates, updatedBy) {
    try {
      return await GlobalSettings.updateSettings(updates, updatedBy);
    } catch (error) {
      console.error('Error updating global settings:', error);
      throw new Error('Failed to update global settings');
    }
  }

  /**
   * Apply settings to specific dashboard types
   * @param {Array} dashboardTypes - Array of dashboard types ['doctor', 'lab', 'imaging', 'reception', 'nurse']
   * @param {Object} settings - Settings to apply
   * @param {string} updatedBy - User ID who made the update
   * @returns {Object} Updated settings
   */
  static async applySettingsToDashboards(dashboardTypes, settings, updatedBy) {
    try {
      console.log('🔧 Applying settings to dashboards:', { dashboardTypes, settings });
      const currentSettings = await this.getCurrentSettings();
      const updates = { roleSettings: {} };

      // Apply settings to each dashboard type
      dashboardTypes.forEach(dashboardType => {
        updates.roleSettings[dashboardType] = {
          ...currentSettings.roleSettings?.[dashboardType],
          ...settings
        };
      });

      console.log('📝 Updates to apply:', JSON.stringify(updates, null, 2));
      const result = await this.updateSettings(updates, updatedBy);
      console.log('✅ Settings applied successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error applying settings to dashboards:', error);
      throw new Error('Failed to apply settings to dashboards');
    }
  }

  /**
   * Get settings for specific role
   * @param {string} role - User role ('doctor', 'lab', 'imaging', 'reception', 'nurse')
   * @returns {Object} Role-specific settings
   */
  static async getRoleSettings(role) {
    try {
      return await GlobalSettings.getRoleSettings(role);
    } catch (error) {
      console.error(`Error getting ${role} role settings:`, error);
      throw new Error(`Failed to retrieve ${role} role settings`);
    }
  }

  /**
   * Update settings for specific role
   * @param {string} role - User role
   * @param {Object} updates - Settings updates
   * @param {string} updatedBy - User ID who made the update
   * @returns {Object} Updated settings
   */
  static async updateRoleSettings(role, updates, updatedBy) {
    try {
      return await GlobalSettings.updateRoleSettings(role, updates, updatedBy);
    } catch (error) {
      console.error(`Error updating ${role} role settings:`, error);
      throw new Error(`Failed to update ${role} role settings`);
    }
  }

  /**
   * Get settings for specific dashboard type (deprecated - use getRoleSettings instead)
   * @param {string} dashboardType - Dashboard type ('doctor', 'lab', 'imaging', 'reception', 'nurse')
   * @returns {Object} Dashboard-specific settings
   */
  static async getDashboardSettings(dashboardType) {
    try {
      // Map dashboard type to role
      const roleMapping = {
        'lab': 'lab',
        'imaging': 'imaging', 
        'reception': 'reception',
        'nurse': 'nurse'
      };
      
      const role = roleMapping[dashboardType];
      if (!role) {
        throw new Error(`Invalid dashboard type: ${dashboardType}`);
      }
      
      return await this.getRoleSettings(role);
    } catch (error) {
      console.error(`Error getting ${dashboardType} dashboard settings:`, error);
      throw new Error(`Failed to retrieve ${dashboardType} dashboard settings`);
    }
  }

  /**
   * Reset settings to defaults
   * @param {string} updatedBy - User ID who made the update
   * @returns {Object} Reset settings
   */
  static async resetToDefaults(updatedBy) {
    try {
      const defaultSettings = new GlobalSettings({
        updatedBy: updatedBy
      });
      
      // Remove existing settings
      await GlobalSettings.deleteMany({});
      
      return await defaultSettings.save();
    } catch (error) {
      console.error('Error resetting global settings:', error);
      throw new Error('Failed to reset global settings');
    }
  }

  /**
   * Get settings history/audit log
   * @param {number} limit - Number of records to return
   * @returns {Array} Settings history
   */
  static async getSettingsHistory(limit = 10) {
    try {
      return await GlobalSettings.find()
        .populate('updatedBy', 'firstName lastName email role')
        .sort({ lastUpdated: -1 })
        .limit(limit)
        .select('appearance notifications dashboard security system lastUpdated updatedBy version');
    } catch (error) {
      console.error('Error getting settings history:', error);
      throw new Error('Failed to retrieve settings history');
    }
  }

  /**
   * Export global settings
   * @returns {Object} Exported settings
   */
  static async exportSettings() {
    try {
      const settings = await this.getCurrentSettings();
      
      return {
        settings: {
          appearance: settings.appearance,
          notifications: settings.notifications,
          dashboard: settings.dashboard,
          security: settings.security,
          system: settings.system
        },
        metadata: {
          lastUpdated: settings.lastUpdated,
          version: settings.version,
          exportDate: new Date()
        }
      };
    } catch (error) {
      console.error('Error exporting global settings:', error);
      throw new Error('Failed to export global settings');
    }
  }

  /**
   * Import global settings
   * @param {Object} settingsData - Settings data to import
   * @param {string} updatedBy - User ID who made the import
   * @returns {Object} Imported settings
   */
  static async importSettings(settingsData, updatedBy) {
    try {
      const updates = {
        appearance: settingsData.appearance,
        notifications: settingsData.notifications,
        dashboard: settingsData.dashboard,
        security: settingsData.security,
        system: settingsData.system
      };

      return await this.updateSettings(updates, updatedBy);
    } catch (error) {
      console.error('Error importing global settings:', error);
      throw new Error('Failed to import global settings');
    }
  }
}

module.exports = GlobalSettingsService;
