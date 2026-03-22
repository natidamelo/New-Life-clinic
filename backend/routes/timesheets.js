const express = require('express');
const router = express.Router();
const Timesheet = require('../models/Timesheet');
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');

// Get all timesheets (admin only)
router.get('/', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { 
      userId, 
      department, 
      startDate, 
      endDate, 
      status,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};
    
    if (userId) filter.userId = userId;
    if (department) filter.department = department;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;
    
    const timesheets = await Timesheet.find(filter)
      .populate('userId', 'firstName lastName role email')
      .populate('approvedBy', 'firstName lastName')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Timesheet.countDocuments(filter);

    res.json({
      timesheets,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        totalRecords: total
      }
    });
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    res.status(500).json({ error: 'Failed to fetch timesheets' });
  }
});

// Get timesheets for a specific user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, status } = req.query;

    // Check if user is requesting their own timesheets or is admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filter = { userId };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    if (status) filter.status = status;

    const timesheets = await Timesheet.find(filter)
      .populate('approvedBy', 'firstName lastName')
      .sort({ date: -1 })
      .lean();

    res.json(timesheets);
  } catch (error) {
    console.error('Error fetching user timesheets:', error);
    res.status(500).json({ error: 'Failed to fetch timesheets' });
  }
});

// Get current user's timesheet for today
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timesheet = await Timesheet.findOne({
      userId: req.user._id,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    }).lean();

    res.json(timesheet || null);
  } catch (error) {
    console.error('Error fetching today\'s timesheet:', error);
    res.status(500).json({ error: 'Failed to fetch timesheet' });
  }
});

// Clock in
router.post('/clock-in', auth, async (req, res) => {
  try {
    const { location = 'Main Office', method = 'system', notes } = req.body;
    
    // SECURITY: Device validation - check if device is registered
    const DeviceRegistration = require('../models/DeviceRegistration');
    const crypto = require('crypto');
    
    // Try to get device fingerprint from request body first (from localStorage), then fall back to headers
    let deviceFingerprint = req.body.deviceFingerprint;
    
    if (!deviceFingerprint) {
      // Fallback: Generate device fingerprint from request headers
      const userAgent = req.headers['user-agent'] || 'unknown';
      const acceptLanguage = req.headers['accept-language'] || 'unknown';
      const acceptEncoding = req.headers['accept-encoding'] || 'unknown';
      
      deviceFingerprint = crypto.createHash('sha256')
        .update(userAgent + acceptLanguage + acceptEncoding + 'browser-device-fingerprint')
        .digest('hex');
      
      console.log(`🔍 [TIMESHEETS] Using header-generated fingerprint: ${deviceFingerprint.substring(0, 20)}...`);
    } else {
      console.log(`🔍 [TIMESHEETS] Using localStorage fingerprint: ${deviceFingerprint.substring(0, 20)}...`);
    }
    
    // Check if this device is registered to the current user
    const deviceRegistration = await DeviceRegistration.findOne({
      userId: req.user._id,
      deviceFingerprint: deviceFingerprint,
      isActive: true
    });
    
    if (!deviceRegistration) {
      console.log(`❌ [TIMESHEETS] Clock-in blocked - Unregistered device attempting to clock in for user: ${req.user._id}`);
      console.log(`   Device fingerprint: ${deviceFingerprint.substring(0, 20)}...`);
      return res.status(403).json({ 
        success: false,
        error: 'Device not registered. Please register your device first using the QR code registration system.',
        code: 'DEVICE_NOT_REGISTERED'
      });
    }
    
    // Update device last used time
    deviceRegistration.lastUsed = new Date();
    await deviceRegistration.save();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if already clocked in today
    const existingTimesheet = await Timesheet.findOne({
      userId: req.user._id,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (existingTimesheet) {
      return res.status(400).json({ error: 'Already clocked in today' });
    }

    // Get user's department
    const user = await User.findById(req.user._id);
    const department = user.role === 'doctor' ? 'OPD' : 
                      user.role === 'nurse' ? 'Ward' : 
                      user.role === 'lab' ? 'Laboratory' : 
                      user.role === 'reception' ? 'Reception' : 'General';

    const timesheet = new Timesheet({
      userId: req.user._id,
      date: new Date(),
      clockIn: {
        time: new Date(),
        location,
        method
      },
      department,
      notes
    });

    await timesheet.save();

    res.json({
      message: 'Successfully clocked in',
      timesheet
    });
  } catch (error) {
    console.error('Error clocking in:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

// Clock out
router.post('/clock-out', auth, async (req, res) => {
  try {
    const { location = 'Main Office', method = 'system', notes } = req.body;
    
    // SECURITY: Device validation - check if device is registered
    const DeviceRegistration = require('../models/DeviceRegistration');
    const crypto = require('crypto');
    
    // Try to get device fingerprint from request body first (from localStorage), then fall back to headers
    let deviceFingerprint = req.body.deviceFingerprint;
    
    if (!deviceFingerprint) {
      // Fallback: Generate device fingerprint from request headers
      const userAgent = req.headers['user-agent'] || 'unknown';
      const acceptLanguage = req.headers['accept-language'] || 'unknown';
      const acceptEncoding = req.headers['accept-encoding'] || 'unknown';
      
      deviceFingerprint = crypto.createHash('sha256')
        .update(userAgent + acceptLanguage + acceptEncoding + 'browser-device-fingerprint')
        .digest('hex');
      
      console.log(`🔍 [TIMESHEETS] Using header-generated fingerprint: ${deviceFingerprint.substring(0, 20)}...`);
    } else {
      console.log(`🔍 [TIMESHEETS] Using localStorage fingerprint: ${deviceFingerprint.substring(0, 20)}...`);
    }
    
    // Check if this device is registered to the current user
    const deviceRegistration = await DeviceRegistration.findOne({
      userId: req.user._id,
      deviceFingerprint: deviceFingerprint,
      isActive: true
    });
    
    if (!deviceRegistration) {
      console.log(`❌ [TIMESHEETS] Clock-out blocked - Unregistered device attempting to clock out for user: ${req.user._id}`);
      console.log(`   Device fingerprint: ${deviceFingerprint.substring(0, 20)}...`);
      return res.status(403).json({ 
        success: false,
        error: 'Device not registered. Please register your device first using the QR code registration system.',
        code: 'DEVICE_NOT_REGISTERED'
      });
    }
    
    // Update device last used time
    deviceRegistration.lastUsed = new Date();
    await deviceRegistration.save();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timesheet = await Timesheet.findOne({
      userId: req.user._id,
      date: {
        $gte: today,
        $lt: tomorrow
      },
      status: 'active'
    });

    if (!timesheet) {
      return res.status(400).json({ error: 'No active timesheet found for today' });
    }

    if (timesheet.clockOut.time) {
      return res.status(400).json({ error: 'Already clocked out today' });
    }

    timesheet.clockOut = {
      time: new Date(),
      location,
      method
    };
    
    if (notes) {
      timesheet.notes = timesheet.notes ? `${timesheet.notes}\n${notes}` : notes;
    }

    timesheet.status = 'completed';
    timesheet.calculateWorkHours();
    
    await timesheet.save();

    res.json({
      message: 'Successfully clocked out',
      timesheet
    });
  } catch (error) {
    console.error('Error clocking out:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

// Start break
router.post('/break/start', auth, async (req, res) => {
  try {
    const { type = 'lunch' } = req.body;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timesheet = await Timesheet.findOne({
      userId: req.user._id,
      date: {
        $gte: today,
        $lt: tomorrow
      },
      status: 'active'
    });

    if (!timesheet) {
      return res.status(400).json({ error: 'No active timesheet found for today' });
    }

    // Check if already on break
    const activeBreak = timesheet.breaks.find(break_ => !break_.endTime);
    if (activeBreak) {
      return res.status(400).json({ error: 'Already on break' });
    }

    timesheet.breaks.push({
      startTime: new Date(),
      type
    });

    await timesheet.save();

    res.json({
      message: 'Break started',
      timesheet
    });
  } catch (error) {
    console.error('Error starting break:', error);
    res.status(500).json({ error: 'Failed to start break' });
  }
});

// End break
router.post('/break/end', auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timesheet = await Timesheet.findOne({
      userId: req.user._id,
      date: {
        $gte: today,
        $lt: tomorrow
      },
      status: 'active'
    });

    if (!timesheet) {
      return res.status(400).json({ error: 'No active timesheet found for today' });
    }

    const activeBreak = timesheet.breaks.find(break_ => !break_.endTime);
    if (!activeBreak) {
      return res.status(400).json({ error: 'No active break found' });
    }

    activeBreak.endTime = new Date();
    activeBreak.duration = Math.round((activeBreak.endTime - activeBreak.startTime) / (1000 * 60));

    await timesheet.save();

    res.json({
      message: 'Break ended',
      timesheet
    });
  } catch (error) {
    console.error('Error ending break:', error);
    res.status(500).json({ error: 'Failed to end break' });
  }
});

// Approve timesheet (admin only)
router.patch('/:timesheetId/approve', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { timesheetId } = req.params;
    const { notes } = req.body;

    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    timesheet.status = 'approved';
    timesheet.approvedBy = req.user._id;
    timesheet.approvedAt = new Date();
    
    if (notes) {
      timesheet.notes = timesheet.notes ? `${timesheet.notes}\nAdmin: ${notes}` : `Admin: ${notes}`;
    }

    await timesheet.save();

    res.json({
      message: 'Timesheet approved',
      timesheet
    });
  } catch (error) {
    console.error('Error approving timesheet:', error);
    res.status(500).json({ error: 'Failed to approve timesheet' });
  }
});

// Reject timesheet (admin only)
router.patch('/:timesheetId/reject', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { timesheetId } = req.params;
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const timesheet = await Timesheet.findById(timesheetId);
    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    timesheet.status = 'rejected';
    timesheet.notes = timesheet.notes ? `${timesheet.notes}\nRejected: ${notes}` : `Rejected: ${notes}`;

    await timesheet.save();

    res.json({
      message: 'Timesheet rejected',
      timesheet
    });
  } catch (error) {
    console.error('Error rejecting timesheet:', error);
    res.status(500).json({ error: 'Failed to reject timesheet' });
  }
});

// Get timesheet statistics
router.get('/stats', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate, department } = req.query;
    
    const filter = {};
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    if (department) filter.department = department;

    const stats = await Timesheet.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalTimesheets: { $sum: 1 },
          totalWorkHours: { $sum: '$totalWorkHours' },
          totalBreakHours: { $sum: '$totalBreakHours' },
          avgWorkHours: { $avg: '$totalWorkHours' },
          avgBreakHours: { $avg: '$totalBreakHours' }
        }
      }
    ]);

    const statusStats = await Timesheet.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const departmentStats = await Timesheet.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          totalHours: { $sum: '$totalWorkHours' },
          avgHours: { $avg: '$totalWorkHours' }
        }
      }
    ]);

    res.json({
      overall: stats[0] || {
        totalTimesheets: 0,
        totalWorkHours: 0,
        totalBreakHours: 0,
        avgWorkHours: 0,
        avgBreakHours: 0
      },
      byStatus: statusStats,
      byDepartment: departmentStats
    });
  } catch (error) {
    console.error('Error fetching timesheet stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Generate test timesheet data for demonstration
router.post('/generate-test-data', auth, checkRole('admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all active users
    const users = await User.find({ isActive: true }).limit(5);
    
    const testTimesheets = [];
    
    for (const user of users) {
      // Create a test timesheet for today
      const clockInTime = new Date(today);
      clockInTime.setHours(8, 0, 0, 0); // 8 AM
      
      const clockOutTime = new Date(today);
      clockOutTime.setHours(17, 0, 0, 0); // 5 PM
      
      const workHours = (clockOutTime - clockInTime) / (1000 * 60 * 60); // 9 hours
      
      const timesheet = new Timesheet({
        userId: user._id,
        date: today,
        clockIn: {
          time: clockInTime,
          location: 'Main Office',
          method: 'system'
        },
        clockOut: {
          time: clockOutTime,
          location: 'Main Office',
          method: 'system'
        },
        totalWorkHours: workHours,
        totalBreakHours: 1, // 1 hour break
        status: 'completed',
        department: user.role === 'doctor' ? 'Doctors/OPD' : 
                   user.role === 'nurse' ? 'Nurses/Ward' :
                   user.role === 'lab' ? 'Laboratory' :
                   user.role === 'reception' ? 'Reception' : 'General'
      });
      
      await timesheet.save();
      testTimesheets.push(timesheet);
    }
    
    res.json({
      success: true,
      message: `Generated ${testTimesheets.length} test timesheets`,
      timesheets: testTimesheets
    });
  } catch (error) {
    console.error('Error generating test data:', error);
    res.status(500).json({ error: 'Failed to generate test data' });
  }
});

module.exports = router; 