const express = require('express');
const router = express.Router();

// Import models
const Patient = require('../models/Patient');
const User = require('../models/User');
const NurseTask = require('../models/NurseTask');
const LabOrder = require('../models/LabOrder');
const MedicalInvoice = require('../models/MedicalInvoice');
const Notification = require('../models/Notification');
const Appointment = require('../models/Appointment');

// Import middleware
const { auth } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

// Cache duration for stats (5 minutes)
const STATS_CACHE_DURATION = 5 * 60 * 1000;

// @route   GET /api/patients/count
// @desc    Get patient count statistics
// @access  Private
router.get('/patients/count', auth, cacheMiddleware(STATS_CACHE_DURATION), async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const activePatients = await Patient.countDocuments({ status: 'active' });
    const newPatientsThisMonth = await Patient.countDocuments({
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });

    res.json({
      success: true,
      data: {
        total: totalPatients,
        active: activePatients,
        newThisMonth: newPatientsThisMonth
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
// @desc    Get staff count by role
// @access  Private
router.get('/staff/count', auth, cacheMiddleware(STATS_CACHE_DURATION), async (req, res) => {
  try {
    const staffCounts = await User.aggregate([
      { $match: { role: { $ne: 'patient' } } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const totalStaff = await User.countDocuments({ role: { $ne: 'patient' } });
    const activeStaff = await User.countDocuments({ 
      role: { $ne: 'patient' },
      status: 'active'
    });

    // Convert to object format
    const roleCounts = {};
    staffCounts.forEach(item => {
      roleCounts[item._id] = item.count;
    });

    res.json({
      success: true,
      data: {
        total: totalStaff,
        active: activeStaff,
        byRole: roleCounts
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
// @desc    Get pending tasks statistics
// @access  Private
router.get('/tasks/pending', auth, cacheMiddleware(STATS_CACHE_DURATION), async (req, res) => {
  try {
    const pendingTasks = await NurseTask.countDocuments({ status: 'pending' });
    const urgentTasks = await NurseTask.countDocuments({ 
      status: 'pending',
      priority: 'urgent'
    });
    const overdueTasks = await NurseTask.countDocuments({
      status: 'pending',
      dueDate: { $lt: new Date() }
    });

    res.json({
      success: true,
      data: {
        pending: pendingTasks,
        urgent: urgentTasks,
        overdue: overdueTasks
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
// @desc    Get laboratory test statistics
// @access  Private
router.get('/lab/stats', auth, cacheMiddleware(STATS_CACHE_DURATION), async (req, res) => {
  try {
    const pendingTests = await LabOrder.countDocuments({ status: 'pending' });
    const completedTests = await LabOrder.countDocuments({ status: 'completed' });
    const inProgressTests = await LabOrder.countDocuments({ status: 'in-progress' });
    const cancelledTests = await LabOrder.countDocuments({ status: 'cancelled' });

    res.json({
      success: true,
      data: {
        pending: pendingTests,
        completed: completedTests,
        inProgress: inProgressTests,
        cancelled: cancelledTests,
        total: pendingTests + completedTests + inProgressTests + cancelledTests
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
// @desc    Get billing and revenue statistics
// @access  Private
router.get('/billing/revenue-stats', auth, cacheMiddleware(STATS_CACHE_DURATION), async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Today's revenue
    const todayRevenue = await MedicalInvoice.aggregate([
      {
        $match: {
          issueDate: { $gte: startOfToday, $lte: endOfToday },
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    // Total revenue
    const totalRevenue = await MedicalInvoice.aggregate([
      {
        $match: { status: 'paid' }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    // Outstanding amount
    const outstandingAmount = await MedicalInvoice.aggregate([
      {
        $match: { status: { $in: ['pending', 'partial'] } }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);

    // Invoice counts by status
    const invoiceCounts = await MedicalInvoice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const invoiceCountsByStatus = {};
    invoiceCounts.forEach(item => {
      invoiceCountsByStatus[item._id] = item.count;
    });

    res.json({
      success: true,
      data: {
        today: todayRevenue[0]?.total || 0,
        total: totalRevenue[0]?.total || 0,
        outstanding: outstandingAmount[0]?.total || 0,
        invoiceCounts: invoiceCountsByStatus
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
// @desc    Get notification statistics
// @access  Private
router.get('/notifications/stats', auth, cacheMiddleware(STATS_CACHE_DURATION), async (req, res) => {
  try {
    const activeNotifications = await Notification.countDocuments({ 
      status: 'active',
      read: false
    });
    const criticalNotifications = await Notification.countDocuments({
      priority: 'critical',
      status: 'active'
    });
    const totalNotifications = await Notification.countDocuments({ status: 'active' });

    res.json({
      success: true,
      data: {
        active: activeNotifications,
        critical: criticalNotifications,
        total: totalNotifications
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
// @desc    Get appointment count statistics
// @access  Private
router.get('/appointments/count', auth, cacheMiddleware(STATS_CACHE_DURATION), async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const totalAppointments = await Appointment.countDocuments();
    const todayAppointments = await Appointment.countDocuments({
      appointmentDate: { $gte: startOfToday, $lte: endOfToday }
    });
    const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });

    res.json({
      success: true,
      data: {
        total: totalAppointments,
        today: todayAppointments,
        pending: pendingAppointments,
        completed: completedAppointments
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

// @route   GET /api/dashboard/universal-stats
// @desc    Get universal dashboard statistics for any role
// @access  Private
router.get('/universal-stats', auth, cacheMiddleware(STATS_CACHE_DURATION), async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Fetch all stats in parallel with comprehensive data
    const [
      patientStats,
      staffStats,
      taskStats,
      labStats,
      revenueStats,
      notificationStats,
      appointmentStats,
      todayRevenueStats,
      completedLabStats
    ] = await Promise.all([
      // Total patients
      Patient.countDocuments(),
      
      // Total staff (excluding patients)
      User.countDocuments({ role: { $ne: 'patient' } }),
      
      // Pending tasks
      NurseTask.countDocuments({ status: 'pending' }),
      
      // Pending lab tests
      LabOrder.countDocuments({ status: 'pending' }),
      
      // Total revenue (all time)
      MedicalInvoice.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      
      // Active notifications
      Notification.countDocuments({ status: 'active', read: false }),
      
      // Total appointments
      Appointment.countDocuments(),
      
      // Today's revenue
      MedicalInvoice.aggregate([
        {
          $match: {
            issueDate: { $gte: startOfToday, $lte: endOfToday },
            status: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' }
          }
        }
      ]),
      
      // Completed lab tests
      LabOrder.countDocuments({ status: 'completed' })
    ]);

    res.json({
      success: true,
      data: {
        totalPatients: patientStats || 0,
        totalAppointments: appointmentStats || 0,
        totalStaff: staffStats || 0,
        pendingTasks: taskStats || 0,
        todayRevenue: todayRevenueStats[0]?.total || 0,
        totalRevenue: revenueStats[0]?.total || 0,
        pendingLabTests: labStats || 0,
        completedLabTests: completedLabStats || 0,
        criticalAlerts: notificationStats || 0,
        activeNotifications: notificationStats || 0
      }
    });
  } catch (error) {
    console.error('Error fetching universal dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
});

// @route   GET /api/admin/dashboard/stats
// @desc    Get comprehensive dashboard statistics for admin
// @access  Private (Admin only)
router.get('/admin/dashboard/stats', auth, cacheMiddleware(STATS_CACHE_DURATION), async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Fetch all stats in parallel with more comprehensive data
    const [
      patientStats,
      staffStats,
      taskStats,
      labStats,
      revenueStats,
      notificationStats,
      appointmentStats,
      todayRevenueStats,
      completedLabStats
    ] = await Promise.all([
      // Total patients
      Patient.countDocuments(),
      
      // Total staff (excluding patients)
      User.countDocuments({ role: { $ne: 'patient' } }),
      
      // Pending tasks
      NurseTask.countDocuments({ status: 'pending' }),
      
      // Pending lab tests
      LabOrder.countDocuments({ status: 'pending' }),
      
      // Total revenue (all time)
      MedicalInvoice.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      
      // Active notifications
      Notification.countDocuments({ status: 'active', read: false }),
      
      // Total appointments
      Appointment.countDocuments(),
      
      // Today's revenue
      MedicalInvoice.aggregate([
        {
          $match: {
            issueDate: { $gte: startOfToday, $lte: endOfToday },
            status: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' }
          }
        }
      ]),
      
      // Completed lab tests
      LabOrder.countDocuments({ status: 'completed' })
    ]);

    const totalRevenue = revenueStats[0]?.total || 0;
    const todayRevenue = todayRevenueStats[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalPatients: patientStats,
        totalStaff: staffStats,
        pendingTasks: taskStats,
        pendingLabTests: labStats,
        completedLabTests: completedLabStats,
        totalRevenue: totalRevenue,
        todayRevenue: todayRevenue,
        activeNotifications: notificationStats,
        totalAppointments: appointmentStats,
        criticalAlerts: 0 // Can be enhanced later with actual critical alerts
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

// @route   GET /api/dashboard/universal-stats
// @desc    Get universal dashboard statistics for any role
// @access  Private
router.get('/dashboard/universal-stats', auth, cacheMiddleware(STATS_CACHE_DURATION), async (req, res) => {
  try {
    const userRole = req.user.role;
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Base stats that all roles can see
    const baseStats = await Promise.all([
      Patient.countDocuments(),
      User.countDocuments({ role: { $ne: 'patient' } }),
      NurseTask.countDocuments({ status: 'pending' }),
      LabOrder.countDocuments({ status: 'pending' }),
      LabOrder.countDocuments({ status: 'completed' }),
      Notification.countDocuments({ status: 'active', read: false }),
      Appointment.countDocuments()
    ]);

    const [
      totalPatients,
      totalStaff,
      pendingTasks,
      pendingLabTests,
      completedLabTests,
      activeNotifications,
      totalAppointments
    ] = baseStats;

    // Role-specific stats
    let todayRevenue = 0;
    let totalRevenue = 0;

    // Revenue stats for roles that should see them
    if (['admin', 'finance', 'billing', 'reception'].includes(userRole)) {
      const [todayRevenueResult, totalRevenueResult] = await Promise.all([
        MedicalInvoice.aggregate([
          {
            $match: {
              issueDate: { $gte: startOfToday, $lte: endOfToday },
              status: 'paid'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$total' }
            }
          }
        ]),
        MedicalInvoice.aggregate([
          { $match: { status: 'paid' } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ])
      ]);

      todayRevenue = todayRevenueResult[0]?.total || 0;
      totalRevenue = totalRevenueResult[0]?.total || 0;
    }

    res.json({
      success: true,
      data: {
        totalPatients,
        totalStaff,
        pendingTasks,
        pendingLabTests,
        completedLabTests,
        todayRevenue,
        totalRevenue,
        activeNotifications,
        totalAppointments,
        criticalAlerts: 0 // Can be enhanced later
      }
    });
  } catch (error) {
    console.error('Error fetching universal dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/admin/auto-clockout-setting
// @desc    Get auto clockout setting for admin
// @access  Private (Admin only) - but allows access in development
router.get('/admin/auto-clockout-setting', auth, async (req, res) => {
  try {
    // In development, allow access without admin role check
    if (process.env.NODE_ENV === 'production' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    // For now, return a default setting
    // In a real application, this would come from a settings table
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
// @desc    Record logout activity
// @access  Private
router.post('/attendance/logout-activity', auth, async (req, res) => {
  try {
    const { userId, logoutTime, sessionDuration } = req.body;

    // For now, just log the activity
    // In a real application, this would be saved to an attendance table
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
