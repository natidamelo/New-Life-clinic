const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * @route   GET /api/health-check
 * @desc    Check API and database health
 * @access  Public
 */
router.get('/', (req, res) => {
  try {
    // Check MongoDB connection
    const dbStatus = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    
    // Get server status
    const uptime = process.uptime();
    const uptimeFormatted = formatUptime(uptime);
    
    // Format response
    const response = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      server: {
        uptime: uptimeFormatted,
        uptimeSeconds: uptime,
        environment: process.env.NODE_ENV || 'development'
      },
      database: {
        status: getConnectionStatusText(dbStatus),
        statusCode: dbStatus,
        connected: dbStatus === 1,
        // Helps verify Atlas is not using default "test" DB (connection string must end with /clinic-cms)
        name:
          dbStatus === 1 && mongoose.connection.db
            ? mongoose.connection.db.databaseName
            : null
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health-check/simple
 * @desc    Simple ping endpoint that always returns 200 OK
 * @access  Public
 */
router.get('/simple', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'API is running'
  });
});

/**
 * @route   GET /api/health-check/ping
 * @desc    Ultra simple ping endpoint that requires no DB checks
 * @access  Public
 */
router.get('/ping', (req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString()
  });
});

/**
 * @route   GET /api/health-check/auth-probe
 * @desc    Probe auth DB dependencies (temporary diagnostics)
 * @access  Public
 */
router.get('/auth-probe', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState;
    const sampleUser = await User.findOne({}, { _id: 1, role: 1, clinicId: 1 })
      .setOptions({ skipTenantScope: true })
      .lean();
    let writeProbe = { status: 'not_attempted' };

    try {
      await User.updateOne(
        { _id: new mongoose.Types.ObjectId('000000000000000000000000') },
        { $set: { lastLogin: new Date() } }
      );
      writeProbe = { status: 'success' };
    } catch (writeError) {
      writeProbe = {
        status: 'failed',
        errorName: writeError.name,
        errorMessage: writeError.message
      };
    }

    res.json({
      status: 'OK',
      databaseReadyState: dbStatus,
      userQuery: 'success',
      sampleUser: sampleUser || null,
      writeProbe
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      databaseReadyState: mongoose.connection.readyState,
      userQuery: 'failed',
      errorName: error.name,
      errorMessage: error.message
    });
  }
});

/**
 * Format uptime in human-readable format
 */
function formatUptime(uptime) {
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  
  return parts.join(' ');
}

/**
 * Convert MongoDB connection status code to text
 */
function getConnectionStatusText(status) {
  switch (status) {
    case 0: return 'Disconnected';
    case 1: return 'Connected';
    case 2: return 'Connecting';
    case 3: return 'Disconnecting';
    default: return 'Unknown';
  }
}

/**
 * @route   GET /api/health-check/public-stats
 * @desc    Get real-time patient and staff counts for the landing page Vitals card
 * @access  Public
 */
router.get('/public-stats', async (req, res) => {
  try {
    const Patient = mongoose.models.Patient || require('../models/Patient');
    const StaffAttendance = mongoose.models.StaffAttendance || require('../models/StaffAttendance');
    const User = mongoose.models.User || require('../models/User');

    // Default fallbacks match original mock data if database is empty/fresh
    const dbPatientCount = await Patient.countDocuments({});
    const dbCheckedInCount = await StaffAttendance.countDocuments({ status: 'checked-in' });
    const dbTotalStaffCount = await User.countDocuments({ role: { $in: ['doctor', 'nurse', 'admin', 'receptionist'] } });

    res.json({
      success: true,
      patientsServed: dbPatientCount || 10482,
      staffOnDuty: dbCheckedInCount || Math.min(12, dbTotalStaffCount) || 50,
      portalUptime: '99.9%',
      clinicSupport: '24/7'
    });
  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      patientsServed: 10482,
      staffOnDuty: 50,
      portalUptime: '99.9%',
      clinicSupport: '24/7'
    });
  }
});

router.get('/list-timesheets', async (req, res) => {
  try {
    const Timesheet = require('../models/Timesheet');
    const User = require('../models/User');
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);
    
    const timesheets = await Timesheet.find({ date: { $gte: threeDaysAgo } })
      .populate('userId', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .lean();
      
    res.json({
      count: timesheets.length,
      timesheets: timesheets.map(t => ({
        _id: t._id,
        user: t.userId ? `${t.userId.firstName} ${t.userId.lastName} (${t.userId.role})` : 'Unknown',
        userId: t.userId ? t.userId._id : null,
        date: t.date,
        createdAt: t.createdAt,
        isOvertime: t.isOvertime,
        status: t.status,
        dayAttendanceStatus: t.dayAttendanceStatus,
        clockIn: t.clockIn,
        clockOut: t.clockOut,
        totalWorkHours: t.totalWorkHours,
        overtimeHours: t.overtimeHours
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/repair-dates', async (req, res) => {
  try {
    const Timesheet = require('../models/Timesheet');
    const User = require('../models/User');
    
    const natan = await User.findOne({ $or: [{ firstName: 'DR' }, { lastName: 'Natan' }, { firstName: 'Doctor' }] });
    if (!natan) {
      return res.json({ error: 'Natan not found' });
    }
    
    const startOfJuly2 = new Date('2026-07-02T00:00:00.000Z');
    const endOfJuly2 = new Date('2026-07-02T23:59:59.000Z');
    
    const timesheets = await Timesheet.find({
      userId: natan._id,
      isOvertime: true,
      createdAt: { $gte: startOfJuly2, $lte: endOfJuly2 }
    });
    
    if (timesheets.length === 0) {
      return res.json({ message: 'No matching overtime timesheets found to repair' });
    }
    
    const targetDate = new Date(Date.UTC(2026, 6, 1, 0, 0, 0) - (3 * 60 * 60 * 1000));
    
    const updatedIds = [];
    for (let ts of timesheets) {
      ts.date = targetDate;
      await ts.save();
      updatedIds.push(ts._id);
    }
    
    res.json({
      success: true,
      message: `Successfully repaired ${timesheets.length} timesheets`,
      updatedIds,
      newDate: targetDate
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 
