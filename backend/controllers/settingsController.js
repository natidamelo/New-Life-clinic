const SettingsService = require('../services/settingsService');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

/**
 * Helper function to check database connection
 */
const checkDbConnection = () => {
  return mongoose.connection && mongoose.connection.readyState === 1;
};

/**
 * @desc    Get user preferences
 * @route   GET /api/settings/preferences
 * @access  Private
 */
exports.getUserPreferences = asyncHandler(async (req, res) => {
  try {
    // Check database connection before querying
    if (!checkDbConnection()) {
      console.warn('Database not connected, returning default user preferences');
      return res.json({
        success: true,
        data: {
          appearance: {
            theme: 'light',
            primaryColor: '#3B82F6',
            colorTheme: 'default-light',
            fontSize: 'medium',
            compactMode: false
          },
          notifications: {
            enabled: true,
            email: { enabled: true },
            push: { enabled: true }
          },
          dashboard: {},
          privacy: {},
          security: {},
          localization: {
            language: 'en',
            timezone: 'Africa/Addis_Ababa'
          },
          advanced: {}
        }
      });
    }

    const userId = req.user._id || req.user.userId;
    const preferences = await SettingsService.getUserPreferences(userId);
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    console.error('Error getting user preferences:', error);
    
    // If it's a database connection error, return default preferences instead of 500
    if (error.name === 'MongoServerError' || error.name === 'MongooseError' || !checkDbConnection()) {
      console.warn('Database error, returning default user preferences');
      return res.json({
        success: true,
        data: {
          appearance: {
            theme: 'light',
            primaryColor: '#3B82F6',
            colorTheme: 'default-light',
            fontSize: 'medium',
            compactMode: false
          },
          notifications: {
            enabled: true,
            email: { enabled: true },
            push: { enabled: true }
          },
          dashboard: {},
          privacy: {},
          security: {},
          localization: {
            language: 'en',
            timezone: 'Africa/Addis_Ababa'
          },
          advanced: {}
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve user preferences'
    });
  }
});

/**
 * @desc    Update user preferences
 * @route   PUT /api/settings/preferences
 * @access  Private
 */
exports.updateUserPreferences = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const updates = req.body;
    
    const preferences = await SettingsService.updateUserPreferences(userId, updates);
    
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: preferences
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update user preferences'
    });
  }
});

/**
 * @desc    Reset user preferences to defaults
 * @route   POST /api/settings/preferences/reset
 * @access  Private
 */
exports.resetUserPreferences = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const preferences = await SettingsService.resetUserPreferences(userId);
    
    res.json({
      success: true,
      message: 'Preferences reset to defaults successfully',
      data: preferences
    });
  } catch (error) {
    console.error('Error resetting user preferences:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset user preferences'
    });
  }
});

/**
 * @desc    Update user profile
 * @route   PUT /api/settings/profile
 * @access  Private
 */
exports.updateUserProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const profileData = req.body;
    
    const user = await SettingsService.updateUserProfile(userId, profileData);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update user profile'
    });
  }
});

/**
 * @desc    Change user password
 * @route   POST /api/settings/change-password
 * @access  Private
 */
exports.changePassword = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { currentPassword, newPassword } = req.body;
    
    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }
    
    await SettingsService.changePassword(userId, currentPassword, newPassword);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to change password'
    });
  }
});

/**
 * @desc    Get user devices/sessions
 * @route   GET /api/settings/devices
 * @access  Private
 */
exports.getUserDevices = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const devices = await SettingsService.getUserDevices(userId);
    
    res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    console.error('Error getting user devices:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve user devices'
    });
  }
});

/**
 * @desc    Revoke user device/session
 * @route   DELETE /api/settings/devices/:deviceId
 * @access  Private
 */
exports.revokeDevice = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { deviceId } = req.params;
    
    await SettingsService.revokeDevice(userId, deviceId);
    
    res.json({
      success: true,
      message: 'Device revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking device:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to revoke device'
    });
  }
});

/**
 * @desc    Export user data
 * @route   GET /api/settings/export-data
 * @access  Private
 */
exports.exportUserData = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const userData = await SettingsService.exportUserData(userId);
    
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export user data'
    });
  }
});

/**
 * @desc    Delete user account
 * @route   DELETE /api/settings/account
 * @access  Private
 */
exports.deleteUserAccount = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { confirmation } = req.body;
    
    if (confirmation !== 'DELETE') {
      return res.status(400).json({
        success: false,
        message: 'Account deletion requires confirmation'
      });
    }
    
    await SettingsService.deleteUserAccount(userId);
    
    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user account:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user account'
    });
  }
});

/**
 * @desc    Get settings summary
 * @route   GET /api/settings/summary
 * @access  Private
 */
exports.getSettingsSummary = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const preferences = await SettingsService.getUserPreferences(userId);
    const devices = await SettingsService.getUserDevices(userId);
    
    res.json({
      success: true,
      data: {
        preferences: {
          theme: preferences.appearance?.theme || 'light',
          notifications: preferences.notifications?.enabled || true,
          twoFactorAuth: preferences.security?.twoFactorAuth?.enabled || false,
          language: preferences.localization?.language || 'en'
        },
        devices: devices,
        lastUpdated: preferences.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error getting settings summary:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve settings summary'
    });
  }
});
