const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const Notification = require('../models/Notification');

// @route   GET /api/notifications
// @desc    Get notifications with optional filtering
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { type, category, priority, unreadOnly = false, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    // Filter by notification type if provided
    if (type) {
      const types = type.split(',').map(t => t.trim());
      filter.type = { $in: types };
    }

    // Filter by category if provided
    if (category) {
      filter.category = category;
    }

    // Filter by priority if provided
    if (priority) {
      filter.priority = priority;
    }

    // Filter by read status if requested
    if (unreadOnly === 'true') {
      filter.read = false;
    }

    // Get current user info
    const currentUser = req.user;

    // Role-based filtering for non-admin users
    if (currentUser.role !== 'admin') {
      // For non-admin users, show only notifications intended for their role
      // or notifications sent directly to them
      filter.$or = [
        { recipientRole: currentUser.role },
        { recipientId: currentUser._id }
      ];
    }

    console.log(`🔍 [Notifications] Fetching with filter:`, filter);

    // Get notifications
    const notifications = await Notification.find(filter)
      .populate('senderId', 'firstName lastName')
      .populate('recipientId', 'firstName lastName')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalNotifications = await Notification.countDocuments(filter);

    console.log(`✅ [Notifications] Found ${notifications.length} notifications`);

    res.json({
      success: true,
      data: notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalNotifications / limit),
        totalNotifications,
        hasNextPage: page < Math.ceil(totalNotifications / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/notifications/:notificationId/read
// @desc    Mark notification as read
// @access  Private
router.put('/:notificationId/read', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user has permission to mark this notification as read
    const currentUser = req.user;
    if (currentUser.role !== 'admin' &&
        notification.recipientId?.toString() !== currentUser._id.toString() &&
        notification.recipientRole !== currentUser.role) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark this notification as read'
      });
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/notifications/send
// @desc    Send notification to staff members
// @access  Private
router.post('/send', auth, async (req, res) => {
  try {
    const { notificationType, data, userId } = req.body;

    if (!notificationType) {
      return res.status(400).json({
        success: false,
        message: 'Notification type is required'
      });
    }

    let result;
    if (userId) {
      // Send to specific user
      result = await notificationService.sendNotificationToUser(userId, notificationType, data);
    } else {
      // Send to all relevant staff
      result = await notificationService.sendNotification(notificationType, data);
    }

    res.json({
      success: result.success,
      message: result.message,
      data: result.results || []
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/notifications/vitals
// @desc    Send vitals update notification
// @access  Private
router.post('/vitals', auth, async (req, res) => {
  try {
    const { patientId, patientName, vitals } = req.body;

    if (!patientId || !patientName) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and name are required'
      });
    }

    const result = await notificationService.sendNotification(
      notificationService.notificationTypes.VITALS_UPDATE,
      {
        patientId,
        patientName,
        ...vitals
      }
    );

    res.json({
      success: result.success,
      message: result.message,
      data: result.results || []
    });
  } catch (error) {
    console.error('Error sending vitals notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/notifications/lab-order
// @desc    Send lab order notification
// @access  Private
router.post('/lab-order', auth, async (req, res) => {
  try {
    const { patientId, patientName, labTests } = req.body;

    if (!patientId || !patientName || !labTests) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, name, and lab tests are required'
      });
    }

    const result = await notificationService.sendNotification(
      notificationService.notificationTypes.LAB_ORDER,
      {
        patientId,
        patientName,
        labTests
      }
    );

    res.json({
      success: result.success,
      message: result.message,
      data: result.results || []
    });
  } catch (error) {
    console.error('Error sending lab order notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/notifications/imaging-request
// @desc    Send imaging request notification
// @access  Private
router.post('/imaging-request', auth, async (req, res) => {
  try {
    const { patientId, patientName, imagingTypes } = req.body;

    if (!patientId || !patientName || !imagingTypes) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, name, and imaging types are required'
      });
    }

    const result = await notificationService.sendNotification(
      notificationService.notificationTypes.IMAGING_REQUEST,
      {
        patientId,
        patientName,
        imagingTypes
      }
    );

    res.json({
      success: result.success,
      message: result.message,
      data: result.results || []
    });
  } catch (error) {
    console.error('Error sending imaging request notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/notifications/procedure
// @desc    Send procedure notification
// @access  Private
router.post('/procedure', auth, async (req, res) => {
  try {
    const { patientId, patientName, procedureName, procedureDate, procedureTime, notes } = req.body;

    if (!patientId || !patientName || !procedureName) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, name, and procedure name are required'
      });
    }

    const result = await notificationService.sendNotification(
      notificationService.notificationTypes.PROCEDURE,
      {
        patientId,
        patientName,
        procedureName,
        procedureDate,
        procedureTime,
        notes
      }
    );

    res.json({
      success: result.success,
      message: result.message,
      data: result.results || []
    });
  } catch (error) {
    console.error('Error sending procedure notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/notifications/medication-order
// @desc    Send medication order notification
// @access  Private
router.post('/medication-order', auth, async (req, res) => {
  try {
    const { patientId, patientName, medications } = req.body;

    if (!patientId || !patientName || !medications) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, name, and medications are required'
      });
    }

    const result = await notificationService.sendNotification(
      notificationService.notificationTypes.MEDICATION_ORDER,
      {
        patientId,
        patientName,
        medications
      }
    );

    res.json({
      success: result.success,
      message: result.message,
      data: result.results || []
    });
  } catch (error) {
    console.error('Error sending medication order notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/notifications/emergency
// @desc    Send emergency alert notification
// @access  Private
router.post('/emergency', auth, async (req, res) => {
  try {
    const { patientId, patientName, emergencyType, description } = req.body;

    if (!patientId || !patientName || !emergencyType) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID, name, and emergency type are required'
      });
    }

    const result = await notificationService.sendNotification(
      notificationService.notificationTypes.EMERGENCY_ALERT,
      {
        patientId,
        patientName,
        emergencyType,
        description
      }
    );

    res.json({
      success: result.success,
      message: result.message,
      data: result.results || []
    });
  } catch (error) {
    console.error('Error sending emergency notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/notifications/billing-update
// @desc    Send billing update notification
// @access  Private
router.post('/billing-update', auth, async (req, res) => {
  try {
    const { amount, type, patientName, invoiceNumber, action } = req.body;

    if (!amount || !type) {
      return res.status(400).json({
        success: false,
        message: 'Amount and type are required'
      });
    }

    const result = await notificationService.sendNotification(
      'billingUpdate',
      {
        amount,
        type,
        patientName,
        invoiceNumber,
        action
      }
    );

    res.json({
      success: result.success,
      message: result.message,
      data: result.results || []
    });
  } catch (error) {
    console.error('Error sending billing update notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/notifications/daily-revenue
// @desc    Send daily revenue summary notification
// @access  Private
router.post('/daily-revenue', auth, async (req, res) => {
  try {
    const { totalRevenue, totalCollected, outstandingAmount, invoiceCount, paymentCount, collectionRate } = req.body;

    if (totalRevenue === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Total revenue is required'
      });
    }

    const result = await notificationService.sendNotification(
      'dailyRevenue',
      {
        totalRevenue,
        totalCollected,
        outstandingAmount,
        invoiceCount,
        paymentCount,
        collectionRate
      }
    );

    res.json({
      success: result.success,
      message: result.message,
      data: result.results || []
    });
  } catch (error) {
    console.error('Error sending daily revenue notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/notifications/payment-alert
// @desc    Send payment alert notification
// @access  Private
router.post('/payment-alert', auth, async (req, res) => {
  try {
    const { amount, paymentMethod, patientName, invoiceNumber, status, action } = req.body;

    if (!amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Amount and payment method are required'
      });
    }

    const result = await notificationService.sendNotification(
      'paymentAlert',
      {
        amount,
        paymentMethod,
        patientName,
        invoiceNumber,
        status,
        action
      }
    );

    res.json({
      success: result.success,
      message: result.message,
      data: result.results || []
    });
  } catch (error) {
    console.error('Error sending payment alert notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/notifications/:userId/poll
// @desc    Poll for notifications for a specific user
// @access  Private
router.get('/:userId/poll', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { since, role } = req.query;
    
    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Import Notification model
    const Notification = require('../models/Notification');
    
    // Build query for notifications
    const query = {
      $or: [
        { recipientId: userId },
        { recipientRole: role || 'doctor' }
      ],
      isRead: false
    };
    
    // Add timestamp filter if provided
    if (since) {
      query.createdAt = { $gt: new Date(since) };
    }
    
    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('senderId', 'firstName lastName')
      .lean();
    
    res.json({
      success: true,
      data: notifications,
      count: notifications.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error polling notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/notifications/:userId
// @desc    Get all notifications for a specific user
// @access  Private
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;
    
    // Validate user ID
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Import Notification model
    const Notification = require('../models/Notification');
    
    // Build query
    const query = {
      $or: [
        { recipientId: userId },
        { recipientRole: req.user.role }
      ]
    };
    
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    // Get notifications with pagination
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('senderId', 'firstName lastName')
      .lean();
    
    // Get total count
    const totalNotifications = await Notification.countDocuments(query);
    
    res.json({
      success: true,
      data: notifications,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalNotifications / limit),
        totalNotifications,
        hasNextPage: page < Math.ceil(totalNotifications / limit),
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/notifications/:notificationId/read
// @desc    Mark notification as read
// @access  Private
router.put('/:notificationId/read', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // Import Notification model
    const Notification = require('../models/Notification');
    
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { 
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      data: notification,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;