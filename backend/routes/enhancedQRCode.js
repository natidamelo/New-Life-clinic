const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const EnhancedQRCodeService = require('../services/enhancedQRCodeService');
const QRCodeAnalytics = require('../models/QRCodeAnalytics');
const OfflineQueue = require('../models/OfflineQueue');
const BiometricVerification = require('../models/BiometricVerification');

/**
 * Enhanced QR Code Routes with Advanced Features
 */

// Generate enhanced QR code
router.post('/generate-enhanced', auth, async (req, res) => {
  try {
    const { type = 'checkin', options = {} } = req.body;
    
    const result = await EnhancedQRCodeService.generateEnhancedQRCode(
      req.user._id, 
      type, 
      options
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error generating enhanced QR code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verify enhanced QR code
router.post('/verify-enhanced', async (req, res) => {
  try {
    const { hash, deviceInfo = {}, options = {} } = req.body;
    
    const result = await EnhancedQRCodeService.verifyEnhancedQRCode(
      hash, 
      deviceInfo, 
      options
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error verifying enhanced QR code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch check-in operation
router.post('/batch-checkin', auth, async (req, res) => {
  try {
    const { userIds, deviceInfo = {}, options = {} } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
    }

    const result = await EnhancedQRCodeService.processBatchCheckIn(
      userIds, 
      deviceInfo, 
      options
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in batch check-in:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Register biometric verification
router.post('/register-biometric', auth, async (req, res) => {
  try {
    const { biometricType, biometricHash, deviceId, securityLevel = 'medium' } = req.body;
    
    if (!biometricType || !biometricHash || !deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Biometric type, hash, and device ID are required'
      });
    }

    // Check if biometric already exists
    const existingBiometric = await BiometricVerification.findOne({
      userId: req.user._id,
      biometricType: biometricType,
      deviceId: deviceId
    });

    if (existingBiometric) {
      // Update existing biometric
      existingBiometric.biometricHash = biometricHash;
      existingBiometric.securityLevel = securityLevel;
      existingBiometric.isActive = true;
      existingBiometric.lastUsed = new Date();
      await existingBiometric.save();
    } else {
      // Create new biometric
      const biometric = new BiometricVerification({
        userId: req.user._id,
        biometricType: biometricType,
        biometricHash: biometricHash,
        deviceId: deviceId,
        securityLevel: securityLevel
      });
      await biometric.save();
    }

    res.json({
      success: true,
      message: 'Biometric verification registered successfully'
    });

  } catch (error) {
    console.error('Error registering biometric:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get analytics data
router.get('/analytics', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateRange = {};
    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    const analytics = await EnhancedQRCodeService.getAnalytics(
      req.user._id, 
      dateRange
    );

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get offline queue status
router.get('/offline-queue', auth, async (req, res) => {
  try {
    const queueItems = await OfflineQueue.find({
      userId: req.user._id,
      status: { $in: ['pending', 'retry'] }
    }).sort({ priority: 1, timestamp: 1 });

    res.json({
      success: true,
      data: {
        queueItems: queueItems,
        totalPending: queueItems.length
      }
    });

  } catch (error) {
    console.error('Error getting offline queue:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process offline queue
router.post('/process-offline-queue', auth, async (req, res) => {
  try {
    const { queueIds } = req.body;
    
    if (!queueIds || !Array.isArray(queueIds)) {
      return res.status(400).json({
        success: false,
        error: 'Queue IDs array is required'
      });
    }

    const results = [];
    
    for (const queueId of queueIds) {
      try {
        const queueItem = await OfflineQueue.findById(queueId);
        
        if (!queueItem || queueItem.userId.toString() !== req.user._id.toString()) {
          results.push({
            queueId: queueId,
            success: false,
            error: 'Queue item not found or access denied'
          });
          continue;
        }

        // Process the queued action
        let result;
        if (queueItem.action === 'checkin') {
          result = await EnhancedQRCodeService.processEnhancedCheckIn(
            queueItem.userId, 
            queueItem.deviceInfo, 
            queueItem.data.options
          );
        } else if (queueItem.action === 'checkout') {
          result = await EnhancedQRCodeService.processEnhancedCheckOut(
            queueItem.userId, 
            queueItem.deviceInfo, 
            queueItem.data.options
          );
        }

        if (result.success) {
          queueItem.status = 'completed';
          await queueItem.save();
        } else {
          queueItem.status = 'failed';
          queueItem.errorMessage = result.message;
          await queueItem.save();
        }

        results.push({
          queueId: queueId,
          success: result.success,
          message: result.message,
          data: result.data
        });

      } catch (error) {
        results.push({
          queueId: queueId,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      data: {
        results: results,
        totalProcessed: queueIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });

  } catch (error) {
    console.error('Error processing offline queue:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get enhanced current status
router.get('/enhanced-current-status', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's timesheets
    const timesheets = await require('../models/Timesheet').find({
      userId: req.user._id,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ createdAt: -1 });

    // Get analytics summary
    const analytics = await EnhancedQRCodeService.getAnalytics(req.user._id, {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      endDate: new Date()
    });

    // Get offline queue status
    const offlineQueue = await OfflineQueue.find({
      userId: req.user._id,
      status: { $in: ['pending', 'retry'] }
    });

    // Get biometric verification status
    const biometrics = await BiometricVerification.find({
      userId: req.user._id,
      isActive: true
    });

    // Determine current status
    let currentStatus = 'not_clocked_in';
    let canCheckIn = true;
    let canCheckOut = false;
    let message = 'Ready to check in';

    if (timesheets.length > 0) {
      const activeTimesheet = timesheets.find(ts => ts.status === 'active');
      const completedTimesheet = timesheets.find(ts => ts.status === 'completed');

      if (activeTimesheet) {
        currentStatus = activeTimesheet.isOvertime ? 'clocked_in_overtime' : 'clocked_in';
        canCheckIn = false;
        canCheckOut = true;
        message = activeTimesheet.isOvertime ? 'Currently clocked in for overtime' : 'Currently clocked in';
      } else if (completedTimesheet) {
        currentStatus = 'clocked_out';
        canCheckIn = true;
        canCheckOut = false;
        message = 'Already checked out today';
      }
    }

    res.json({
      success: true,
      data: {
        currentStatus: currentStatus,
        canCheckIn: canCheckIn,
        canCheckOut: canCheckOut,
        message: message,
        timesheets: timesheets,
        analytics: analytics.summary,
        offlineQueue: {
          totalPending: offlineQueue.length,
          items: offlineQueue
        },
        biometrics: biometrics.map(b => ({
          type: b.biometricType,
          securityLevel: b.securityLevel,
          lastUsed: b.lastUsed,
          usageCount: b.usageCount
        })),
        features: {
          offline: true,
          analytics: true,
          biometric: biometrics.length > 0,
          batch: true
        }
      }
    });

  } catch (error) {
    console.error('Error getting enhanced current status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get system statistics (admin only)
router.get('/system-stats', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get system-wide statistics
    const totalAnalytics = await QRCodeAnalytics.countDocuments();
    const todayAnalytics = await QRCodeAnalytics.countDocuments({
      timestamp: { $gte: today }
    });
    const yesterdayAnalytics = await QRCodeAnalytics.countDocuments({
      timestamp: { $gte: yesterday, $lt: today }
    });

    const totalOfflineQueue = await OfflineQueue.countDocuments({
      status: { $in: ['pending', 'retry'] }
    });

    const totalBiometrics = await BiometricVerification.countDocuments({
      isActive: true
    });

    // Get action breakdown
    const actionBreakdown = await QRCodeAnalytics.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get device breakdown
    const deviceBreakdown = await QRCodeAnalytics.aggregate([
      {
        $group: {
          _id: '$deviceInfo.platform',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalAnalytics: totalAnalytics,
        todayAnalytics: todayAnalytics,
        yesterdayAnalytics: yesterdayAnalytics,
        totalOfflineQueue: totalOfflineQueue,
        totalBiometrics: totalBiometrics,
        actionBreakdown: actionBreakdown,
        deviceBreakdown: deviceBreakdown
      }
    });

  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// @route   GET /api/qr/enhanced/staff-registration/:userId
// @desc    Generate enhanced QR code for staff registration
// @access  Private
router.get('/staff-registration/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🔍 [EnhancedQR] Generating staff registration QR for user ${userId}`);
    
    // Generate enhanced QR code for staff registration
    const result = await EnhancedQRCodeService.generateEnhancedQRCode(
      userId, 
      'staff-registration', 
      {
        primaryColor: '#1f2937',
        backgroundColor: '#ffffff',
        width: 300,
        includeAnalytics: true,
        includeBiometric: false,
        metadata: {
          location: 'Staff Registration',
          version: '2.0',
          features: ['enhanced', 'analytics', 'registration']
        }
      }
    );
    
    res.json({
      success: true,
      message: 'Enhanced staff registration QR code generated successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Error generating enhanced staff registration QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate enhanced staff registration QR code',
      error: error.message
    });
  }
});

module.exports = router;
