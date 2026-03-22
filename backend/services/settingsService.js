const UserPreferences = require('../models/UserPreferences');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

class SettingsService {
  
  /**
   * Get user preferences
   * @param {string} userId - User ID
   * @returns {Object} User preferences
   */
  static async getUserPreferences(userId) {
    try {
      let preferences = await UserPreferences.findOne({ userId });
      
      // If no preferences exist, create default ones
      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }
      
      return preferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      throw new Error('Failed to retrieve user preferences');
    }
  }

  /**
   * Create default preferences for a user
   * @param {string} userId - User ID
   * @returns {Object} Created preferences
   */
  static async createDefaultPreferences(userId) {
    try {
      const defaultPreferences = new UserPreferences({
        userId,
        // All other fields will use schema defaults
      });
      
      return await defaultPreferences.save();
    } catch (error) {
      console.error('Error creating default preferences:', error);
      throw new Error('Failed to create default preferences');
    }
  }

  /**
   * Update user preferences
   * @param {string} userId - User ID
   * @param {Object} updates - Preference updates
   * @returns {Object} Updated preferences
   */
  static async updateUserPreferences(userId, updates) {
    try {
      // Validate the updates
      const allowedFields = [
        'appearance', 'notifications', 'dashboard', 'privacy', 
        'security', 'localization', 'advanced'
      ];
      
      const filteredUpdates = {};
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      const preferences = await UserPreferences.findOneAndUpdate(
        { userId },
        { 
          ...filteredUpdates,
          lastUpdated: new Date()
        },
        { 
          new: true, 
          upsert: true,
          runValidators: true 
        }
      );

      return preferences;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update user preferences');
    }
  }

  /**
   * Reset user preferences to defaults
   * @param {string} userId - User ID
   * @returns {Object} Reset preferences
   */
  static async resetUserPreferences(userId) {
    try {
      await UserPreferences.deleteOne({ userId });
      return await this.createDefaultPreferences(userId);
    } catch (error) {
      console.error('Error resetting user preferences:', error);
      throw new Error('Failed to reset user preferences');
    }
  }

  /**
   * Update user profile information
   * @param {string} userId - User ID
   * @param {Object} profileData - Profile data to update
   * @returns {Object} Updated user
   */
  static async updateUserProfile(userId, profileData) {
    try {
      const allowedFields = ['firstName', 'lastName', 'email', 'phone', 'specialization'];
      const filteredData = {};
      
      Object.keys(profileData).forEach(key => {
        if (allowedFields.includes(key) && profileData[key] !== undefined) {
          filteredData[key] = profileData[key];
        }
      });

      const user = await User.findByIdAndUpdate(
        userId,
        filteredData,
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {boolean} Success status
   */
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await User.findByIdAndUpdate(userId, { password: hashedNewPassword });

      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      throw new Error(error.message || 'Failed to change password');
    }
  }

  /**
   * Get user devices/sessions
   * @param {string} userId - User ID
   * @returns {Array} User devices
   */
  static async getUserDevices(userId) {
    try {
      // This is a simplified implementation
      // In a real application, you would track sessions in a separate collection
      return [
        {
          id: 'current',
          name: 'Current Device',
          browser: 'Chrome',
          os: 'Windows',
          location: 'Addis Ababa, Ethiopia',
          lastActive: new Date(),
          isCurrent: true
        }
      ];
    } catch (error) {
      console.error('Error getting user devices:', error);
      throw new Error('Failed to retrieve user devices');
    }
  }

  /**
   * Revoke user device/session
   * @param {string} userId - User ID
   * @param {string} deviceId - Device ID
   * @returns {boolean} Success status
   */
  static async revokeDevice(userId, deviceId) {
    try {
      // This is a simplified implementation
      // In a real application, you would remove the session from the database
      console.log(`Revoking device ${deviceId} for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error revoking device:', error);
      throw new Error('Failed to revoke device');
    }
  }

  /**
   * Export user data (GDPR compliance)
   * @param {string} userId - User ID
   * @returns {Object} User data export
   */
  static async exportUserData(userId) {
    try {
      const user = await User.findById(userId).select('-password');
      const preferences = await this.getUserPreferences(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      return {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        preferences: preferences,
        exportDate: new Date(),
        version: '1.0'
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Delete user account and all associated data
   * @param {string} userId - User ID
   * @returns {boolean} Success status
   */
  static async deleteUserAccount(userId) {
    try {
      // Delete user preferences
      await UserPreferences.deleteOne({ userId });
      
      // Soft delete user (mark as inactive instead of hard delete for audit purposes)
      await User.findByIdAndUpdate(userId, { 
        isActive: false, 
        deletedAt: new Date() 
      });

      return true;
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw new Error('Failed to delete user account');
    }
  }
}

module.exports = SettingsService;
