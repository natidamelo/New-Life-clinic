const express = require('express');
const router = express.Router();
const { auth, authorize } = require('../middleware/auth');
const globalSettingsController = require('../controllers/globalSettingsController');

// Test endpoint without authentication for debugging
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Global settings route is working',
    timestamp: new Date().toISOString()
  });
});

// Apply authentication middleware to all routes
router.use(auth);

/**
 * @route   GET /api/global-settings
 * @desc    Get current global settings
 * @access  Private (Admin only)
 */
router.get('/', globalSettingsController.getGlobalSettings);

/**
 * @route   PUT /api/global-settings
 * @desc    Update global settings
 * @access  Private (Admin only)
 */
router.put('/', authorize('admin'), globalSettingsController.updateGlobalSettings);

/**
 * @route   POST /api/global-settings/apply-to-dashboards
 * @desc    Apply settings to specific dashboards
 * @access  Private (Admin only)
 */
router.post('/apply-to-dashboards', authorize('admin'), globalSettingsController.applySettingsToDashboards);

/**
 * @route   GET /api/global-settings/role/:role
 * @desc    Get settings for specific role
 * @access  Private
 */
router.get('/role/:role', globalSettingsController.getRoleSettings);

/**
 * @route   PUT /api/global-settings/role/:role
 * @desc    Update settings for specific role
 * @access  Private
 */
router.put('/role/:role', globalSettingsController.updateRoleSettings);

/**
 * @route   GET /api/global-settings/dashboard/:dashboardType
 * @desc    Get settings for specific dashboard (deprecated - use /role/:role instead)
 * @access  Private
 */
router.get('/dashboard/:dashboardType', globalSettingsController.getDashboardSettings);

/**
 * @route   POST /api/global-settings/reset
 * @desc    Reset global settings to defaults
 * @access  Private (Admin only)
 */
router.post('/reset', authorize('admin'), globalSettingsController.resetGlobalSettings);

/**
 * @route   GET /api/global-settings/history
 * @desc    Get settings history
 * @access  Private (Admin only)
 */
router.get('/history', authorize('admin'), globalSettingsController.getSettingsHistory);

/**
 * @route   GET /api/global-settings/export
 * @desc    Export global settings
 * @access  Private (Admin only)
 */
router.get('/export', authorize('admin'), globalSettingsController.exportGlobalSettings);

/**
 * @route   POST /api/global-settings/import
 * @desc    Import global settings
 * @access  Private (Admin only)
 */
router.post('/import', authorize('admin'), globalSettingsController.importGlobalSettings);

module.exports = router;
