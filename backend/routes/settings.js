const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const settingsController = require('../controllers/settingsController');

// Apply authentication middleware to all routes
router.use(auth);

/**
 * @route   GET /api/settings/summary
 * @desc    Get settings summary
 * @access  Private
 */
router.get('/summary', settingsController.getSettingsSummary);

/**
 * @route   GET /api/settings/preferences
 * @desc    Get user preferences
 * @access  Private
 */
router.get('/preferences', settingsController.getUserPreferences);

/**
 * @route   PUT /api/settings/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/preferences', settingsController.updateUserPreferences);

/**
 * @route   POST /api/settings/preferences/reset
 * @desc    Reset user preferences to defaults
 * @access  Private
 */
router.post('/preferences/reset', settingsController.resetUserPreferences);

/**
 * @route   PUT /api/settings/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', settingsController.updateUserProfile);

/**
 * @route   POST /api/settings/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', settingsController.changePassword);

/**
 * @route   GET /api/settings/devices
 * @desc    Get user devices/sessions
 * @access  Private
 */
router.get('/devices', settingsController.getUserDevices);

/**
 * @route   DELETE /api/settings/devices/:deviceId
 * @desc    Revoke user device/session
 * @access  Private
 */
router.delete('/devices/:deviceId', settingsController.revokeDevice);

/**
 * @route   GET /api/settings/export-data
 * @desc    Export user data (GDPR compliance)
 * @access  Private
 */
router.get('/export-data', settingsController.exportUserData);

/**
 * @route   DELETE /api/settings/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', settingsController.deleteUserAccount);

module.exports = router;
