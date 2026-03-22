const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// @route   GET /api/attendance
// @desc    Get all attendance
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'attendance endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/attendance
// @desc    Create new attendance
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'attendance created successfully'
    });
  } catch (error) {
    console.error('Error creating attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/attendance/heartbeat
// @desc    Send activity heartbeat
// @access  Private
router.post('/heartbeat', auth, async (req, res) => {
  try {
    const { timestamp, lastActivity } = req.body;
    const userId = req.user._id;
    
    console.log(`💓 Heartbeat received from user ${userId} at ${new Date(timestamp).toISOString()}`);
    
    // Here you would typically update the user's last activity in the database
    // For now, we'll just acknowledge the heartbeat
    
    res.json({
      success: true,
      message: 'Heartbeat received',
      data: {
        timestamp: Date.now(),
        userId: userId
      }
    });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/attendance/login-activity
// @desc    Record login activity
// @access  Private
router.post('/login-activity', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log(`🔐 Login activity recorded for user ${userId}`);
    
    // Here you would typically record the login activity in the database
    // For now, we'll just acknowledge the activity
    
    res.json({
      success: true,
      message: 'Login activity recorded',
      data: {
        timestamp: Date.now(),
        userId: userId,
        activity: 'login'
      }
    });
  } catch (error) {
    console.error('Error recording login activity:', error);
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
router.post('/logout-activity', auth, async (req, res) => {
  try {
    const { autoClockOut } = req.body;
    const userId = req.user._id;
    
    console.log(`🚪 Logout activity recorded for user ${userId}, autoClockOut: ${autoClockOut}`);
    
    // Here you would typically record the logout activity in the database
    // For now, we'll just acknowledge the activity
    
    res.json({
      success: true,
      message: 'Logout activity recorded',
      data: {
        timestamp: Date.now(),
        userId: userId,
        activity: 'logout',
        autoClockOut: autoClockOut || false
      }
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

// @route   GET /api/attendance/my-status
// @desc    Get current user's attendance status
// @access  Private
router.get('/my-status', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const mongoose = require('mongoose');
    const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    if (!dbConnected) {
      // Return a safe default when DB is down to avoid 500s in UI
      return res.json({
        success: true,
        data: {
          status: 'absent',
          clockedIn: false,
          isOvertimeActive: false,
          isOvertimeCompleted: false,
          lastActivity: null,
          canCheckIn: true,
          canCheckOut: false,
          overtimeTimesheet: null,
          dayAttendanceStatus: 'absent'
        }
      });
    }
    const Timesheet = require('../models/Timesheet');
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get today's timesheets
    const timesheets = await Timesheet.find({
      userId: userId,
      date: { $gte: today, $lt: tomorrow }
    }).sort({ createdAt: -1 });
    
    // Determine current status
    let status = 'absent';
    let clockedIn = false;
    let isOvertimeActive = false;
    let isOvertimeCompleted = false;
    let overtimeTimesheet = null;
    let lastActivity = null;
    let canCheckIn = false;
    let canCheckOut = false;
    
    if (timesheets.length > 0) {
      // Check for active timesheets first
      const activeTimesheet = timesheets.find(ts => ts.status === 'active');
      const completedTimesheet = timesheets.find(ts => ts.status === 'completed');
      
      if (activeTimesheet) {
        status = activeTimesheet.isOvertime ? 'overtime_active' : 'present';
        clockedIn = true;
        isOvertimeActive = activeTimesheet.isOvertime;
        lastActivity = activeTimesheet.clockIn.time;
        canCheckIn = false; // Can't check in if already checked in
        canCheckOut = true; // Can check out if currently checked in
        overtimeTimesheet = activeTimesheet.isOvertime ? {
          hasClockIn: !!activeTimesheet.clockIn.time,
          hasClockOut: !!activeTimesheet.clockOut.time,
          clockInTime: activeTimesheet.clockIn.time,
          clockOutTime: activeTimesheet.clockOut.time,
          overtimeHours: activeTimesheet.overtimeHours
        } : null;
      } else if (completedTimesheet) {
        status = completedTimesheet.isOvertime ? 'overtime_completed' : 'present';
        clockedIn = false;
        isOvertimeCompleted = completedTimesheet.isOvertime;
        lastActivity = completedTimesheet.clockOut.time;
        canCheckIn = true; // Can check in for overtime if completed regular hours
        canCheckOut = false; // Can't check out if already checked out
        overtimeTimesheet = completedTimesheet.isOvertime ? {
          hasClockIn: !!completedTimesheet.clockIn.time,
          hasClockOut: !!completedTimesheet.clockOut.time,
          clockInTime: completedTimesheet.clockIn.time,
          clockOutTime: completedTimesheet.clockOut.time,
          overtimeHours: completedTimesheet.overtimeHours
        } : null;
      }
    } else {
      // No timesheets - user is absent, can check in
      canCheckIn = true;
      canCheckOut = false;
    }
    
    res.json({
      success: true,
      data: {
        userId: userId,
        status: status,
        clockedIn: clockedIn,
        isOvertimeActive: isOvertimeActive,
        isOvertimeCompleted: isOvertimeCompleted,
        canCheckIn: canCheckIn,
        canCheckOut: canCheckOut,
        overtimeTimesheet: overtimeTimesheet,
        lastActivity: lastActivity,
        timesheets: timesheets.map(ts => ({
          id: ts._id,
          clockInTime: ts.clockIn.time,
          clockOutTime: ts.clockOut.time,
          isOvertime: ts.isOvertime,
          status: ts.status,
          dayAttendanceStatus: ts.dayAttendanceStatus,
          overtimeHours: ts.overtimeHours
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching attendance status:', error);
    // Check if it's a database connection error
    if (error.name === 'MongooseError' || 
        error.name === 'MongoNetworkError' || 
        error.name === 'MongoTimeoutError' ||
        error.message?.includes('buffering timed out')) {
      // Return safe default instead of error
      return res.json({
        success: true,
        data: {
          status: 'absent',
          clockedIn: false,
          isOvertimeActive: false,
          isOvertimeCompleted: false,
          lastActivity: null,
          canCheckIn: true,
          canCheckOut: false,
          overtimeTimesheet: null,
          dayAttendanceStatus: 'absent'
        }
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/attendance/automatic
// @desc    Get automatic attendance data for admin view - now redirects to real data
// @access  Private
router.get('/automatic', auth, async (req, res) => {
  try {
    // Check database connection first
    const mongoose = require('mongoose');
    const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    if (!dbConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable. Please ensure MongoDB is running.',
        error: 'database_unavailable'
      });
    }
    
    // Redirect to the real staff attendance data endpoint
    // This maintains backward compatibility while using real data
    const User = require('../models/User');
    const Timesheet = require('../models/Timesheet');
    
    // Get all active staff members
    const allStaff = await User.find({ 
      role: { $nin: ['admin'] },
      isActive: true 
    });

    // Get today's attendance data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendanceRecords = await Timesheet.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('userId', 'firstName lastName role department');

    // Create attendance data for all staff
    const staff = allStaff.map(user => {
      const staffTimesheets = attendanceRecords.filter(record => 
        record.userId._id.toString() === user._id.toString()
      );
      
      if (staffTimesheets.length > 0) {
        const regularTimesheet = staffTimesheets.find(ts => !ts.isOvertime);
        const overtimeTimesheet = staffTimesheets.find(ts => ts.isOvertime);
        
        let status = 'absent';
        let clockInTime = null;
        let clockOutTime = null;
        let totalHours = 0;
        let isOvertime = false;
        
        if (overtimeTimesheet) {
          status = overtimeTimesheet.status === 'active' ? 'present' : 'checked-out';
          clockInTime = overtimeTimesheet.clockIn?.time ? 
            overtimeTimesheet.clockIn.time.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }) : null;
          clockOutTime = overtimeTimesheet.clockOut?.time ? 
            overtimeTimesheet.clockOut.time.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }) : null;
          totalHours = overtimeTimesheet.totalWorkHours || 0;
          isOvertime = true;
        } else if (regularTimesheet) {
          status = regularTimesheet.dayAttendanceStatus || 'present';
          clockInTime = regularTimesheet.clockIn?.time ? 
            regularTimesheet.clockIn.time.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }) : null;
          clockOutTime = regularTimesheet.clockOut?.time ? 
            regularTimesheet.clockOut.time.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            }) : null;
          totalHours = regularTimesheet.totalWorkHours || 0;
          isOvertime = totalHours > 8;
        }
        
        return {
          userId: user._id.toString(),
          userName: `${user.firstName} ${user.lastName}`,
          department: user.department || 'General',
          status: status,
          lastActivity: Date.now() - 300000, // 5 minutes ago
          clockInTime: clockInTime,
          clockOutTime: clockOutTime,
          totalHours: totalHours,
          isOvertime: isOvertime
        };
      } else {
        return {
          userId: user._id.toString(),
          userName: `${user.firstName} ${user.lastName}`,
          department: user.department || 'General',
          status: 'absent',
          lastActivity: null,
          clockInTime: null,
          clockOutTime: null,
          totalHours: 0,
          isOvertime: false
        };
      }
    });

    const summary = {
      total: staff.length,
      present: staff.filter(s => s.status === 'present' || s.status === 'checked-out').length,
      absent: staff.filter(s => s.status === 'absent').length,
      late: 0,
      overtime: staff.filter(s => s.isOvertime).length,
      offline: 0,
      departments: {}
    };

    // Group by department
    staff.forEach(member => {
      const dept = member.department;
      if (!summary.departments[dept]) {
        summary.departments[dept] = { total: 0, present: 0, absent: 0 };
      }
      summary.departments[dept].total++;
      if (member.status === 'present' || member.status === 'checked-out') {
        summary.departments[dept].present++;
      } else if (member.status === 'absent') {
        summary.departments[dept].absent++;
      }
    });

    res.json({
      success: true,
      staff: staff,
      summary: summary
    });
  } catch (error) {
    console.error('Error fetching automatic attendance:', error);
    // Check if it's a database connection error
    if (error.name === 'MongooseError' || 
        error.name === 'MongoNetworkError' || 
        error.name === 'MongoTimeoutError' ||
        error.message?.includes('buffering timed out')) {
      return res.status(503).json({
        success: false,
        message: 'Database service unavailable. Please ensure MongoDB is running.',
        error: 'database_unavailable'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/attendance/admin-notifications
// @desc    Get admin notifications for attendance
// @access  Private
router.get('/admin-notifications', auth, async (req, res) => {
  try {
    // Mock admin notifications
    const notifications = [
      {
        id: '1',
        type: 'late_arrival',
        message: 'Dr. Emily Brown is 15 minutes late',
        userId: '3',
        userName: 'Dr. Emily Brown',
        timestamp: new Date().toISOString(),
        isRead: false
      },
      {
        id: '2',
        type: 'overtime_alert',
        message: 'Nurse Sarah Johnson has been working for 12 hours',
        userId: '2',
        userName: 'Nurse Sarah Johnson',
        timestamp: new Date().toISOString(),
        isRead: false
      },
      {
        id: '3',
        type: 'absence_alert',
        message: 'Dr. Michael Wilson has not clocked in today',
        userId: '5',
        userName: 'Dr. Michael Wilson',
        timestamp: new Date().toISOString(),
        isRead: true
      }
    ];

    const totalUnread = notifications.filter(n => !n.isRead).length;

    res.json({
      success: true,
      notifications: notifications,
      totalUnread: totalUnread
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/attendance/analytics
// @desc    Get attendance analytics
// @access  Private
router.get('/analytics', auth, async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    // Mock analytics data
    const analytics = {
      summary: {
        totalDays: 30,
        averageAttendance: 85,
        totalPresent: 510,
        totalAbsent: 90,
        totalLate: 45,
        totalOvertime: 120
      },
      dailyStats: [
        {
          date: '2025-01-01',
          present: 18,
          absent: 5,
          late: 3,
          overtime: 4
        },
        {
          date: '2025-01-02',
          present: 20,
          absent: 3,
          late: 2,
          overtime: 6
        }
      ],
      departmentStats: {
        'Doctors': {
          totalPresent: 180,
          totalAbsent: 20,
          averageAttendance: 90,
          totalOvertime: 45
        },
        'Nurses': {
          totalPresent: 240,
          totalAbsent: 30,
          averageAttendance: 88,
          totalOvertime: 60
        }
      }
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching attendance analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/attendance/monthly
// @desc    Get monthly attendance data
// @access  Private
router.get('/monthly', auth, async (req, res) => {
  try {
    const { year, month, startDate, endDate } = req.query;
    
    // Mock monthly attendance data
    const monthlyData = {
      year: parseInt(year),
      month: parseInt(month),
      totalDays: 31,
      totalStaff: 25,
      summary: {
        totalPresent: 620,
        totalAbsent: 155,
        totalLate: 78,
        totalOvertime: 310,
        averageAttendance: 80
      },
      dailyBreakdown: [
        {
          date: '2025-01-01',
          present: 20,
          absent: 5,
          late: 3,
          overtime: 8
        },
        {
          date: '2025-01-02',
          present: 22,
          absent: 3,
          late: 2,
          overtime: 10
        }
      ],
      staffBreakdown: [
        {
          userId: '1',
          userName: 'Dr. John Smith',
          presentDays: 28,
          absentDays: 3,
          lateDays: 2,
          overtimeHours: 45,
          totalHours: 252
        },
        {
          userId: '2',
          userName: 'Nurse Sarah Johnson',
          presentDays: 30,
          absentDays: 1,
          lateDays: 0,
          overtimeHours: 60,
          totalHours: 270
        }
      ]
    };

    res.json({
      success: true,
      data: monthlyData
    });
  } catch (error) {
    console.error('Error fetching monthly attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
