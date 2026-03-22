
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const QRCodeService = require('../services/qrCodeService');
const EnhancedQRCodeService = require('../services/enhancedQRCodeService');
const StaffHash = require('../models/StaffHash');
const QRCode = require('qrcode');
const crypto = require('crypto');

// @route   GET /api/qrCode
// @desc    Get all qrCode
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'qrCode endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching qrCode:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/qrCode
// @desc    Create new qrCode
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'qrCode created successfully'
    });
  } catch (error) {
    console.error('Error creating qrCode:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/qr/current-status
// @desc    Get current QR status for the authenticated user based on Ethiopian working hours
// @access  Private
router.get('/current-status', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const status = await QRCodeService.getCurrentStatus(userId);
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting current status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/qr/current-status/:userId
// @desc    Get current QR status for the user based on Ethiopian working hours
// @access  Private
router.get('/current-status/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const status = await QRCodeService.getCurrentStatus(userId);
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting current status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/qr/verify
// @desc    Verify QR code and process check-in/check-out
// @access  Private
router.post('/verify', auth, async (req, res) => {
  try {
    const { qrData, deviceInfo } = req.body;
    const userId = req.user._id || req.user.userId;
    
    // Use Enhanced QRCodeService for verification with advanced features
    const enhancedDeviceInfo = {
      userAgent: req.headers['user-agent'] || 'Unknown',
      platform: req.headers['sec-ch-ua-platform'] || 'Unknown',
      language: req.headers['accept-language'] || 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ipAddress: req.ip || req.connection.remoteAddress,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(req.headers['user-agent'] || ''),
      ...deviceInfo
    };
    
    const result = await EnhancedQRCodeService.verifyEnhancedQRCode(
      qrData, 
      enhancedDeviceInfo, 
      { offline: false, includeAnalytics: true }
    );

    res.json({
      success: true,
        message: result.message,
        data: result.data
      });
  } catch (error) {
    console.error('Error verifying QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/qr/attendance/all/today
// @desc    Get attendance for all users in staff service format for a specific date
// @access  Private
router.get('/attendance/all/today', auth, async (req, res) => {
  try {
    const Timesheet = require('../models/Timesheet');
    const User = require('../models/User');
    
    // Get date from query parameter, default to today if not provided
    const { date } = req.query;
    let targetDate;
    
    if (date) {
      targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use YYYY-MM-DD format.'
        });
      }
    } else {
      targetDate = new Date();
    }
    
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    console.log(`📊 [QR] Fetching attendance data for ${targetDate.toISOString().split('T')[0]} from database...`);
    
    // Get all active users to map IDs to names
    const allUsers = await User.find({ isActive: true }).select('firstName lastName username role');
    console.log(`📊 [QR] Found ${allUsers.length} active users in database`);
    
    const userMap = {};
    allUsers.forEach(user => {
      userMap[user._id.toString()] = {
        name: `${user.firstName} ${user.lastName}`,
        username: user.username,
        role: user.role
      };
    });
    
    // Get timesheet records from database for the specified date
    const todayTimesheets = await Timesheet.find({
      date: { $gte: targetDate, $lt: nextDate }
    }).populate('userId', 'firstName lastName username role');
    
    console.log(`📊 [QR] Found ${todayTimesheets.length} timesheet records for ${targetDate.toISOString().split('T')[0]}`);
    
    // Convert database attendance data to staff service format
    const attendanceData = [];
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalOvertimeCheckin = 0;
    let totalOvertimeComplete = 0;
    let totalWorkHours = 0;
    
    // Process each user
    for (const user of allUsers) {
      const userId = user._id.toString();
      const userInfo = userMap[userId];
      
      // Find timesheet records for this user on the specified date
      const userTimesheets = todayTimesheets.filter(ts => ts.userId._id.toString() === userId);
      
      if (userTimesheets.length > 0) {
        // Find regular and overtime timesheets separately
        const regularTimesheet = userTimesheets.find(ts => !ts.isOvertime);
        const overtimeTimesheet = userTimesheets.find(ts => ts.isOvertime);
        
        // Determine which timesheet to use for primary status and work hours calculation
        const primaryTimesheet = overtimeTimesheet || regularTimesheet;
        
        console.log(`📊 [QR] Processing timesheets for ${userInfo?.name}:`);
        console.log(`  Regular timesheet: ${regularTimesheet ? regularTimesheet._id : 'None'} (Status: ${regularTimesheet?.status || 'N/A'})`);
        console.log(`  Overtime timesheet: ${overtimeTimesheet ? overtimeTimesheet._id : 'None'} (Status: ${overtimeTimesheet?.status || 'N/A'})`);
        console.log(`  Primary timesheet: ${primaryTimesheet._id} (Status: ${primaryTimesheet.status}, IsOvertime: ${primaryTimesheet.isOvertime})`);
        
        // Calculate total work hours from both timesheets
        let totalHours = 0;
        if (regularTimesheet) {
          totalHours += regularTimesheet.totalWorkHours || 0;
        }
        if (overtimeTimesheet) {
          totalHours += overtimeTimesheet.totalWorkHours || 0;
        }
        
        // If still checked in, calculate hours from current time
        if (primaryTimesheet.clockIn?.time && !primaryTimesheet.clockOut?.time) {
          const currentTime = new Date();
          const diffMs = currentTime - primaryTimesheet.clockIn.time;
          const additionalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
          totalHours += additionalHours;
        }
        
        const isOvertime = overtimeTimesheet ? true : false;
        const dayStatus = primaryTimesheet.dayAttendanceStatus || 'absent';
        
        // Determine attendance status based on primary timesheet data
        let dayAttendanceStatus = primaryTimesheet.dayAttendanceStatus || 'absent';
        let attendanceStatus = 'absent';
        
        // Use the primary timesheet's calculated dayAttendanceStatus
        if (dayAttendanceStatus === 'overtime-complete') {
          attendanceStatus = 'overtime-complete';
          totalOvertimeComplete++;
        } else if (dayAttendanceStatus === 'overtime-checkin') {
          attendanceStatus = 'overtime-checkin';
          totalOvertimeCheckin++;
        } else if (dayAttendanceStatus === 'late') {
          attendanceStatus = 'late';
          totalLate++;
        } else if (dayAttendanceStatus === 'present') {
          attendanceStatus = 'present';
          totalPresent++;
        } else if (dayAttendanceStatus === 'early-clock-out') {
          attendanceStatus = 'early-clock-out';
          totalPresent++; // Still counts as present
        } else if (dayAttendanceStatus === 'partial') {
          attendanceStatus = 'partial';
          totalPresent++; // Still counts as present
        } else {
          attendanceStatus = 'absent';
          totalAbsent++;
        }
        
        totalWorkHours += totalHours;
        
        // Separate regular times from overtime times
        let regularClockInTime = null;
        let regularClockOutTime = null;
        let overtimeClockInTime = null;
        let overtimeClockOutTime = null;
        let overtimeHours = 0;
        
        // Set regular times from regular timesheet
        if (regularTimesheet) {
          regularClockInTime = regularTimesheet.clockIn?.time ? regularTimesheet.clockIn.time.toISOString() : null;
          regularClockOutTime = regularTimesheet.clockOut?.time ? regularTimesheet.clockOut.time.toISOString() : null;
        }
        
        // Set overtime times from overtime timesheet
        if (overtimeTimesheet) {
          overtimeClockInTime = overtimeTimesheet.clockIn?.time ? overtimeTimesheet.clockIn.time.toISOString() : null;
          overtimeClockOutTime = overtimeTimesheet.clockOut?.time ? overtimeTimesheet.clockOut.time.toISOString() : null;
          overtimeHours = overtimeTimesheet.overtimeHours || 0;
        }
        
        attendanceData.push({
          userId: userId,
          userName: userInfo?.name || 'Unknown User',
          userRole: userInfo?.role || 'Unknown',
          department: 'General', // Default department
          clockInTime: regularClockInTime,
          clockOutTime: regularClockOutTime,
          attendanceStatus: attendanceStatus,
          dayAttendanceStatus: dayAttendanceStatus,
          minutesLate: primaryTimesheet.clockIn?.minutesLate || 0,
          minutesEarly: primaryTimesheet.clockOut?.minutesEarly || 0,
          totalWorkHours: totalHours,
          overtimeHours: overtimeHours,
          overtimeClockInTime: overtimeClockInTime,
          overtimeClockOutTime: overtimeClockOutTime,
          isOvertime: isOvertime
        });
      } else {
        // User has no timesheet data for today
        totalAbsent++;
        attendanceData.push({
          userId: userId,
          userName: userInfo?.name || 'Unknown User',
          userRole: userInfo?.role || 'Unknown',
          department: 'General', // Default department
          clockInTime: null,
          clockOutTime: null,
          attendanceStatus: 'absent',
          dayAttendanceStatus: 'absent',
          minutesLate: 0,
          minutesEarly: 0,
          totalWorkHours: 0,
          overtimeHours: 0,
          overtimeClockInTime: null,
          overtimeClockOutTime: null,
          isOvertime: false
        });
      }
    }
    
    const summary = {
      totalStaff: allUsers.length,
      present: totalPresent,
      late: totalLate,
      absent: totalAbsent,
      earlyClockOut: 0,
      partial: 0,
      overtimeCheckin: totalOvertimeCheckin,
      overtimeComplete: totalOvertimeComplete,
      averageWorkHours: allUsers.length > 0 ? totalWorkHours / allUsers.length : 0
    };
    
    const dateString = targetDate.toISOString().split('T')[0];
    console.log(`📊 [QR] Attendance summary for ${dateString}:`, summary);
    console.log(`📊 [QR] Found ${attendanceData.length} staff records, ${totalOvertimeCheckin} overtime check-ins`);
    
    // Return data in the format expected by the frontend
    const responseData = {
      success: true,
      attendanceData: attendanceData,
      summary: summary,
      date: dateString,
      // Also include the data in the format the frontend might expect
      data: {
        attendanceData: attendanceData,
        summary: summary,
        date: dateString
      }
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching all today attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});
    
// @route   GET /api/qr/my-registration-status
// @desc    Get current user's QR registration status
// @access  Private
router.get('/my-registration-status', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    
    // Look specifically for active staff-registration hash
    const staffHash = await StaffHash.findOne({ 
      userId,
      hashType: 'staff-registration',
      isActive: true
    });
    
    console.log(`[QR] Registration status check for user ${userId}:`, {
      found: !!staffHash,
      hashId: staffHash?._id,
      hashValue: staffHash?.uniqueHash?.substring(0, 12) + '...',
      isActive: staffHash?.isActive,
      lastUsed: staffHash?.lastUsed
    });
    
    res.json({
      success: true,
      data: {
        isRegistered: !!staffHash,
        registrationDate: staffHash?.createdAt || null,
        lastUsed: staffHash?.lastUsed || null,
        hashId: staffHash?._id || null
      }
    });
  } catch (error) {
    console.error('Error getting registration status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/qr/staff-registration-status/:userId
// @desc    Get staff member's QR registration status (checks BOTH tables)
// @access  Private
router.get('/staff-registration-status/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check BOTH tables to ensure accurate registration status
    const staffHash = await StaffHash.findOne({ userId });
    
    const DeviceRegistration = require('../models/DeviceRegistration');
    const deviceRegistration = await DeviceRegistration.findOne({ 
      userId: userId,
      isActive: true 
    });
    
    // User is considered registered if they have BOTH StaffHash AND DeviceRegistration
    const isRegistered = !!staffHash && !!deviceRegistration;
    
    console.log(`📊 [RegistrationStatus] User ${userId}:`, {
      hasStaffHash: !!staffHash,
      hasDeviceReg: !!deviceRegistration,
      isRegistered: isRegistered
    });
    
    res.json({
      success: true,
      data: {
        isRegistered: isRegistered,
        registrationDate: staffHash?.createdAt || deviceRegistration?.registeredAt || null,
        hash: staffHash?.uniqueHash || null,
        hasStaffHash: !!staffHash,
        hasDeviceRegistration: !!deviceRegistration
      }
    });
  } catch (error) {
    console.error('Error getting staff registration status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/qr/staff-registration-status/batch
// @desc    Get batch registration status for specific staff members
// @access  Private
router.post('/staff-registration-status/batch', auth, async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required'
      });
    }
    
    // Check actual registration status for each user (BOTH tables)
    const registrationMap = {};
    const DeviceRegistration = require('../models/DeviceRegistration');
    
    for (const userId of userIds) {
      try {
        // Check if user has any active staff registration hashes
        const staffHash = await StaffHash.findOne({ 
          userId: userId,
          hashType: 'staff-registration',
          isActive: true
        });
        
        // Also check DeviceRegistration table
        const deviceRegistration = await DeviceRegistration.findOne({
          userId: userId,
          isActive: true
        });
        
        // User is registered only if they have BOTH
        const isRegistered = !!staffHash && !!deviceRegistration;
        registrationMap[userId] = isRegistered;
        
        if (isRegistered) {
          console.log(`[QR] User ${userId} has active registration: ${staffHash.uniqueHash.substring(0, 12)}...`);
        } else {
          console.log(`[QR] User ${userId} incomplete registration - StaffHash: ${!!staffHash}, DeviceReg: ${!!deviceRegistration}`);
        }
      } catch (error) {
        console.error(`[QR] Error checking registration for user ${userId}:`, error);
        registrationMap[userId] = false;
      }
    }
    
    console.log(`[QR] Batch registration status requested for ${userIds.length} users - found ${Object.values(registrationMap).filter(Boolean).length} registered`);
    
    res.json({
      success: true,
      data: registrationMap
    });
  } catch (error) {
    console.error('Error getting batch registration status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/qr/staff-registration/:userId
// @desc    Generate QR code for staff registration
// @access  Private
router.get('/staff-registration/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const User = require('../models/User');
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if a StaffHash already exists for this user
    let staffHashRecord = await StaffHash.findOne({ userId });
    let isNew = false;
    let hashToUse;

    if (staffHashRecord) {
      // If exists, use the existing hash
      hashToUse = staffHashRecord.uniqueHash;
      console.log(`Existing StaffHash found for user ${userId}. Using hash: ${hashToUse}`);
    } else {
      // If not, generate a new hash and save it
      hashToUse = crypto.randomBytes(16).toString('hex');
      staffHashRecord = new StaffHash({
        userId: userId,
        uniqueHash: hashToUse,
        hashType: 'staff-registration'
      });
      await staffHashRecord.save();
      isNew = true;
      console.log(`New StaffHash generated and saved for user ${userId}. Hash: ${hashToUse}`);
    }
    
    // Generate QR code URL for phone scanning with hash parameter
    // Use IP address instead of localhost so phones can access it
    let frontendUrl = process.env.FRONTEND_URL;
    
    // Check for manual IP override
    const manualIP = process.env.FRONTEND_IP;
    if (manualIP && !frontendUrl) {
      frontendUrl = `http://${manualIP}:5175`;
      console.log(`🔍 [QR Routes] Using manual IP override: ${frontendUrl}`);
    }
    
    if (!frontendUrl) {
      // Auto-detect the best IP address for mobile access
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      let serverIP = 'localhost';
      
      // Priority order for IP selection (prefer private network addresses)
      // Based on the frontend server running on 10.41.144.157, prioritize 10.41.x.x range
      const preferredPatterns = [
        /^10\.41\./,       // 10.41.x.x (current network segment) - highest priority
        /^10\./,           // 10.x.x.x (private range) - your current network
        /^192\.168\./,     // 192.168.x.x (most common private range)
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16-31.x.x (private range)
      ];
      
      // First, try to find a preferred private network address
      for (const pattern of preferredPatterns) {
        for (const interfaceName in networkInterfaces) {
          const interfaces = networkInterfaces[interfaceName];
          for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal && pattern.test(iface.address)) {
              serverIP = iface.address;
              break;
            }
          }
          if (serverIP !== 'localhost') break;
        }
        if (serverIP !== 'localhost') break;
      }
      
      // If no preferred address found, fall back to any non-internal IPv4
      if (serverIP === 'localhost') {
        for (const interfaceName in networkInterfaces) {
          const interfaces = networkInterfaces[interfaceName];
          for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
              serverIP = iface.address;
              break;
            }
          }
          if (serverIP !== 'localhost') break;
        }
      }
      
      // Use backend port 5002 for QR verification
      frontendUrl = `http://${serverIP}:5002`;
      console.log(`🔍 [QR Routes] Auto-detected backend URL: ${frontendUrl}`);
      console.log(`📱 QR codes will point to backend at: ${frontendUrl}`);
    }
    
    // Additional mobile-friendly URL generation with fallback options
    const generateMobileFriendlyUrl = (baseUrl, hash, type, userId) => {
      // Try multiple URL formats for better mobile compatibility
      const urls = [
        `${baseUrl}/verify-qr?hash=${hash}&type=${type}&userId=${userId}`,
        `${baseUrl}/verify-qr?hash=${hash}&type=${type}&userId=${userId}&v=2.0`,
        `${baseUrl}/verify-qr?hash=${hash}&type=${type}&userId=${userId}&mobile=true`
      ];
      
      // Return the first URL (most compatible)
      return urls[0];
    };
    // Use mobile-friendly URL generation
    const qrCodeUrl = generateMobileFriendlyUrl(frontendUrl, hashToUse, 'staff-registration', userId);
    
    console.log('Generated QR Code URL:', qrCodeUrl);
    console.log('QR Code URL length:', qrCodeUrl.length);
    console.log('QR Code generation options:', {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 2,
      width: 512
    });
    
    // Generate QR code with optimized settings for mobile scanning
    const qrCodeImage = await QRCode.toDataURL(qrCodeUrl, {
      errorCorrectionLevel: 'H', // Higher error correction for better mobile scanning
      type: 'image/png',
      quality: 0.92,
      margin: 3, // Increased margin for better scanning
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 512,
      // Additional options for better mobile compatibility
      rendererOpts: {
        quality: 0.92
      }
    });
    
    res.json({
      success: true,
      data: {
        qrCodeDataUrl: qrCodeImage,
        qrCode: qrCodeImage,
        qrData: qrCodeUrl,
        registrationUrl: qrCodeUrl,
        isNew: isNew,
        generatedAt: new Date().toISOString(),
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Error generating staff registration QR:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/qr/mobile-test
// @desc    Test mobile connectivity and QR code generation
// @access  Public (for testing)
router.get('/mobile-test', async (req, res) => {
  try {
    const testUrl = 'http://localhost:5002/verify-qr?hash=test123&type=staff-registration&userId=testuser';
    
    res.json({
      success: true,
      message: 'Mobile connectivity test successful',
      data: {
        serverIP: 'localhost',
        frontendPort: 5175,
        backendPort: 5002,
        testUrl: testUrl,
        timestamp: new Date().toISOString(),
        instructions: [
          '1. Make sure your phone is connected to the same WiFi network',
          '2. Try opening this URL in your phone browser: ' + testUrl,
          '3. If it loads, the QR code should work',
          '4. If it doesn\'t load, check your WiFi connection'
        ]
      }
    });
  } catch (error) {
    console.error('Error in mobile test:', error);
    res.status(500).json({
      success: false,
      message: 'Mobile test failed',
      error: error.message
    });
  }
});

// @route   GET /api/qr/test
// @desc    Test QR code generation for debugging
// @access  Public (for testing)
router.get('/test', async (req, res) => {
  try {
    const testUrl = 'http://localhost:5002/verify-qr?hash=test123&type=staff-registration&userId=testuser';
    
    const qrCodeImage = await QRCode.toDataURL(testUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.92,
      margin: 3,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 512,
      rendererOpts: {
        quality: 0.92
      }
    });
    
    res.json({
      success: true,
      message: 'Test QR code generated successfully',
      data: {
        qrCodeDataUrl: qrCodeImage,
        testUrl: testUrl,
        urlLength: testUrl.length,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating test QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate test QR code',
      error: error.message
    });
  }
});

// @route   GET /api/qr/generate/:hashType
// @desc    Generate QR code for check-in/check-out
// @access  Private
router.get('/generate/:hashType', auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const { hashType } = req.params; // 'qr-checkin' or 'qr-checkout'
    const { location } = req.query;
    
    console.log(`🔍 [QR] Generating ${hashType} QR code for user ${userId}`);
    
    // Use Enhanced QRCodeService to generate advanced QR code
    const enhancedOptions = {
      primaryColor: '#1f2937',
      backgroundColor: '#ffffff',
      width: 300,
      includeAnalytics: true,
      includeBiometric: false,
      metadata: {
        location: location || 'Main Entrance',
        version: '2.0',
        features: ['enhanced', 'analytics', 'offline']
      }
    };
    
    const result = await EnhancedQRCodeService.generateEnhancedQRCode(
      userId, 
      hashType.replace('qr-', ''), // Convert 'qr-checkin' to 'checkin'
      enhancedOptions
    );
    
    if (result.qrCode) {
      res.json({
        success: true,
        data: {
          qrCodeDataUrl: result.qrCode,
          qrCode: result.qrCode,
          qrData: result.url,
          registrationUrl: result.url,
          user: result.user,
          hash: result.hash,
          location: location || 'Main Entrance'
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to generate QR code'
      });
    }
  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/qr/deactivate-device/:userId
// @desc    Deactivate device registration for a staff member (clears ALL device data)
// @access  Private
router.delete('/deactivate-device/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const mongoose = require('mongoose');
    
    console.log(`🧹 [ClearDevice] Clearing all device registrations for user: ${userId}`);
    
    // Convert userId to ObjectId for MongoDB query
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (e) {
      console.error('❌ [ClearDevice] Invalid userId format:', userId);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }
    
    // Remove the staff hash record for this user (try both string and ObjectId)
    const staffHashResult = await StaffHash.deleteMany({ 
      $or: [
        { userId: userId },
        { userId: userObjectId }
      ]
    });
    console.log(`🧹 [ClearDevice] Cleared ${staffHashResult.deletedCount} staff hashes`);
    
    // Also remove from DeviceRegistration table (try both string and ObjectId)
    const DeviceRegistration = require('../models/DeviceRegistration');
    const deviceRegResult = await DeviceRegistration.deleteMany({ 
      $or: [
        { userId: userId },
        { userId: userObjectId }
      ]
    });
    console.log(`🧹 [ClearDevice] Cleared ${deviceRegResult.deletedCount} device registrations`);
    
    const totalCleared = staffHashResult.deletedCount + deviceRegResult.deletedCount;
    
    console.log(`🧹 [ClearDevice] Total cleared: ${totalCleared} records for user ${userId}`);
    
    if (totalCleared > 0) {
      res.json({
        success: true,
        message: `Device cleared successfully! Removed ${totalCleared} registration(s).`,
        details: {
          staffHashes: staffHashResult.deletedCount,
          deviceRegistrations: deviceRegResult.deletedCount,
          total: totalCleared
        }
      });
    } else {
      console.warn(`⚠️ [ClearDevice] No registrations found for user ${userId}`);
      res.json({
        success: true,
        message: 'No device registration found for this user',
        details: {
          staffHashes: 0,
          deviceRegistrations: 0,
          total: 0
        }
      });
    }
  } catch (error) {
    console.error('❌ [ClearDevice] Error clearing device:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/qr/clear-all-registrations
// @desc    Clear all staff registrations and device registrations (for admin use)
// @access  Private
router.delete('/clear-all-registrations', auth, async (req, res) => {
  try {
    console.log('🧹 [ClearAllRegistrations] Starting to clear all device registrations...');
    
    // Clear staff hashes
    const staffHashResult = await StaffHash.deleteMany({});
    console.log(`🧹 [ClearAllRegistrations] Cleared ${staffHashResult.deletedCount} staff hashes`);
    
    // Clear device registrations
    const DeviceRegistration = require('../models/DeviceRegistration');
    const deviceRegResult = await DeviceRegistration.deleteMany({});
    console.log(`🧹 [ClearAllRegistrations] Cleared ${deviceRegResult.deletedCount} device registrations`);
    
    const totalCleared = staffHashResult.deletedCount + deviceRegResult.deletedCount;
    
    console.log(`🧹 [ClearAllRegistrations] Total cleared: ${totalCleared} records`);
    
    res.json({
      success: true,
      message: `Successfully cleared all device registrations! Cleared ${totalCleared} total records.`,
      details: {
        staffHashes: staffHashResult.deletedCount,
        deviceRegistrations: deviceRegResult.deletedCount,
        total: totalCleared
      }
    });
  } catch (error) {
    console.error('Error clearing registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/qr/attendance-test
// @desc    Test endpoint for attendance data
// @access  Public
router.get('/attendance-test', async (req, res) => {
  try {
    const StaffAttendance = require('../models/StaffAttendance');
    const User = require('../models/User');
    
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    console.log('🧪 [TEST] Testing attendance endpoint...');
    
    // Get all users
    const allUsers = await User.find({}).select('firstName lastName username role');
    console.log(`🧪 [TEST] Found ${allUsers.length} users in database`);
    
    // Get today's REAL attendance records (filter out test data)
    const todayAttendance = await StaffAttendance.find({
      checkInTime: { $gte: todayStart, $lte: todayEnd },
      // Filter out test data - only show real attendance records
      $and: [
        { notes: { $not: { $regex: /Regular attendance|populate|test/i } } },
        { 
          $or: [
            { notes: { $exists: false } },
            { notes: { $regex: /Real|QR code|Manual/i } }
          ]
        }
      ]
    });
    
    console.log(`🧪 [TEST] Found ${todayAttendance.length} attendance records and ${allUsers.length} users`);
      
      res.json({
        success: true,
      message: 'Test endpoint working',
      data: {
        attendanceRecords: todayAttendance.length,
        users: allUsers.length,
        today: today,
        hasData: todayAttendance.length > 0
      }
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/qr/test
// @desc    Test endpoint for QR functionality
// @access  Public
router.get('/test', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'QR test endpoint working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in QR test endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/qr/test
// @desc    Test API connectivity for mobile devices
// @access  Public
router.get('/test', async (req, res) => {
  try {
    const deviceInfo = {
      userAgent: req.headers['user-agent'] || 'Unknown',
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString(),
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(req.headers['user-agent'] || '')
    };
    
    console.log('🔍 API test endpoint called:', deviceInfo);
    
    res.json({
      success: true,
      message: 'API is reachable',
      timestamp: new Date().toISOString(),
      deviceInfo: deviceInfo
    });
  } catch (error) {
    console.error('API test error:', error);
    res.status(500).json({
      success: false,
      message: 'API test failed',
      error: error.message
    });
  }
});

// @route   POST /api/qr/verify-url
// @desc    Verify QR URL and process registration
// @access  Public
router.post('/verify-url', async (req, res) => {
  const SecurityIncident = require('../models/SecurityIncident');
  
  try {
    const { type, userId, hash, timestamp, deviceFingerprint, rawFingerprint, location, deviceInfo } = req.body;
    
    console.log(`🔒 [SECURITY] Verify-URL request:`, { 
      type, 
      userId, 
      hash: hash?.substring(0, 20),
      deviceFingerprint: deviceFingerprint?.substring(0, 20),
      location: location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'none'
    });
    
    // ENHANCED SECURITY: Verify device registration for check-in/check-out
    if (type === 'checkin' || type === 'checkout' || type === 'qr-checkin' || type === 'qr-checkout') {
      // NEW: Check DeviceRegistration table for proper device validation
      const DeviceRegistration = require('../models/DeviceRegistration');
      const crypto = require('crypto');
      
      // SECURITY: Derive device fingerprint on server from headers to prevent spoofing
      const userAgent = req.headers['user-agent'] || 'unknown';
      const acceptLanguage = req.headers['accept-language'] || 'unknown';
      const acceptEncoding = req.headers['accept-encoding'] || 'unknown';
      
      // Generate the same set of fingerprints as registration (full/lite/ultra)
      const serverDeviceFingerprint = crypto.createHash('sha256')
        .update(userAgent + acceptLanguage + acceptEncoding + 'browser-device-fingerprint')
        .digest('hex');
      const deviceFingerprintLite = crypto.createHash('sha256')
        .update(userAgent + acceptLanguage + 'browser-device-fingerprint-lite')
        .digest('hex');
      const deviceFingerprintUltra = crypto.createHash('sha256')
        .update(userAgent + 'browser-device-fingerprint-ultra')
        .digest('hex');
      
      console.log('🔐 [SECURITY] Server fingerprints', {
        full: serverDeviceFingerprint.substring(0, 20) + '...',
        lite: deviceFingerprintLite.substring(0, 20) + '...',
        ultra: deviceFingerprintUltra.substring(0, 20) + '...'
      });
      
      // ENHANCED: Check if THIS specific device is registered to this user (any variant)
      // Also prevent multiple active registrations per user
      const deviceRegistration = await DeviceRegistration.findOne({
        userId: userId,
        deviceFingerprint: { $in: [serverDeviceFingerprint, deviceFingerprintLite, deviceFingerprintUltra] },
        isActive: true
      });

      // Check for multiple active registrations for this user (shouldn't happen with new logic)
      const userActiveRegistrations = await DeviceRegistration.find({
        userId: userId,
        isActive: true
      });

      console.log(`🔍 [SECURITY] User ${userId} has ${userActiveRegistrations.length} active device registration(s)`);

      if (userActiveRegistrations.length > 1) {
        console.log(`⚠️ [SECURITY] User ${userId} has multiple active registrations - cleaning up`);

        // Keep only the most recent registration, deactivate others
        userActiveRegistrations.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

        for (let i = 1; i < userActiveRegistrations.length; i++) {
          userActiveRegistrations[i].isActive = false;
          await userActiveRegistrations[i].save();
          console.log(`  ❌ Deactivated duplicate registration: ${userActiveRegistrations[i]._id}`);
        }
      }

      if (!deviceRegistration) {
        console.log(`❌ [SECURITY] Check-in/out blocked - Device not registered for user: ${userId}`);
        console.log('   Attempted server fingerprints:', {
          fullTried: serverDeviceFingerprint.substring(0, 20) + '...',
          liteTried: deviceFingerprintLite.substring(0, 20) + '...',
          ultraTried: deviceFingerprintUltra.substring(0, 20) + '...'
        });

        const User = require('../models/User');
        const user = await User.findById(userId).select('firstName lastName email');
        const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';

        await SecurityIncident.create({
          userId: userId,
          incidentType: 'UNREGISTERED_DEVICE',
          severity: 'HIGH',
          description: `Attempted ${type} from unregistered device`,
          details: {
            deviceFingerprint: serverDeviceFingerprint,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            attemptedAction: type,
            activeRegistrationsCount: userActiveRegistrations.length
          }
        });

        return res.status(403).json({
          success: false,
          message: `Device not registered for ${userName}. Please register your device first using the QR code registration system.`,
          error: 'DEVICE_NOT_REGISTERED',
          code: 'DEVICE_NOT_REGISTERED'
        });
      }

      console.log(`✅ [SECURITY] Device registration verified for user: ${userId}`);

      // Update device last used time
      deviceRegistration.lastUsed = new Date();
      await deviceRegistration.save();
      
      // Get the registered device data for this user (for backward compatibility with location check)
      const staffHash = await StaffHash.findOne({ 
        userId: userId,
        hashType: 'staff-registration',
        isActive: true 
      });
      
      if (staffHash) {
        // SECURITY CHECK 2: Location Verification (if configured and enabled)
        const CLINIC_LOCATION = {
          latitude: parseFloat(process.env.CLINIC_LATITUDE || '9.0192'),
          longitude: parseFloat(process.env.CLINIC_LONGITUDE || '38.7525')
        };
        const MAX_DISTANCE_METERS = parseInt(process.env.MAX_CHECKIN_DISTANCE || '100');
        
        if (location && location.latitude && location.longitude) {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            CLINIC_LOCATION.latitude,
            CLINIC_LOCATION.longitude
          );
          
          console.log(`📍 [SECURITY] Location check: ${distance.toFixed(0)}m from clinic (max: ${MAX_DISTANCE_METERS}m)`);
          
          if (distance > MAX_DISTANCE_METERS) {
            console.error(`🚨 [SECURITY] Location violation: ${distance.toFixed(0)}m away (max: ${MAX_DISTANCE_METERS}m)`);
            
            // Log security incident
            await SecurityIncident.create({
              userId: userId,
              incidentType: 'LOCATION_VIOLATION',
              severity: 'MEDIUM',
              description: `Attempted ${type} from ${distance.toFixed(0)}m away`,
              details: {
                expectedLocation: CLINIC_LOCATION,
                actualLocation: location,
                distance: distance,
                maxAllowedDistance: MAX_DISTANCE_METERS,
                attemptedAction: type
              }
            });
            
            return res.status(403).json({
              success: false,
              message: `📍 Location Error: You are ${distance.toFixed(0)} meters away from the clinic. You must be within ${MAX_DISTANCE_METERS} meters to check in/out.`,
              error: 'LOCATION_TOO_FAR',
              data: {
                distance: distance,
                maxDistance: MAX_DISTANCE_METERS
              }
            });
          }
          
          console.log(`✅ [SECURITY] Location verified (${distance.toFixed(0)}m from clinic)`);
        } else {
          console.warn(`⚠️ [SECURITY] Location data not available for verification`);
        }
      }
    }
    
    // Helper function for distance calculation
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371e3; // Earth radius in meters
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    }
    
    // Continue with verification after security checks passed
    // Support both parameter formats for backward compatibility
    // Note: type, userId, hash already extracted at the top of the try block
    
    console.log(`🔍 QR URL verification request:`, { type, userId, hash, timestamp });
    console.log(`🔍 Full request body:`, req.body);
    console.log(`🔍 Request headers:`, req.headers);
    console.log(`🔍 Looking for hash with type:`, type);
    
    // Validate required parameters
    if (!type || !userId || !hash) {
      console.log('❌ Missing required parameters:', { 
        type: !!type, 
        userId: !!userId, 
        hash: !!hash,
        received: { type, userId, hash }
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: type, userId, hash',
        received: { type, userId, hash }
      });
    }
    
    // Check if user exists
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if hash exists and is valid
    console.log(`🔍 Searching for hash:`, { userId, hash, type });
    
    // Use utility function for consistent type mapping
    const { mapUrlTypeToDbType, getAllPossibleTypes, isValidQrType } = require('../utils/qrTypeUtils');
    
    // Validate type
    if (!isValidQrType(type)) {
      console.log(`❌ Invalid QR type:`, type);
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code type'
      });
    }
    
    // Get all possible types for this QR code (for backward compatibility)
    const possibleTypes = getAllPossibleTypes(type);
    console.log(`🔍 Possible types for ${type}:`, possibleTypes);
    
    // Try to find hash with all possible types
    let staffHash = null;
    for (const possibleType of possibleTypes) {
      staffHash = await StaffHash.findOne({ 
        userId: userId, 
        uniqueHash: hash,
        hashType: possibleType
      });
      
      if (staffHash) {
        console.log(`✅ Found hash with type:`, possibleType);
        break;
      }
    }
    
    // For enhanced QR codes (check-in/check-out), if no exact hash match found,
    // look for the user's staff registration hash instead
    const isCheckInOutOperation = type === 'checkin' || type === 'checkout' || type === 'qr-checkin' || type === 'qr-checkout';
    if (!staffHash && isCheckInOutOperation) {
      console.log(`🔍 [QR] No exact hash match found for ${type}, looking for staff registration hash...`);
      staffHash = await StaffHash.findOne({ 
        userId: userId, 
        hashType: 'staff-registration',
        isActive: true
      });
      
      if (staffHash) {
        console.log(`✅ [QR] Found staff registration hash for enhanced QR code verification`);
        // Store the original URL hash for reference
        staffHash.originalUrlHash = hash;
        staffHash.enhancedOperationType = type;
      } else {
        // SECURITY FIX: Do NOT auto-create staff registration hash
        // Device must be properly registered first
        console.log(`❌ [SECURITY] No staff registration hash found - device not properly registered`);
        
        return res.status(403).json({
          success: false,
          message: 'Device not registered. Please register your device first by scanning the staff registration QR code.',
          error: 'NO_STAFF_REGISTRATION',
          code: 'DEVICE_NOT_REGISTERED'
        });
        
        /* REMOVED: Auto-creation of staff hash bypasses security
        const crypto = require('crypto');
        const newHash = crypto.createHash('sha256')
          .update(`${userId}-staff-registration-${Date.now()}`)
          .digest('hex');
        
        staffHash = new StaffHash({
          userId: userId,
          uniqueHash: newHash,
          hashType: 'staff-registration',
          isActive: true,
          usageCount: 0,
          createdAt: new Date(),
          lastUsed: new Date()
        });
        
        await staffHash.save();
        console.log(`✅ [QR] Created new staff registration hash: ${newHash.substring(0, 12)}...`);
        
        // Store the original URL hash for reference
        staffHash.originalUrlHash = hash;
        staffHash.enhancedOperationType = type;
        */
      }
    }
    
    console.log(`🔍 Found staffHash:`, staffHash ? {id: staffHash._id, type: staffHash.hashType, isActive: staffHash.isActive} : 'Not found');
    
    if (!staffHash) {
      console.log(`❌ Hash not found in database`);
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired QR code'
      });
    }
    
    // Update hash usage and mark as active
    staffHash.lastUsed = new Date();
    staffHash.usageCount = (staffHash.usageCount || 0) + 1;
    staffHash.isActive = true;
    
    // Store device fingerprint and location for staff registration
    if (type === 'staff-registration') {
      if (deviceFingerprint) {
        staffHash.deviceFingerprint = deviceFingerprint;
        staffHash.rawFingerprint = rawFingerprint;
        console.log(`🔒 [SECURITY] Device fingerprint stored: ${deviceFingerprint.substring(0, 20)}...`);
      }
      
      if (location) {
        staffHash.registrationLocation = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          timestamp: new Date()
        };
        console.log(`📍 [SECURITY] Registration location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
      }
    }
    
    await staffHash.save();
    
    if (type === 'staff-registration') {
      console.log(`✅ [QR] Device registered successfully for user ${userId}, hash: ${staffHash.uniqueHash.substring(0, 12)}...`);
    } else {
      console.log(`✅ [QR] ${type} QR code verified for user ${userId}, hash: ${staffHash.uniqueHash.substring(0, 12)}...`);
    }
    
    let responseData = {
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role
      },
      hash: {
        id: staffHash._id,
        value: staffHash.uniqueHash,
        type: staffHash.hashType,
        isActive: staffHash.isActive,
        usageCount: staffHash.usageCount,
        // For enhanced QR codes, include the original URL hash and operation type
        originalHash: isCheckInOutOperation ? hash : staffHash.uniqueHash,
        enhancedOperationType: staffHash.enhancedOperationType || null,
        isEnhancedQR: isCheckInOutOperation
      },
      verifiedAt: new Date().toISOString()
    };
    
    // Normalize the type for processing (outside the try block for scope)
    const normalizedType = type === 'qr-checkin' ? 'checkin' : type === 'qr-checkout' ? 'checkout' : type;
    
    // If this is a check-in/check-out QR code, process attendance
    if (isCheckInOutOperation) {
      try {
        console.log(`🔄 [QR] Processing ${normalizedType} for user ${userId}...`);
        console.log(`🔍 [QR] StaffHash found with type: ${staffHash.hashType}`);
        
        // Use EnhancedQRCodeService to process the attendance directly
        const EnhancedQRCodeService = require('../services/enhancedQRCodeService');
        const deviceInfo = {
          userAgent: req.headers['user-agent'] || 'Unknown',
          ipAddress: req.ip || req.connection.remoteAddress,
          timestamp: new Date().toISOString(),
          hashType: staffHash.hashType, // Include the actual hash type for debugging
          originalType: type
        };
        
        let attendanceResult;
        if (normalizedType === 'checkin') {
          attendanceResult = await EnhancedQRCodeService.processEnhancedCheckIn(userId, deviceInfo, {});
        } else if (normalizedType === 'checkout') {
          attendanceResult = await EnhancedQRCodeService.processEnhancedCheckOut(userId, deviceInfo, {});
        }
        
        if (attendanceResult && attendanceResult.success) {
          console.log(`✅ [QR] ${normalizedType} processed successfully for user ${userId}`);
          console.log(`📊 [QR] Attendance data:`, {
            clockInTime: attendanceResult.data?.clockInTime,
            location: attendanceResult.data?.location,
            attendanceStatus: attendanceResult.data?.attendanceStatus
          });
          responseData.currentStatus = attendanceResult.data;
          responseData.attendanceProcessed = true;
          responseData.action = normalizedType;
        } else {
          console.log(`❌ [QR] Failed to process ${normalizedType} for user ${userId}: ${attendanceResult?.message || 'Unknown error'}`);
          responseData.attendanceProcessed = false;
          responseData.attendanceError = attendanceResult?.message || 'Unknown error';
        }
      } catch (error) {
        console.error(`❌ [QR] Error processing ${normalizedType} for user ${userId}:`, error);
        console.error(`❌ [QR] Error stack:`, error.stack);
        responseData.attendanceProcessed = false;
        responseData.attendanceError = error.message;
      }
    }
    
    res.json({
      success: true,
      message: type === 'staff-registration' ? 'Device registered successfully' : `${normalizedType} processed successfully`,
      data: responseData
    });
  } catch (error) {
    console.error('Error verifying QR URL:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/qr/register-device
// @desc    Register device for staff member
// @access  Public
router.post('/register-device', async (req, res) => {
  try {
    const { userId, hash, deviceInfo } = req.body;
    
    console.log(`📱 Device registration request:`, { userId, hash, deviceInfo });
    
    // Validate required parameters
    if (!userId || !hash) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: userId, hash'
      });
    }
    
    // Check if user exists
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if hash exists and is valid
    const staffHash = await StaffHash.findOne({ 
      userId: userId, 
      uniqueHash: hash,
      hashType: 'staff-registration'
    });
    
    if (!staffHash) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired QR code'
      });
    }
    
    // Update device info and mark as registered
    staffHash.deviceInfo = {
      userAgent: deviceInfo?.userAgent || req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      lastGeneratedAt: new Date()
    };
    staffHash.isActive = true;
    staffHash.lastUsed = new Date();
    staffHash.usageCount = (staffHash.usageCount || 0) + 1;
    await staffHash.save();
    
    res.json({
      success: true,
      message: 'Device registered successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          role: user.role
        },
        device: {
          registeredAt: new Date().toISOString(),
          hash: staffHash.uniqueHash,
          isActive: staffHash.isActive
        }
      }
    });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;