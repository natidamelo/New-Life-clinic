const express = require('express');
const router = express.Router();

// @route   GET /api/patients/count
// @desc    Get patient count statistics (no auth version)
// @access  Public
router.get('/patients/count', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        total: 150,
        active: 120,
        newThisMonth: 25
      }
    });
  } catch (error) {
    console.error('Error fetching patient count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/staff/count
// @desc    Get staff count by role (no auth version)
// @access  Public
router.get('/staff/count', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        total: 45,
        active: 42,
        byRole: {
          admin: 5,
          doctor: 15,
          nurse: 20,
          reception: 5
        }
      }
    });
  } catch (error) {
    console.error('Error fetching staff count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/tasks/pending
// @desc    Get pending tasks statistics (no auth version)
// @access  Public
router.get('/tasks/pending', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        pending: 12,
        urgent: 3,
        overdue: 2
      }
    });
  } catch (error) {
    console.error('Error fetching pending tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/lab/stats
// @desc    Get laboratory test statistics (no auth version)
// @access  Public
router.get('/lab/stats', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        pending: 8,
        completed: 45,
        inProgress: 3,
        cancelled: 1,
        total: 57
      }
    });
  } catch (error) {
    console.error('Error fetching lab stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/billing/revenue-stats
// @desc    Get billing and revenue statistics (no auth version)
// @access  Public
router.get('/billing/revenue-stats', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        today: 2500,
        total: 125000,
        outstanding: 8500,
        invoiceCounts: {
          paid: 120,
          pending: 15,
          overdue: 8,
          partial: 5
        }
      }
    });
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/notifications/stats
// @desc    Get notification statistics (no auth version)
// @access  Public
router.get('/notifications/stats', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        active: 7,
        critical: 2,
        total: 25
      }
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/appointments/count
// @desc    Get appointment count statistics (no auth version)
// @access  Public
router.get('/appointments/count', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        total: 89,
        today: 12,
        pending: 8,
        completed: 67
      }
    });
  } catch (error) {
    console.error('Error fetching appointment count:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/dashboard/stats
// @desc    Get comprehensive dashboard statistics for admin (no auth version)
// @access  Public
router.get('/admin/dashboard/stats', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        totalPatients: 150,
        totalStaff: 45,
        pendingTasks: 12,
        pendingLabTests: 8,
        totalRevenue: 125000,
        activeNotifications: 7,
        totalAppointments: 89
      }
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/auto-clockout-setting
// @desc    Get auto clockout setting for admin (no auth version)
// @access  Public
router.get('/admin/auto-clockout-setting', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        enabled: true,
        hours: 8,
        minutes: 0
      }
    });
  } catch (error) {
    console.error('Error fetching auto clockout setting:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/attendance/logout-activity
// @desc    Record logout activity (no auth version)
// @access  Public
router.post('/attendance/logout-activity', async (req, res) => {
  try {
    const { userId, logoutTime, sessionDuration } = req.body;

    // For now, just log the activity
    console.log('Logout activity recorded:', {
      userId,
      logoutTime,
      sessionDuration,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Logout activity recorded successfully'
    });
  } catch (error) {
    console.error('Error recording logout activity:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
