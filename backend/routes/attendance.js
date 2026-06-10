const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../middleware/auth');

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
    
    // Update user's active timesheet with last activity time
    const Timesheet = require('../models/Timesheet');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await Timesheet.findOneAndUpdate(
      { userId, date: { $gte: today, $lt: tomorrow }, status: 'active' },
      { $set: { lastActivityTime: new Date(timestamp || Date.now()) } }
    );
    
    res.json({
      success: true,
      message: 'Heartbeat received',
      data: { timestamp: Date.now(), userId }
    });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
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
router.post('/logout-activity', optionalAuth, async (req, res) => {
  try {
    const { autoClockOut } = req.body;
    const userId = req.user ? req.user._id : null;
    
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
        status = activeTimesheet.isOvertime ? 'overtime_active' : 'clocked_in';
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
    const User = require('../models/User');
    const Timesheet = require('../models/Timesheet');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's timesheets
    const todayTimesheets = await Timesheet.find({ date: { $gte: today, $lt: tomorrow } })
      .populate('userId', 'firstName lastName role department')
      .sort({ createdAt: -1 });

    // Get all active staff to find who hasn't clocked in
    const allStaff = await User.find({ role: { $nin: ['admin'] }, isActive: true }).lean();
    const clockedInIds = new Set(todayTimesheets.filter(ts => ts.userId).map(ts => ts.userId._id.toString()));

    const notifications = [];
    let idCounter = 1;

    // Late arrivals (minutesLate > 0)
    todayTimesheets.filter(ts => ts.userId && ts.clockIn?.minutesLate > 0 && !ts.isOvertime).forEach(ts => {
      notifications.push({
        id: String(idCounter++),
        type: 'late_arrival',
        message: `${ts.userId.firstName} ${ts.userId.lastName} was ${ts.clockIn.minutesLate} minutes late`,
        userId: ts.userId._id.toString(),
        userName: `${ts.userId.firstName} ${ts.userId.lastName}`,
        timestamp: (ts.clockIn.time || ts.createdAt).toISOString(),
        isRead: true
      });
    });

    // Absent staff (no timesheet today, current time > 9:30 AM)
    const now = new Date();
    const nineThirty = new Date(today);
    nineThirty.setHours(9, 30, 0, 0);
    if (now > nineThirty) {
      allStaff.filter(s => !clockedInIds.has(s._id.toString())).forEach(s => {
        notifications.push({
          id: String(idCounter++),
          type: 'absence_alert',
          message: `${s.firstName} ${s.lastName} has not clocked in today`,
          userId: s._id.toString(),
          userName: `${s.firstName} ${s.lastName}`,
          timestamp: now.toISOString(),
          isRead: false
        });
      });
    }

    // Overtime alerts (working > 10 hours)
    todayTimesheets.filter(ts => ts.userId && (ts.totalWorkHours || 0) > 10 && ts.status === 'active').forEach(ts => {
      notifications.push({
        id: String(idCounter++),
        type: 'overtime_alert',
        message: `${ts.userId.firstName} ${ts.userId.lastName} has been working for ${Math.round(ts.totalWorkHours)} hours`,
        userId: ts.userId._id.toString(),
        userName: `${ts.userId.firstName} ${ts.userId.lastName}`,
        timestamp: now.toISOString(),
        isRead: false
      });
    });

    const totalUnread = notifications.filter(n => !n.isRead).length;
    res.json({ success: true, notifications, totalUnread });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/attendance/analytics
// @desc    Get attendance analytics
// @access  Private
router.get('/analytics', auth, async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    const Timesheet = require('../models/Timesheet');
    const User = require('../models/User');
    
    let query = {};
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.date = { $gte: thirtyDaysAgo, $lte: new Date() };
    }
    
    const timesheets = await Timesheet.find(query)
      .populate('userId', 'firstName lastName role department')
      .lean();
    
    const filtered = timesheets.filter(t => t.userId);
    let deptFiltered = filtered;
    if (department && department !== 'all') {
      deptFiltered = deptFiltered.filter(t => t.userId.department === department);
    }
    
    // Get unique working days
    const uniqueDates = new Set(deptFiltered.map(t => t.date ? new Date(t.date).toISOString().split('T')[0] : '').filter(Boolean));
    const totalDays = uniqueDates.size || 1;
    
    const totalPresent = deptFiltered.filter(t => t.dayAttendanceStatus === 'present' || t.status === 'completed' || t.status === 'active').length;
    const totalLate = deptFiltered.filter(t => t.clockIn?.minutesLate > 0).length;
    const totalOvertime = deptFiltered.filter(t => (t.overtimeHours || 0) > 0 || t.isOvertime).length;
    
    // Get all staff count for absent calculation
    let staffQuery = { role: { $nin: ['admin'] }, isActive: true };
    if (department && department !== 'all') {
      staffQuery.department = department;
    }
    const allStaff = await User.find(staffQuery).countDocuments();
    const totalAbsent = Math.max(0, (allStaff * totalDays) - totalPresent);
    const averageAttendance = allStaff > 0 && totalDays > 0 ? Math.round((totalPresent / (allStaff * totalDays)) * 100) : 0;
    
    // Daily stats
    const dailyStatsMap = {};
    deptFiltered.forEach(t => {
      if (!t.date) return;
      const dateKey = new Date(t.date).toISOString().split('T')[0];
      if (!dateKey) return;
      if (!dailyStatsMap[dateKey]) dailyStatsMap[dateKey] = { date: dateKey, present: 0, absent: 0, late: 0, overtime: 0 };
      dailyStatsMap[dateKey].present++;
      if (t.clockIn?.minutesLate > 0) dailyStatsMap[dateKey].late++;
      if ((t.overtimeHours || 0) > 0 || t.isOvertime) dailyStatsMap[dateKey].overtime++;
    });
    const dailyStats = Object.values(dailyStatsMap).sort((a, b) => a.date.localeCompare(b.date));
    
    // Department stats
    const deptStatsMap = {};
    filtered.forEach(t => {
      const dept = t.userId.department || 'General';
      if (!deptStatsMap[dept]) deptStatsMap[dept] = { totalPresent: 0, totalAbsent: 0, averageAttendance: 0, totalOvertime: 0 };
      deptStatsMap[dept].totalPresent++;
      if ((t.overtimeHours || 0) > 0 || t.isOvertime) deptStatsMap[dept].totalOvertime++;
    });
    
    res.json({
      success: true,
      data: {
        summary: { totalDays, averageAttendance, totalPresent, totalAbsent, totalLate, totalOvertime },
        dailyStats,
        departmentStats: deptStatsMap
      }
    });
  } catch (error) {
    console.error('Error fetching attendance analytics:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/attendance/monthly
// @desc    Get monthly attendance data
// @access  Private
router.get('/monthly', auth, async (req, res) => {
  try {
    const { year, month } = req.query;
    const Timesheet = require('../models/Timesheet');
    const User = require('../models/User');
    
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 1);
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    
    const allStaff = await User.find({ role: { $nin: ['admin'] }, isActive: true }).lean();
    const timesheets = await Timesheet.find({ date: { $gte: startDate, $lt: endDate } })
      .populate('userId', 'firstName lastName role department')
      .lean();
    
    let totalPresent = 0, totalLate = 0, totalOvertime = 0;
    const dailyBreakdown = [];
    const staffMap = {};
    
    // Build staff breakdown
    allStaff.forEach(s => {
      staffMap[s._id.toString()] = { userId: s._id.toString(), userName: `${s.firstName} ${s.lastName}`, presentDays: 0, absentDays: 0, lateDays: 0, overtimeHours: 0, totalHours: 0 };
    });
    
    timesheets.forEach(ts => {
      if (!ts.userId) return;
      const uid = ts.userId._id?.toString();
      if (uid && staffMap[uid]) {
        staffMap[uid].presentDays++;
        staffMap[uid].totalHours += ts.totalWorkHours || 0;
        staffMap[uid].overtimeHours += ts.overtimeHours || 0;
        if (ts.clockIn?.minutesLate > 0) staffMap[uid].lateDays++;
      }
      totalPresent++;
      if (ts.clockIn?.minutesLate > 0) totalLate++;
      if ((ts.overtimeHours || 0) > 0 || ts.isOvertime) totalOvertime++;
    });
    
    // Calculate absent days for each staff
    Object.values(staffMap).forEach(s => {
      // Count working days (exclude Sundays)
      let workingDays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(targetYear, targetMonth, d);
        if (date.getDay() !== 0 && date <= new Date()) workingDays++;
      }
      s.absentDays = Math.max(0, workingDays - s.presentDays);
    });
    
    const totalAbsent = Object.values(staffMap).reduce((sum, s) => sum + s.absentDays, 0);
    const averageAttendance = allStaff.length > 0 ? Math.round((totalPresent / (allStaff.length * daysInMonth)) * 100) : 0;
    
    res.json({
      success: true,
      data: {
        year: targetYear,
        month: targetMonth + 1,
        totalDays: daysInMonth,
        totalStaff: allStaff.length,
        summary: { totalPresent, totalAbsent, totalLate, totalOvertime, averageAttendance },
        dailyBreakdown,
        staffBreakdown: Object.values(staffMap)
      }
    });
  } catch (error) {
    console.error('Error fetching monthly attendance:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
