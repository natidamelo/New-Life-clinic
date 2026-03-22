/**
 * Patient Status Sync Routes
 * 
 * API endpoints for manually triggering patient status synchronization
 */

const express = require('express');
const router = express.Router();
const { auth, checkPermission } = require('../middleware/auth');
const patientStatusSyncService = require('../services/patientStatusSyncService');

/**
 * @route   POST /api/patient-status-sync/trigger
 * @desc    Manually trigger patient status sync
 * @access  Private (Admin only)
 */
router.post('/trigger', auth, checkPermission('managePatients'), async (req, res) => {
  try {
    console.log('[PatientStatusSync API] Manual sync triggered by user:', req.user.email);
    
    // Trigger the sync
    await patientStatusSyncService.triggerSync();
    
    res.json({
      success: true,
      message: 'Patient status sync completed successfully',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('[PatientStatusSync API] Error during manual sync:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync patient statuses',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/patient-status-sync/status
 * @desc    Get sync service status
 * @access  Private (Admin only)
 */
router.get('/status', auth, checkPermission('managePatients'), async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        isRunning: patientStatusSyncService.isRunning,
        syncInterval: patientStatusSyncService.syncInterval,
        nextSync: 'Based on interval'
      }
    });
  } catch (error) {
    console.error('[PatientStatusSync API] Error getting status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync service status',
      error: error.message
    });
  }
});

module.exports = router;

