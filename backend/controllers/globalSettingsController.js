const GlobalSettingsService = require('../services/globalSettingsService');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

/**
 * Helper function to check database connection
 */
const checkDbConnection = () => {
  return mongoose.connection && mongoose.connection.readyState === 1;
};

/**
 * @desc    Get current global settings
 * @route   GET /api/global-settings
 * @access  Private (Admin only)
 */
exports.getGlobalSettings = asyncHandler(async (req, res) => {
  try {
    // Check database connection before querying
    if (!checkDbConnection()) {
      console.warn('Database not connected, returning default global settings');
      return res.json({
        success: true,
        data: {
          theme: 'light',
          primaryColor: '#3b82f6',
          language: 'en',
          timezone: 'Africa/Addis_Ababa'
        }
      });
    }

    const settings = await GlobalSettingsService.getCurrentSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting global settings:', error);
    
    // If it's a database connection error, return default settings instead of 500
    if (error.name === 'MongoServerError' || error.name === 'MongooseError' || !checkDbConnection()) {
      console.warn('Database error, returning default global settings');
      return res.json({
        success: true,
        data: {
          theme: 'light',
          primaryColor: '#3b82f6',
          language: 'en',
          timezone: 'Africa/Addis_Ababa'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve global settings'
    });
  }
});

/**
 * @desc    Update global settings
 * @route   PUT /api/global-settings
 * @access  Private (Admin only)
 */
exports.updateGlobalSettings = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const updates = req.body;
    
    const settings = await GlobalSettingsService.updateSettings(updates, userId);
    
    res.json({
      success: true,
      message: 'Global settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error updating global settings:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update global settings'
    });
  }
});

/**
 * @desc    Apply settings to specific dashboards
 * @route   POST /api/global-settings/apply-to-dashboards
 * @access  Private (Admin only)
 */
exports.applySettingsToDashboards = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { dashboardTypes, settings } = req.body;
    
    console.log('🔧 [GlobalSettingsController] Applying settings to dashboards:', { dashboardTypes, settings, userId });
    
    // Validate dashboard types
    const validDashboardTypes = ['doctor', 'lab', 'imaging', 'reception', 'nurse'];
    const invalidTypes = dashboardTypes.filter(type => !validDashboardTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      console.log('❌ [GlobalSettingsController] Invalid dashboard types:', invalidTypes);
      return res.status(400).json({
        success: false,
        message: `Invalid dashboard types: ${invalidTypes.join(', ')}. Valid types are: ${validDashboardTypes.join(', ')}`
      });
    }
    
    const updatedSettings = await GlobalSettingsService.applySettingsToDashboards(
      dashboardTypes, 
      settings, 
      userId
    );
    
    console.log('✅ [GlobalSettingsController] Settings applied successfully:', updatedSettings);
    
    res.json({
      success: true,
      message: `Settings applied successfully to ${dashboardTypes.join(', ')} dashboards`,
      data: updatedSettings
    });
  } catch (error) {
    console.error('Error applying settings to dashboards:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to apply settings to dashboards'
    });
  }
});

/**
 * @desc    Get settings for specific role
 * @route   GET /api/global-settings/role/:role
 * @access  Private
 */
exports.getRoleSettings = asyncHandler(async (req, res) => {
  try {
    const { role } = req.params;
    const userRole = req.user.role;
    
    // Validate role and ensure user can only access their own role settings
    const validRoles = ['doctor', 'lab', 'imaging', 'reception', 'nurse'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
      });
    }
    
    // Ensure user can only access their own role settings (unless admin)
    if (userRole !== 'admin' && userRole !== role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own role settings.'
      });
    }
    
    const settings = await GlobalSettingsService.getRoleSettings(role);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error(`Error getting ${req.params.role} role settings:`, error);
    res.status(500).json({
      success: false,
      message: error.message || `Failed to retrieve ${req.params.role} role settings`
    });
  }
});

/**
 * @desc    Update settings for specific role
 * @route   PUT /api/global-settings/role/:role
 * @access  Private
 */
exports.updateRoleSettings = asyncHandler(async (req, res) => {
  try {
    const { role } = req.params;
    const userId = req.user._id || req.user.userId;
    const userRole = req.user.role;
    const updates = req.body;
    
    // Validate role and ensure user can only update their own role settings
    const validRoles = ['doctor', 'lab', 'imaging', 'reception', 'nurse'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
      });
    }
    
    // Ensure user can only update their own role settings (unless admin)
    if (userRole !== 'admin' && userRole !== role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own role settings.'
      });
    }
    
    const settings = await GlobalSettingsService.updateRoleSettings(role, updates, userId);
    
    res.json({
      success: true,
      message: `${role} role settings updated successfully`,
      data: settings
    });
  } catch (error) {
    console.error(`Error updating ${req.params.role} role settings:`, error);
    res.status(400).json({
      success: false,
      message: error.message || `Failed to update ${req.params.role} role settings`
    });
  }
});

/**
 * @desc    Get settings for specific dashboard (deprecated - use getRoleSettings instead)
 * @route   GET /api/global-settings/dashboard/:dashboardType
 * @access  Private
 */
exports.getDashboardSettings = asyncHandler(async (req, res) => {
  try {
    const { dashboardType } = req.params;
    
    // Validate dashboard type
    const validDashboardTypes = ['doctor', 'lab', 'imaging', 'reception', 'nurse'];
    if (!validDashboardTypes.includes(dashboardType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid dashboard type. Valid types are: ${validDashboardTypes.join(', ')}`
      });
    }
    
    const settings = await GlobalSettingsService.getDashboardSettings(dashboardType);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error(`Error getting ${req.params.dashboardType} dashboard settings:`, error);
    res.status(500).json({
      success: false,
      message: error.message || `Failed to retrieve ${req.params.dashboardType} dashboard settings`
    });
  }
});

/**
 * @desc    Reset global settings to defaults
 * @route   POST /api/global-settings/reset
 * @access  Private (Admin only)
 */
exports.resetGlobalSettings = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    
    const settings = await GlobalSettingsService.resetToDefaults(userId);
    
    res.json({
      success: true,
      message: 'Global settings reset to defaults successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error resetting global settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to reset global settings'
    });
  }
});

/**
 * @desc    Get settings history
 * @route   GET /api/global-settings/history
 * @access  Private (Admin only)
 */
exports.getSettingsHistory = asyncHandler(async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const history = await GlobalSettingsService.getSettingsHistory(limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting settings history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve settings history'
    });
  }
});

/**
 * @desc    Export global settings
 * @route   GET /api/global-settings/export
 * @access  Private (Admin only)
 */
exports.exportGlobalSettings = asyncHandler(async (req, res) => {
  try {
    const exportData = await GlobalSettingsService.exportSettings();
    
    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Error exporting global settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export global settings'
    });
  }
});

/**
 * @desc    Import global settings
 * @route   POST /api/global-settings/import
 * @access  Private (Admin only)
 */
exports.importGlobalSettings = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { settings } = req.body;
    
    const importedSettings = await GlobalSettingsService.importSettings(settings, userId);
    
    res.json({
      success: true,
      message: 'Global settings imported successfully',
      data: importedSettings
    });
  } catch (error) {
    console.error('Error importing global settings:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to import global settings'
    });
  }
});
