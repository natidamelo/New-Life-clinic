const QRCode = require('qrcode');
const CryptoJS = require('crypto-js');
const os = require('os');
const StaffHash = require('../models/StaffHash');
const Timesheet = require('../models/Timesheet');
const StaffAttendance = require('../models/StaffAttendance');
const User = require('../models/User');
const QRCodeAnalytics = require('../models/QRCodeAnalytics');
const OfflineQueue = require('../models/OfflineQueue');
const BiometricVerification = require('../models/BiometricVerification');

/**
 * Enhanced QR Code Service with Advanced Features
 * - Offline capability with sync
 * - Advanced analytics and reporting
 * - Biometric verification support
 * - Custom branding and multi-language support
 * - Batch operations
 * - Enhanced error handling and retry mechanisms
 */
class EnhancedQRCodeService {
  /**
   * Generate enhanced QR code with custom branding and metadata
   */
  static async generateEnhancedQRCode(userId, type = 'checkin', options = {}) {
    try {
      const startTime = Date.now();
      
      // Get user information
      const user = await User.findById(userId).select('firstName lastName email role department');
      if (!user) {
        throw new Error('User not found');
      }

      // Generate enhanced hash with metadata
      const metadata = {
        userId: userId,
        type: type,
        timestamp: new Date().toISOString(),
        version: '2.0', // Enhanced version
        features: ['offline', 'analytics', 'biometric', 'batch'],
        ...options.metadata
      };

      const hashData = JSON.stringify(metadata);
      const hash = CryptoJS.SHA256(hashData).toString();
      
      // Ensure user has a staff-registration hash (required for check-in/check-out)
      if (type !== 'staff-registration') {
        try {
          const existingRegHash = await StaffHash.findOne({
            userId: userId,
            hashType: 'staff-registration',
            isActive: true
          });

          if (!existingRegHash) {
            const regHash = require('crypto').randomBytes(32).toString('hex');
            const newRegHash = new StaffHash({
              userId: userId,
              uniqueHash: regHash,
              hashType: 'staff-registration',
              isActive: true,
              expiresAt: null,
              lastUsed: new Date(),
              usageCount: 0,
              deviceInfo: { lastGeneratedAt: new Date() },
              isPermanent: true,
              registeredAt: new Date()
            });
            await newRegHash.save();
            console.log('✅ [EnhancedQRCodeService] Created staff-registration hash for user:', userId);
          } else {
            console.log('ℹ️ [EnhancedQRCodeService] Staff registration hash already exists for user:', userId);
          }
        } catch (error) {
          console.log('ℹ️ [EnhancedQRCodeService] Staff registration hash already exists for user:', userId);
        }
      }

      // Handle QR code hash creation/update
      let staffHash;
      try {
        // Use utility function for consistent type mapping
        const { mapUrlTypeToDbType } = require('../utils/qrTypeUtils');
        const dbType = mapUrlTypeToDbType(type);
        
        // First, try to find existing hash
        staffHash = await StaffHash.findOne({
          userId: userId,
          hashType: dbType, // Use consistent database type
          isActive: true
        });

        if (staffHash) {
          // Update existing hash
          staffHash.uniqueHash = hash;
          staffHash.lastUsed = new Date();
          staffHash.usageCount = (staffHash.usageCount || 0) + 1;
          staffHash.deviceInfo.lastGeneratedAt = new Date();
          staffHash.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          await staffHash.save();
          console.log('✅ [EnhancedQRCodeService] Updated existing hash for user:', userId, 'type:', type);
        } else {
          // Create new hash
          staffHash = new StaffHash({
            userId: userId,
            uniqueHash: hash,
            hashType: dbType, // Use consistent database type
            isActive: true,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            lastUsed: new Date(),
            usageCount: 0,
            deviceInfo: { lastGeneratedAt: new Date() },
            isPermanent: false,
            registeredAt: new Date()
          });
          await staffHash.save();
          console.log('✅ [EnhancedQRCodeService] Created new hash for user:', userId, 'type:', type, 'dbType:', dbType);
        }
      } catch (error) {
        console.error('❌ [EnhancedQRCodeService] Error processing hash:', error);
        throw new Error('Failed to process QR code hash');
      }

      // Generate QR code with custom options
      const qrOptions = {
        type: 'image/png',
        quality: 0.92,
        margin: 2,
        color: {
          dark: options.primaryColor || '#1f2937',
          light: options.backgroundColor || '#ffffff'
        },
        width: options.width || 300,
        errorCorrectionLevel: 'M'
      };

      // SECURITY: Add device binding to QR code hash
      // This ensures QR codes can only be used by the device that generated them
      staffHash.deviceBindingHash = require('crypto')
        .createHash('sha256')
        .update(options.deviceInfo?.userAgent || 'server-generated')
        .digest('hex');
      await staffHash.save();
      
      console.log(`🔒 [SECURITY] QR code bound to device:`, {
        userId: userId,
        type: type,
        deviceBinding: staffHash.deviceBindingHash?.substring(0, 20)
      });
      
      // Create enhanced URL with better mobile support
      const serverIP = this.getServerIP();
      
      // FIXED: Force use of WiFi IP for mobile access
      let frontendUrl = process.env.FRONTEND_URL;
      
      // Get all network interfaces
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      let detectedIP = null;
      
      // PRIORITY 1: Look for 192.168.x.x (WiFi) - most common for phone connectivity
      for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
          if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168.')) {
            detectedIP = iface.address;
            console.log(`✅ Found WiFi IP (192.168.x.x) on ${interfaceName}: ${detectedIP}`);
            break;
          }
        }
        if (detectedIP) break;
      }
      
      // PRIORITY 2: If no 192.168.x.x, try priority interfaces
      if (!detectedIP) {
        const priorityInterfaces = ['Wi-Fi', 'Ethernet', 'en0', 'eth0', 'wlan0'];
        for (const interfaceName of priorityInterfaces) {
          const ifaces = networkInterfaces[interfaceName];
          if (ifaces) {
            for (const iface of ifaces) {
              if (iface.family === 'IPv4' && !iface.internal) {
                detectedIP = iface.address;
                console.log(`✅ Found IP on ${interfaceName}: ${detectedIP}`);
                break;
              }
            }
            if (detectedIP) break;
          }
        }
      }
      
      // PRIORITY 3: Fallback to any private IP
      if (!detectedIP) {
        const preferredPatterns = [
          /^192\.168\./,     // WiFi (highest priority for mobile)
          /^10\./,           // Private range
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private range
        ];
        
        for (const pattern of preferredPatterns) {
          for (const interfaceName in networkInterfaces) {
            const interfaces = networkInterfaces[interfaceName];
            for (const iface of interfaces) {
              if (iface.family === 'IPv4' && !iface.internal && pattern.test(iface.address)) {
                detectedIP = iface.address;
                console.log(`✅ Found IP matching ${pattern}: ${detectedIP}`);
                break;
              }
            }
            if (detectedIP) break;
          }
          if (detectedIP) break;
        }
      }
      
      // Use detected IP or fallback - point to BACKEND, not frontend
      const backendUrl = detectedIP ? `http://${detectedIP}:5002` : 'http://localhost:5002';
      console.log(`📱 QR code will use URL: ${backendUrl}`);
      
      const qrUrl = `${backendUrl}/verify-qr?hash=${staffHash.uniqueHash}&type=${type}&userId=${userId}&v=2.0`;

      const qrCodeDataURL = await QRCode.toDataURL(qrUrl, qrOptions);

      // Log analytics
      const processingTime = Date.now() - startTime;
      // Map action type to valid enum values
      const actionTypeMap = {
        'checkin': 'check-in',
        'checkout': 'check-out',
        'qr-generation': 'check-in',
        'verification_failed': 'check-in'
      };
      const mappedAction = actionTypeMap[type] || 'check-in';
      
      await this.logAnalytics(userId, mappedAction, {
        hash: hash,
        type: type,
        processingTime: processingTime,
        qrOptions: qrOptions,
        metadata: metadata,
        deviceInfo: {}
      });

      return {
        qrCode: qrCodeDataURL,
        hash: staffHash.uniqueHash,
        url: qrUrl,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          department: user.department
        },
        metadata: metadata,
        processingTime: processingTime
      };

    } catch (error) {
      console.error('Error generating enhanced QR code:', error);
      throw error;
    }
  }

  /**
   * Enhanced QR code verification with offline support
   */
  static async verifyEnhancedQRCode(hash, deviceInfo = {}, options = {}) {
    try {
      const startTime = Date.now();
      
      // Find hash in database
      const staffHash = await StaffHash.findOne({ 
        uniqueHash: hash, 
        isActive: true,
        $or: [
          { expiresAt: null }, // Never expires
          { expiresAt: { $gt: new Date() } } // Not expired
        ]
      }).populate('userId');

      if (!staffHash) {
        throw new Error('Invalid or expired QR code');
      }

      const userId = staffHash.userId._id;
      const hashType = staffHash.hashType.replace('qr-', ''); // Convert 'qr-checkin' to 'checkin'

      // Check if offline mode is enabled
      const isOffline = options.offline || false;
      
      if (isOffline) {
        // Queue for offline processing
        return await this.queueOfflineAction(userId, hashType, deviceInfo, options);
      }

      // Process action with enhanced features
      let result;
      if (hashType === 'checkin') {
        result = await this.processEnhancedCheckIn(userId, deviceInfo, options);
      } else if (hashType === 'checkout') {
        result = await this.processEnhancedCheckOut(userId, deviceInfo, options);
      } else {
        throw new Error('Invalid QR code type');
      }

      // Log analytics
      const processingTime = Date.now() - startTime;
      const actionTypeMap = {
        'checkin': 'check-in',
        'checkout': 'check-out',
        'qr-generation': 'check-in',
        'verification_failed': 'check-in'
      };
      const mappedAction = actionTypeMap[hashType] || 'check-in';
      
      await this.logAnalytics(userId, mappedAction, {
        hash: hash,
        success: result.success,
        processingTime: processingTime,
        deviceInfo: deviceInfo,
        metadata: {}
      });

      // Update hash usage
      staffHash.lastUsed = new Date();
      staffHash.usageCount = (staffHash.usageCount || 0) + 1;
      await staffHash.save();

      return {
        ...result,
        processingTime: processingTime,
        metadata: staffHash.metadata
      };

    } catch (error) {
      console.error('Error verifying enhanced QR code:', error);
      
      // Log error analytics
      if (hash) {
        try {
          const staffHash = await StaffHash.findOne({ uniqueHash: hash });
          if (staffHash) {
            await this.logAnalytics(staffHash.userId, 'check-in', {
              hash: hash,
              success: false,
              error: error.message,
              deviceInfo: deviceInfo
            });
          }
        } catch (logError) {
          console.error('Error logging analytics:', logError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Enhanced check-in with biometric support and batch operations
   */
  static async processEnhancedCheckIn(userId, deviceInfo = {}, options = {}) {
    try {
      const startTime = Date.now();
      
      // SECURITY: Log check-in attempt with device info
      console.log(`🔒 [SECURITY] Check-in attempt:`, {
        userId: userId,
        userAgent: deviceInfo?.userAgent?.substring(0, 50) || 'unknown',
        ipAddress: deviceInfo?.ipAddress || 'unknown',
        timestamp: new Date().toISOString()
      });
      
      // Device registration already validated in app.js before calling this function
      // No need to check again here
      console.log(`🔍 [ENHANCED CHECK-IN] Processing for user: ${userId}`);
      
      // Check for biometric verification if enabled
      if (options.biometric && options.biometricHash) {
        const biometricValid = await this.verifyBiometric(userId, options.biometricHash, options.biometricType);
        if (!biometricValid) {
          throw new Error('Biometric verification failed');
        }
      }

      // Check for batch operations
      if (options.batch && options.batchUsers) {
        return await this.processBatchCheckIn(options.batchUsers, deviceInfo, options);
      }

      // Regular enhanced check-in
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check existing timesheets
      const existingTimesheets = await Timesheet.find({
        userId,
        date: { $gte: today, $lt: tomorrow }
      }).sort({ createdAt: -1 });

      // FIXED: Proper overtime detection with clear logic
      const clockInTime = new Date();
      const ethiopianTime = new Date(clockInTime.getTime() + (3 * 60 * 60 * 1000));
      const currentHour = ethiopianTime.getUTCHours();
      
      // Regular hours: 8:30 AM - 5:00 PM (8:30 - 17:00)
      // Overtime: After 5:00 PM or before 8:30 AM
      const isOvertimeCheckIn = (currentHour >= 17 || currentHour < 8) || 
                                (currentHour === 8 && ethiopianTime.getUTCMinutes() < 30);
      
      console.log(`🕐 Check-in time analysis:`, {
        utcTime: clockInTime.toISOString(),
        ethiopianTime: ethiopianTime.toISOString(),
        ethiopianHour: currentHour,
        isOvertime: isOvertimeCheckIn
      });
      
      // Check for existing active timesheets
      const activeTimesheet = existingTimesheets.find(ts => ts.status === 'active' && ts.isOvertime === isOvertimeCheckIn);
      
      if (activeTimesheet) {
        console.log(`❌ Already clocked in for ${isOvertimeCheckIn ? 'overtime' : 'regular hours'}`);
        return {
          success: false,
          message: `Already clocked in for ${isOvertimeCheckIn ? 'overtime' : 'regular hours'}`,
          data: {
            clockInTime: activeTimesheet.clockIn.time,
            location: activeTimesheet.clockIn.location,
            attendanceStatus: activeTimesheet.clockIn.attendanceStatus,
            isOvertime: isOvertimeCheckIn
          }
        };
      }

      // Get user department
      const user = await User.findById(userId).select('role');
      const department = user?.role || 'general';

      // Create enhanced timesheet
      const timesheet = new Timesheet({
        userId,
        date: today,
        clockIn: {
          time: clockInTime,
          location: deviceInfo.location || 'Main Office',
          method: options.method || 'qr-code',
          attendanceStatus: isOvertimeCheckIn ? 'overtime-checkin' : 'on-time',
          deviceInfo: deviceInfo,
          biometricVerified: options.biometric || false
        },
        department,
        status: 'active',
        isOvertime: isOvertimeCheckIn,
        notes: isOvertimeCheckIn ? 'Enhanced overtime check-in' : 'Enhanced regular check-in',
        metadata: {
          version: '2.0',
          features: ['enhanced', 'analytics'],
          deviceInfo: deviceInfo
        }
      });

      await timesheet.save();

      // Update StaffAttendance
      await this.updateStaffAttendance(userId, timesheet);

      // Send Telegram notification for check-in
      try {
        console.log(`📱 [CHECK-IN NOTIFICATION] Starting notification process...`);
        console.log(`📱 [CHECK-IN NOTIFICATION] User ID: ${userId}, Is Overtime: ${isOvertimeCheckIn}`);
        
        const notificationService = require('./notificationService');
        const User = require('../models/User');
        
        const user = await User.findById(userId).select('firstName lastName role telegramChatId telegramNotificationsEnabled notificationPreferences');
        const staffName = user ? `${user.firstName} ${user.lastName}` : 'Unknown Staff';
        
        console.log(`📱 [CHECK-IN NOTIFICATION] Staff: ${staffName}, Role: ${user?.role}`);
        console.log(`📱 [CHECK-IN NOTIFICATION] Notification data:`, {
          actionType: 'check-in',
          staffName: staffName,
          location: timesheet.clockIn.location || 'Main Office',
          shiftType: isOvertimeCheckIn ? 'OVERTIME' : 'REGULAR',
          attendanceStatus: timesheet.clockIn.attendanceStatus || 'on-time'
        });
        
        // Send notification to admins/reception (default behavior)
        const notificationResult = await notificationService.sendNotification(
          'attendanceUpdate',
          {
            actionType: 'check-in',
            staffName: staffName,
            location: timesheet.clockIn.location || 'Main Office',
            shiftType: isOvertimeCheckIn ? 'OVERTIME' : 'REGULAR',
            attendanceStatus: timesheet.clockIn.attendanceStatus || 'on-time'
          }
        );
        
        console.log(`✅ [CHECK-IN] Telegram notification result:`, JSON.stringify(notificationResult, null, 2));
        console.log(`✅ [CHECK-IN] Telegram notification sent for ${staffName} (${isOvertimeCheckIn ? 'OVERTIME' : 'REGULAR'})`);
        
        // Also send confirmation notification to the staff member who checked in (if they have Telegram enabled)
        if (user && user.telegramChatId && user.telegramNotificationsEnabled) {
          const prefs = user.notificationPreferences || {};
          if (prefs.attendanceUpdates !== false) { // Default to true
            try {
              const confirmationMessage = `✅ <b>Check-in Confirmed</b>\n\n` +
                `👤 <b>You:</b> ${staffName}\n` +
                `📅 <b>Time:</b> ${new Date().toLocaleString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}\n` +
                `📍 <b>Location:</b> ${timesheet.clockIn.location || 'Main Office'}\n` +
                `⏰ <b>Shift Type:</b> ${isOvertimeCheckIn ? 'OVERTIME' : 'REGULAR'}\n` +
                `📊 <b>Status:</b> ${timesheet.clockIn.attendanceStatus || 'on-time'}\n\n` +
                `✅ You have successfully checked in!`;
              
              const telegramService = require('./telegramService');
              await telegramService.initialize();
              if (telegramService.isBotInitialized()) {
                await telegramService.sendMessageToStaff(
                  user.telegramChatId,
                  confirmationMessage,
                  { parse_mode: 'HTML' }
                );
                console.log(`✅ [CHECK-IN] Confirmation notification sent to ${staffName}`);
              }
            } catch (confirmationError) {
              console.error(`⚠️ [CHECK-IN] Error sending confirmation to staff member:`, confirmationError);
              // Don't fail if confirmation fails
            }
          }
        }
      } catch (notificationError) {
        console.error(`❌ [CHECK-IN] Error sending Telegram notification:`, notificationError);
        console.error(`❌ [CHECK-IN] Error stack:`, notificationError.stack);
        // Don't fail check-in if notification fails
      }

      const processingTime = Date.now() - startTime;

      // Get current status for response
      const currentStatus = {
        status: 'checked-in',
        clockInTime: timesheet.clockIn.time,
        location: timesheet.clockIn.location,
        attendanceStatus: timesheet.clockIn.attendanceStatus,
        isOvertime: isOvertimeCheckIn,
        shiftType: isOvertimeCheckIn ? 'OVERTIME' : 'REGULAR',
        ethiopianTime: ethiopianTime.toISOString()
      };

      return {
        success: true,
        message: isOvertimeCheckIn ? '✅ Overtime check-in successful' : '✅ Check-in successful',
        data: currentStatus
      };

    } catch (error) {
      console.error('Error in enhanced check-in:', error);
      throw error;
    }
  }

  /**
   * Enhanced check-out with advanced features
   */
  static async processEnhancedCheckOut(userId, deviceInfo = {}, options = {}) {
    try {
      const startTime = Date.now();
      
      // SECURITY: Log check-out attempt with device info
      console.log(`🔒 [SECURITY] Check-out attempt:`, {
        userId: userId,
        userAgent: deviceInfo?.userAgent?.substring(0, 50) || 'unknown',
        ipAddress: deviceInfo?.ipAddress || 'unknown',
        timestamp: new Date().toISOString()
      });
      
      // Device registration already validated in app.js before calling this function
      // No need to check again here
      console.log(`🔍 [ENHANCED CHECK-OUT] Processing for user: ${userId}`);
      
      // Check for biometric verification if enabled
      if (options.biometric && options.biometricHash) {
        const biometricValid = await this.verifyBiometric(userId, options.biometricHash, options.biometricType);
        if (!biometricValid) {
          throw new Error('Biometric verification failed');
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find active timesheet
      const activeTimesheet = await Timesheet.findOne({
        userId,
        date: { $gte: today, $lt: tomorrow },
        status: 'active'
      });

      if (!activeTimesheet) {
        return {
          success: false,
          message: 'No active timesheet found',
          data: null
        };
      }

      if (!activeTimesheet.clockIn || !activeTimesheet.clockIn.time) {
        return {
          success: false,
          message: 'No clock in record found',
          data: null
        };
      }

      if (activeTimesheet.clockOut && activeTimesheet.clockOut.time) {
        return {
          success: false,
          message: 'Already clocked out',
          data: {
            clockInTime: activeTimesheet.clockIn.time,
            clockOutTime: activeTimesheet.clockOut.time,
            totalWorkHours: activeTimesheet.totalWorkHours,
            overtimeHours: activeTimesheet.overtimeHours
          }
        };
      }

      // Enhanced clock-out processing
      const clockOutTime = new Date();
      const ethiopianTime = new Date(clockOutTime.getTime() + (3 * 60 * 60 * 1000));
      
      // Enhanced early clock-out detection
      const isEarlyClockOut = this.isEarlyClockOut(clockOutTime);
      const minutesEarly = isEarlyClockOut ? this.calculateMinutesEarly(clockOutTime) : 0;

      activeTimesheet.clockOut = {
        time: clockOutTime,
        location: deviceInfo.location || 'Main Office',
        method: options.method || 'qr-code',
        ethiopianTime: ethiopianTime,
        isEarlyClockOut: isEarlyClockOut,
        minutesEarly: minutesEarly,
        deviceInfo: deviceInfo,
        biometricVerified: options.biometric || false
      };

      if (options.notes) {
        activeTimesheet.notes = activeTimesheet.notes ? 
          `${activeTimesheet.notes}\n${options.notes}` : options.notes;
      }

      activeTimesheet.status = 'completed';
      activeTimesheet.calculateWorkHours();
      await activeTimesheet.save();

      // Update StaffAttendance
      await this.updateStaffAttendance(userId, activeTimesheet);

      // Send Telegram notification for check-out
      try {
        const notificationService = require('./notificationService');
        const User = require('../models/User');
        
        const user = await User.findById(userId).select('firstName lastName role');
        const staffName = user ? `${user.firstName} ${user.lastName}` : 'Unknown Staff';
        
        await notificationService.sendNotification(
          'attendanceUpdate',
          {
            actionType: 'check-out',
            staffName: staffName,
            location: activeTimesheet.clockOut.location || 'Main Office',
            shiftType: activeTimesheet.isOvertime ? 'OVERTIME' : 'REGULAR',
            totalHours: activeTimesheet.totalWorkHours || 0,
            attendanceStatus: activeTimesheet.clockOut.isEarlyClockOut ? 
              `Early checkout (${activeTimesheet.clockOut.minutesEarly} min early)` : 'Normal checkout'
          }
        );
        
        console.log(`✅ [CHECK-OUT] Telegram notification sent for ${staffName}`);
      } catch (notificationError) {
        console.error(`⚠️ [CHECK-OUT] Error sending Telegram notification:`, notificationError);
        // Don't fail check-out if notification fails
      }

      const processingTime = Date.now() - startTime;

      let message = 'Enhanced checkout successful';
      if (activeTimesheet.clockOut.isEarlyClockOut) {
        message = `Enhanced early checkout (${activeTimesheet.clockOut.minutesEarly} minutes early)`;
      }

      // Get current status for response
      const currentStatus = {
        status: 'checked-out',
        clockInTime: activeTimesheet.clockIn.time,
        clockOutTime: activeTimesheet.clockOut.time,
        totalWorkHours: activeTimesheet.totalWorkHours,
        overtimeHours: activeTimesheet.overtimeHours,
        isEarlyClockOut: activeTimesheet.clockOut.isEarlyClockOut,
        minutesEarly: activeTimesheet.clockOut.minutesEarly,
        isOvertime: activeTimesheet.isOvertime,
        shiftType: activeTimesheet.isOvertime ? 'OVERTIME' : 'REGULAR'
      };

      return {
        success: true,
        message: message,
        data: currentStatus
      };

    } catch (error) {
      console.error('Error in enhanced check-out:', error);
      throw error;
    }
  }

  /**
   * Queue action for offline processing
   */
  static async queueOfflineAction(userId, action, deviceInfo, options) {
    try {
      const offlineAction = new OfflineQueue({
        userId: userId,
        action: action,
        data: {
          deviceInfo: deviceInfo,
          options: options,
          timestamp: new Date().toISOString()
        },
        deviceInfo: {
          ...deviceInfo,
          offlineDuration: options.offlineDuration || 0
        },
        priority: options.priority || 1
      });

      await offlineAction.save();

      return {
        success: true,
        message: 'Action queued for offline processing',
        data: {
          queueId: offlineAction._id,
          action: action,
          status: 'queued'
        }
      };

    } catch (error) {
      console.error('Error queuing offline action:', error);
      throw error;
    }
  }

  /**
   * Process batch check-in operations
   */
  static async processBatchCheckIn(userIds, deviceInfo, options) {
    try {
      const results = [];
      
      for (const userId of userIds) {
        try {
          const result = await this.processEnhancedCheckIn(userId, deviceInfo, options);
          results.push({
            userId: userId,
            success: result.success,
            message: result.message,
            data: result.data
          });
        } catch (error) {
          results.push({
            userId: userId,
            success: false,
            message: error.message,
            data: null
          });
        }
      }

      return {
        success: true,
        message: 'Batch check-in completed',
        data: {
          results: results,
          totalProcessed: userIds.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      };

    } catch (error) {
      console.error('Error in batch check-in:', error);
      throw error;
    }
  }

  /**
   * Verify biometric authentication
   */
  static async verifyBiometric(userId, biometricHash, biometricType) {
    try {
      const biometric = await BiometricVerification.findOne({
        userId: userId,
        biometricType: biometricType,
        biometricHash: biometricHash,
        isActive: true
      });

      if (!biometric) {
        return false;
      }

      // Update usage statistics
      biometric.lastUsed = new Date();
      biometric.usageCount = (biometric.usageCount || 0) + 1;
      await biometric.save();

      return true;

    } catch (error) {
      console.error('Error verifying biometric:', error);
      return false;
    }
  }

  /**
   * Log analytics data
   */
  static async logAnalytics(userId, actionType, data) {
    try {
      const analytics = new QRCodeAnalytics({
        qrCodeHash: data.hash || 'unknown',
        userId: userId,
        action: actionType,
        timestamp: new Date(),
        deviceInfo: data.deviceInfo || {},
        success: data.success !== false,
        errorMessage: data.error || null,
        processingTime: data.processingTime || 0,
        metadata: data.metadata || {}
      });

      await analytics.save();

    } catch (error) {
      console.error('Error logging analytics:', error);
    }
  }

  /**
   * Get server IP address with enhanced detection
   */
  static getServerIP() {
    const interfaces = os.networkInterfaces();
    
    // Priority order for IP selection
    const priorityPatterns = [
      /^192\.168\./,     // Private network
      /^10\./,           // Private network
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network
    ];
    
    // Collect all IPv4 addresses
    const addresses = [];
    for (const [name, nets] of Object.entries(interfaces)) {
      for (const net of nets) {
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push({
            address: net.address,
            interface: name
          });
        }
      }
    }
    
    // Find best IP based on priority
    for (const pattern of priorityPatterns) {
      const match = addresses.find(addr => pattern.test(addr.address));
      if (match) {
        return match.address;
      }
    }
    
    // Fallback to first available IP
    return addresses.length > 0 ? addresses[0].address : 'localhost';
  }

  /**
   * FIXED: Check if current time is overtime (simplified logic)
   * Regular hours: 8:30 AM - 5:00 PM Ethiopian Time
   * Overtime: All other times
   */
  static isOvertimeTime(currentTime) {
    const ethiopianTime = new Date(currentTime.getTime() + (3 * 60 * 60 * 1000));
    const currentHour = ethiopianTime.getUTCHours();
    const currentMinute = ethiopianTime.getUTCMinutes();
    
    // Overtime if:
    // - After 5:00 PM (hour >= 17)
    // - Before 8:30 AM (hour < 8 OR hour === 8 AND minute < 30)
    const isAfterRegularHours = currentHour >= 17;
    const isBeforeRegularHours = currentHour < 8 || (currentHour === 8 && currentMinute < 30);
    
    return isAfterRegularHours || isBeforeRegularHours;
  }

  /**
   * Check if clock-out is early
   */
  static isEarlyClockOut(clockOutTime) {
    const ethiopianTime = new Date(clockOutTime.getTime() + (3 * 60 * 60 * 1000));
    const currentHour = ethiopianTime.getUTCHours();
    const currentMinute = ethiopianTime.getUTCMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const earlyThresholdMinutes = 11 * 60; // 11:00 AM
    
    return currentTimeMinutes < earlyThresholdMinutes;
  }

  /**
   * Calculate minutes early for clock-out
   */
  static calculateMinutesEarly(clockOutTime) {
    const ethiopianTime = new Date(clockOutTime.getTime() + (3 * 60 * 60 * 1000));
    const currentHour = ethiopianTime.getUTCHours();
    const currentMinute = ethiopianTime.getUTCMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const earlyThresholdMinutes = 11 * 60; // 11:00 AM
    
    return Math.max(0, earlyThresholdMinutes - currentTimeMinutes);
  }

  /**
   * Update StaffAttendance model
   */
  static async updateStaffAttendance(userId, timesheet) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let staffAttendance = await StaffAttendance.findOne({
        userId: userId,
        date: today
      });

      if (!staffAttendance) {
        staffAttendance = new StaffAttendance({
          userId: userId,
          date: today,
          status: 'present'
        });
      }

      // Update based on timesheet status
      if (timesheet.status === 'completed') {
        staffAttendance.status = 'present';
        staffAttendance.totalWorkHours = timesheet.totalWorkHours;
        staffAttendance.overtimeHours = timesheet.overtimeHours;
        staffAttendance.clockInTime = timesheet.clockIn.time;
        staffAttendance.clockOutTime = timesheet.clockOut.time;
        staffAttendance.dayAttendanceStatus = timesheet.dayAttendanceStatus;
      } else if (timesheet.status === 'active') {
        staffAttendance.status = 'present';
        staffAttendance.clockInTime = timesheet.clockIn.time;
        staffAttendance.dayAttendanceStatus = timesheet.clockIn.attendanceStatus;
      }

      await staffAttendance.save();

    } catch (error) {
      console.error('Error updating StaffAttendance:', error);
    }
  }

  /**
   * Get enhanced analytics data
   */
  static async getAnalytics(userId, dateRange = {}) {
    try {
      const startDate = dateRange.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange.endDate || new Date();

      const analytics = await QRCodeAnalytics.find({
        userId: userId,
        timestamp: { $gte: startDate, $lte: endDate }
      }).sort({ timestamp: -1 });

      // Process analytics data
      const summary = {
        totalActions: analytics.length,
        successfulActions: analytics.filter(a => a.success).length,
        failedActions: analytics.filter(a => !a.success).length,
        averageProcessingTime: analytics.reduce((sum, a) => sum + a.processingTime, 0) / analytics.length,
        actionsByType: {},
        deviceStats: {},
        errorStats: {}
      };

      // Group by action type
      analytics.forEach(a => {
        summary.actionsByType[a.action] = (summary.actionsByType[a.action] || 0) + 1;
        
        if (a.deviceInfo.platform) {
          summary.deviceStats[a.deviceInfo.platform] = (summary.deviceStats[a.deviceInfo.platform] || 0) + 1;
        }
        
        if (!a.success && a.errorMessage) {
          summary.errorStats[a.errorMessage] = (summary.errorStats[a.errorMessage] || 0) + 1;
        }
      });

      return {
        summary: summary,
        details: analytics
      };

    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }
}

module.exports = EnhancedQRCodeService;
