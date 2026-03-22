const QRCode = require('qrcode');
const CryptoJS = require('crypto-js');
const StaffHash = require('../models/StaffHash');
const Timesheet = require('../models/Timesheet');
const StaffAttendance = require('../models/StaffAttendance');
const User = require('../models/User');

/**
 * Ethiopian Time Utilities for Attendance Classification
 */
class EthiopianTime {
  /**
   * Get current Ethiopian time (UTC+3)
   */
  static getCurrentEthiopianTime() {
    const now = new Date();
    const ethiopianTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
    return ethiopianTime;
  }

  /**
   * Check if time is within working hours (2:30 AM - 11:00 AM Ethiopian time)
   */
  static isWithinWorkingHours(ethiopianTime) {
    const hours = ethiopianTime.getUTCHours();
    const minutes = ethiopianTime.getUTCMinutes();
    const totalMinutes = hours * 60 + minutes;
    
    // 2:30 AM = 2 * 60 + 30 = 150 minutes
    // 11:00 AM = 11 * 60 = 660 minutes
    return totalMinutes >= 150 && totalMinutes <= 660;
  }

  /**
   * Get attendance status based on check-in time
   */
  static getAttendanceStatus(checkInTime) {
    const ethiopianCheckInTime = new Date(checkInTime.getTime() + (3 * 60 * 60 * 1000));
    
    if (this.isWithinWorkingHours(ethiopianCheckInTime)) {
      return 'on-time';
    } else {
      return 'late';
    }
  }

  /**
   * Get start of Ethiopian working day (2:30 AM Ethiopian time)
   */
  static getStartOfWorkingDay(date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(2, 30, 0, 0); // 2:30 AM Ethiopian time
    return new Date(startOfDay.getTime() - (3 * 60 * 60 * 1000)); // Convert back to UTC
  }

  /**
   * Get end of Ethiopian working day (11:00 AM Ethiopian time)
   */
  static getEndOfWorkingDay(date) {
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(11, 0, 0, 0); // 11:00 AM Ethiopian time
    return new Date(endOfDay.getTime() - (3 * 60 * 60 * 1000)); // Convert back to UTC
  }
}

class QRCodeService {
  /**
   * Generate a unique hash for a staff member
   * @param {string} userId - Staff member's user ID
   * @param {string} hashType - Type of hash (qr-checkin, qr-checkout, or staff-registration)
   * @returns {Promise<string>} - Generated unique hash
   */
  static async generateUniqueHash(userId, hashType) {
    try {
      // First check if a hash already exists for this user and type (active or inactive)
      const existingHash = await StaffHash.findOne({
        userId,
        hashType
      });

      if (existingHash) {
        const hashValue = existingHash.uniqueHash || existingHash.hash;
        console.log('🔍 [QRCodeService] Found existing hash, returning it:', hashValue);
        
        // If the hash is inactive, reactivate it
        if (!existingHash.isActive) {
          existingHash.isActive = true;
          existingHash.lastUsed = new Date();
          await existingHash.save();
          console.log('✅ [QRCodeService] Reactivated existing hash');
        }
        
        return {
          success: true,
          hash: hashValue,
          qrCodeImage: null, // Will be generated in generateQRCode
          userId: userId,
          hashType: hashType,
          isPermanent: hashType === 'staff-registration',
          existing: true
        };
      }

      // No existing hash, create a new one
      console.log('🔍 [QRCodeService] No existing hash found, creating new one');
      
      // Generate a random salt
      const salt = CryptoJS.lib.WordArray.random(16).toString();
      
      // Create the hash data
      const hashData = {
        userId: userId,
        hashType: hashType,
        salt: salt,
        timestamp: new Date().toISOString()
      };

      // Generate the hash
      const hashString = JSON.stringify(hashData);
      const hash = CryptoJS.SHA256(hashString).toString();

      // Create the QR code data
      const qrData = {
        hash: hash,
        userId: userId,
        hashType: hashType,
        timestamp: new Date().toISOString()
      };

      // Generate QR code image
      const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Save the hash to database
      const staffHash = new StaffHash({
        userId,
        uniqueHash: hash,
        hashType,
        isActive: true,
        // For device registrations, don't set expiration - they're permanent
        expiresAt: hashType === 'staff-registration' ? null : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours for check-in/out hashes
        isPermanent: hashType === 'staff-registration', // Device registrations are permanent
        registeredAt: new Date()
      });

      try {
        await staffHash.save();
      } catch (saveError) {
        // If save fails due to duplicate key, try to find the existing hash
        if (saveError.code === 11000 && saveError.message.includes('duplicate key error')) {
          console.log('🔍 [QRCodeService] Save failed due to duplicate key, trying to find existing hash...');
          
          const existingHash = await StaffHash.findOne({
            userId,
            hashType
          });
          
          if (existingHash) {
            const hashValue = existingHash.uniqueHash || existingHash.hash;
            console.log('🔍 [QRCodeService] Found existing hash after duplicate key error, returning it');
            
            // If the hash is inactive, reactivate it
            if (!existingHash.isActive) {
              existingHash.isActive = true;
              existingHash.lastUsed = new Date();
              await existingHash.save();
              console.log('✅ [QRCodeService] Reactivated existing hash after duplicate key error');
            }
            
            return {
              success: true,
              hash: hashValue,
              qrCodeImage: null, // Will be generated in generateQRCode
              userId: userId,
              hashType: hashType,
              isPermanent: hashType === 'staff-registration',
              existing: true
            };
          }
        }
        
        // Re-throw the error if it's not a duplicate key error or if we couldn't find the existing hash
        throw saveError;
      }

      return {
        success: true,
        hash: hash,
        qrCodeImage: qrCodeImage,
        userId: userId,
        hashType: hashType,
        isPermanent: hashType === 'staff-registration'
      };
    } catch (error) {
      console.error('Error generating unique hash:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate QR Code with URL for staff check-in/check-out
   * @param {string} userId - Staff member's user ID
   * @param {string} hashType - Type of hash (qr-checkin, qr-checkout, or staff-registration)
   * @param {string} location - Optional location for check-in/check-out
   * @returns {Promise<Object>} QR code data with URL
   */
  static async generateQRCode(userId, hashType, location = 'Main Entrance') {
    try {
      console.log('🔍 [QRCodeService] generateQRCode called:', { 
        userId, 
        userIdType: typeof userId, 
        userIdLength: userId ? userId.length : 'undefined',
        hashType, 
        location 
      });
      
      // Normalize userId to a 24-character hex string if possible
      const normalizedUserId = typeof userId === 'string'
        ? userId
        : (userId && typeof userId.toString === 'function' ? userId.toString() : '');
      const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(normalizedUserId);

      // Replace incoming userId with normalized version for all subsequent logic
      userId = normalizedUserId;

      // Validate userId format
      if (!isValidObjectId) {
        console.error('Invalid userId format:', { 
          userId, 
          userIdType: typeof userId, 
          userIdLength: userId ? userId.length : 'undefined',
          isString: typeof userId === 'string',
          matchesObjectIdRegex: isValidObjectId
        });
        return {
          success: false,
          message: 'Invalid user ID format',
          error: 'User ID must be a 24-character string'
        };
      }
      
      let staffHash;
      
      if (hashType === 'staff-registration') {
        // For staff-registration, use generateUniqueHash which now handles existing hashes
        console.log('🔍 [QRCodeService] Getting hash for staff-registration for user:', userId);
        const hashResult = await this.generateUniqueHash(userId, hashType);
        
        if (!hashResult.success) {
          throw new Error(`Failed to generate unique hash: ${hashResult.error}`);
        }
        
        // Find the hash in the database
        staffHash = await StaffHash.findOne({ 
          userId, 
          hashType: 'staff-registration',
          isActive: true
        });
        
        if (!staffHash) {
          throw new Error('Hash was not found in database');
        }
        
        console.log('🔍 [QRCodeService] Hash retrieved successfully:', hashResult.existing ? 'Existing' : 'New');
      } else {
        // For check-in/check-out (qr-checkin, qr-checkout), create or use existing hash of the specific type
        console.log('🔍 [QRCodeService] Getting hash for check-in/check-out for user:', userId);
        console.log('🔍 [QRCodeService] Requested hashType:', hashType);
        
        // First check if user has an active staff-registration hash (required for check-in/check-out)
        let registrationHash = await StaffHash.findOne({ 
          userId, 
          hashType: 'staff-registration',
          isActive: true
        });
        
        if (!registrationHash) {
          throw new Error('User must register their device first before using check-in/check-out QR codes');
        }
        
        // For check-in/check-out, reuse the existing staff-registration hash
        // This avoids the database constraint issue while still allowing different actions
        console.log(`🔍 [QRCodeService] Using existing staff-registration hash for ${hashType}`);
        staffHash = registrationHash;
      }

      // Create verification URL based on hash type
      // Use environment variable or try to detect the correct URL
      let baseUrl = process.env.FRONTEND_URL;
      
      // Check for manual IP override
      const manualIP = process.env.FRONTEND_IP;
      if (manualIP && !baseUrl) {
        baseUrl = `http://${manualIP}:5175`;
        console.log(`🔍 [QRCodeService] Using manual IP override: ${baseUrl}`);
      }
      
      if (!baseUrl) {
        // Try to get the server's network IP for better mobile accessibility
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
        
        // Log all available network interfaces for debugging
        console.log('🔍 [QRCodeService] Available network interfaces:');
        for (const interfaceName in networkInterfaces) {
          const interfaces = networkInterfaces[interfaceName];
          for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
              console.log(`   ${interfaceName}: ${iface.address}`);
            }
          }
        }
        
        // First, try to find a preferred private network address
        for (const pattern of preferredPatterns) {
          console.log(`🔍 [QRCodeService] Trying pattern: ${pattern}`);
          for (const interfaceName in networkInterfaces) {
            const interfaces = networkInterfaces[interfaceName];
            for (const iface of interfaces) {
              if (iface.family === 'IPv4' && !iface.internal && pattern.test(iface.address)) {
                serverIP = iface.address;
                console.log(`✅ [QRCodeService] Selected IP: ${serverIP} from interface ${interfaceName}`);
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
        baseUrl = `http://${serverIP}:5002`;
        console.log(`🔍 [QRCodeService] Auto-detected backend URL: ${baseUrl}`);
        console.log(`📱 QR codes will point to backend at: ${baseUrl}`);
      }
      
      // Mobile-friendly URL generation function
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
      let verificationUrl;
      
      console.log('🔍 [QRCodeService] Generating QR code URL:', {
        hashType,
        staffHashObject: staffHash,
        staffHashType: typeof staffHash,
        staffHashKeys: Object.keys(staffHash || {}),
        staffHashUniqueHash: staffHash?.uniqueHash,
        staffHashUniqueHashType: typeof staffHash?.uniqueHash,
        userId
      });
      
      if (hashType === 'staff-registration') {
        verificationUrl = generateMobileFriendlyUrl(baseUrl, staffHash.uniqueHash, 'staff-registration', userId);
      } else {
        verificationUrl = generateMobileFriendlyUrl(baseUrl, staffHash.uniqueHash, hashType, userId);
      }
      
      console.log('Generated verification URL:', verificationUrl);
      
      // Generate QR code from URL with optimized settings for mobile scanning
      const qrCode = await QRCode.toDataURL(verificationUrl, {
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

      // Update hash usage
      staffHash.usageCount += 1;
      staffHash.lastUsed = new Date();
      await staffHash.save();

      // Get user data for the response - simplified to prevent errors
      let user = {
        firstName: 'Staff',
        lastName: 'Member',
        username: 'staff',
        email: 'staff@clinic.com',
        role: 'staff',
        specialization: null
      };
      
      const responseData = {
        success: true,
        qrCodeImage: qrCode, // Add this for frontend compatibility
        verificationUrl,
        registrationUrl: verificationUrl, // Add this for frontend compatibility
        hash: staffHash.uniqueHash,
        expiresAt: staffHash.expiresAt,
        type: hashType,
        userId,
        user: user,
        generatedAt: new Date().toISOString(),
        isNew: false // This will be set by the route handler
      };
      
      console.log('🔍 [QRCodeService] Returning response data:', {
        hash: responseData.hash,
        hashType: typeof responseData.hash,
        fullResponse: responseData
      });
      
      return responseData;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return {
        success: false,
        message: 'Failed to generate QR code',
        error: error.message
      };
    }
  }

  /**
   * Verify QR code URL and process check-in/check-out
   * @param {string} urlHash - Hash from the URL
   * @param {string} hashType - Type of hash (qr-checkin, qr-checkout, or staff-registration)
   * @param {string} userId - User ID from the URL
   * @param {string} browserHash - Hash stored in browser (from request body)
   * @param {Object} deviceInfo - Device information
   * @param {string} currentUserId - ID of the currently logged-in user (for security)
   * @returns {Promise<Object>} Verification result
   */
  static async verifyQRCodeURL(urlHash, hashType, userId, browserHash, deviceInfo = {}, currentUserId = null) {
    try {
      // Validate parameters
      if (!urlHash || !hashType || !userId || !browserHash) {
        return {
          success: false,
          message: 'Missing required parameters for verification'
        };
      }

      // SECURITY: Verify that the logged-in user owns this hash
      if (currentUserId && currentUserId !== userId) {
        return {
          success: false,
          message: 'Security violation: You can only verify your own QR codes'
        };
      }

      // Find the staff hash record - there should be only one per user per type
      let staffHash;
      
      if (hashType === 'staff-registration') {
        // For staff-registration, find the hash by the URL hash
        staffHash = await StaffHash.findOne({
          userId,
          uniqueHash: urlHash,
          hashType
        });
      } else {
        // For check-in/check-out, find the staff-registration hash for this user
        // We use the staff-registration hash for check-in/check-out operations
        staffHash = await StaffHash.findOne({
          userId,
          hashType: 'staff-registration',
          isActive: true
        });
        
        console.log('Check-in/check-out verification - found staff hash:', {
          found: !!staffHash,
          hashType: staffHash ? staffHash.hashType : 'none',
          uniqueHash: staffHash ? staffHash.uniqueHash.substring(0, 20) + '...' : 'none'
        });
      }

      if (!staffHash) {
        console.log('No staff hash found for verification:', {
          userId,
          hashType,
          urlHash: urlHash.substring(0, 20) + '...'
        });
        return {
          success: false,
          message: 'Invalid or expired QR code'
        };
      }

      // Check if the registration has been deactivated
      if (!staffHash.isActive) {
        return {
          success: false,
          message: '❌ Device Registration Deactivated - This device registration has been deactivated by an administrator. Please contact your administrator to re-register your device.',
          data: {
            deactivated: true,
            deactivatedAt: staffHash.deactivatedAt
          }
        };
      }

      // Check if hash is expired (device registrations don't expire)
      if (staffHash.expiresAt && new Date() > staffHash.expiresAt) {
        return {
          success: false,
          message: 'QR code has expired'
        };
      }

      // For check-in/check-out operations, we need to verify that the scanning device has a valid registered hash
      if (hashType === 'qr-checkin' || hashType === 'qr-checkout') {
        // SECURITY: Verify that the device is properly registered
        console.log('🔍 [QRCodeService] Check-in/check-out verification - validating device registration');
        console.log('🔍 [QRCodeService] URL hash:', urlHash.substring(0, 20) + '...');
        console.log('🔍 [QRCodeService] Staff registration hash:', staffHash.uniqueHash.substring(0, 20) + '...');
        console.log('🔍 [QRCodeService] Hash type:', hashType);
        
        // Verify that this is a staff-registration hash (not a different type)
        if (staffHash.hashType !== 'staff-registration') {
          return {
            success: false,
            message: '❌ Invalid QR Code Type - This QR code cannot be used for check-in/check-out operations.'
          };
        }
        
        // Verify the hash is active and not expired
        if (!staffHash.isActive) {
          return {
            success: false,
            message: '❌ QR Code Expired - Your device registration has expired. Please re-register your device.'
          };
        }
        
        console.log('✅ QR Code hash verification successful for check-in/check-out (device registered)');
      } else {
        // For staff-registration, verify that the URL hash matches the staff hash
        console.log('Hash verification for staff-registration:', {
          urlHash: urlHash.substring(0, 20) + '...',
          staffHashUniqueHash: staffHash.uniqueHash.substring(0, 20) + '...',
          hashType,
          userId
        });
        
        if (urlHash !== staffHash.uniqueHash) {
          console.log('❌ Hash mismatch detected for staff-registration');
          return {
            success: false,
            message: 'Hash verification failed - Invalid QR code hash.',
            debug: {
              urlHash: urlHash.substring(0, 20) + '...',
              staffHashUniqueHash: staffHash.uniqueHash.substring(0, 20) + '...',
              hashType,
              userId
            }
          };
        }
        console.log('✅ Hash verification successful for staff-registration');
      }
      
      console.log('✅ Hash verification successful');

      // SECURITY: Verify that the stored user ID matches the URL user ID
      if (staffHash.userId && staffHash.userId.toString() !== userId) {
        return {
          success: false,
          message: 'Security violation: Stored user ID does not match QR code user ID'
        };
      }

      // Check if user is already checked in/out
      const currentAttendance = await this.getCurrentAttendanceStatus(userId);
      
      if (hashType === 'staff-registration') {
        // Check if this user already has an active staff registration
        const existingRegistration = await StaffHash.findOne({
          userId,
          hashType: 'staff-registration',
          isActive: true,
          _id: { $ne: staffHash._id } // Exclude the current hash being verified
        });

        if (existingRegistration) {
          return {
            success: false,
            message: '❌ Registration Failed - This staff member already has an active device registration. Only one device can be registered per staff member.'
          };
        }

        // Device registration is now handled through localStorage on the frontend
        // No backend device registration check needed

        // For staff registration, activate the hash and update lastUsed
        staffHash.isActive = true;
        staffHash.lastUsed = new Date();
        await staffHash.save();
        
        const user = await User.findById(userId).select('firstName lastName username email role');
        return {
          success: true,
          message: 'Staff registration verified successfully',
          data: {
            userId,
            hash: urlHash,
            user: {
              firstName: user.firstName,
              lastName: user.lastName,
              username: user.username,
              email: user.email,
              role: user.role
            },
            expiresAt: staffHash.expiresAt
          }
        };
      } else if (hashType === 'qr-checkin') {
        // Check if current time is within overtime hours
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        const currentMinute = currentTime.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        // Overtime hours: 5:00 PM (17:00) to 1:30 AM (1:30) next day
        const overtimeStartMinutes = 17 * 60; // 5:00 PM
        const overtimeEndMinutes = 1 * 60 + 30; // 1:30 AM
        
        let isOvertimeTime = false;
        if (currentHour >= 17) {
          // After 5:00 PM
          isOvertimeTime = currentTimeMinutes >= overtimeStartMinutes;
        } else if (currentHour <= 1) {
          // Before 1:30 AM (next day)
          isOvertimeTime = currentTimeMinutes <= overtimeEndMinutes;
        }
        
        const result = await this.processCheckIn(userId, deviceInfo, isOvertimeTime);
        
        // Small delay to ensure database is updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get current attendance status for UI updates
        const currentStatus = await this.getCurrentAttendanceStatus(userId);
        
        // Simplify message for phone display
        let phoneMessage = result.message;
        if (result.message.includes('Successfully clocked in for overtime')) {
          phoneMessage = 'Clocked in overtime';
        } else if (result.message.includes('Successfully clocked in')) {
          phoneMessage = 'Clocked in successfully';
        } else if (result.message.includes('Already clocked in today')) {
          phoneMessage = 'Already clocked in today';
        }
        
        return {
          success: true,
          message: phoneMessage,
          data: {
            ...result.data,
            currentStatus: currentStatus, // Include current status for UI updates
            action: 'check-in',
            timestamp: new Date().toISOString(),
            user: {
              userId: userId,
              action: 'check-in'
            }
          }
        };
      } else if (hashType === 'qr-checkout') {
        if (!currentAttendance || currentAttendance.status === 'checked-out') {
          return {
            success: false,
            message: 'Not checked in'
          };
        }
        
        console.log('🔄 [QR] Processing checkout for user:', userId);
        const result = await this.processCheckOut(userId, deviceInfo);
        
        // Longer delay to ensure database is fully updated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get current attendance status for UI updates
        const currentStatus = await this.getCurrentAttendanceStatus(userId);
        
        // Debug logging for status
        console.log('🔍 [QR] Clock out - Current status returned:', {
          status: currentStatus?.status,
          canCheckIn: currentStatus?.canCheckIn,
          canCheckOut: currentStatus?.canCheckOut,
          message: currentStatus?.message
        });
        
        // Simplify message for phone display
        let phoneMessage = result.message;
        if (result.message.includes('Successfully clocked out')) {
          phoneMessage = '✅ Clocked out successfully';
        } else if (result.message.includes('Early clock out')) {
          phoneMessage = '⚠️ Early clock out';
        }
        
        return {
          success: true,
          message: phoneMessage,
          data: {
            ...result.data,
            currentStatus: currentStatus, // Include current status for UI updates
            action: 'check-out',
            timestamp: new Date().toISOString(),
            user: {
              userId: userId,
              action: 'check-out'
            },
            // Add explicit status flags for frontend
            statusUpdated: true,
            newStatus: 'checked_out',
            canCheckIn: currentStatus?.canCheckIn || false,
            canCheckOut: currentStatus?.canCheckOut || false
          }
        };
      }

      return {
        success: false,
        message: 'Invalid hash type'
      };
    } catch (error) {
      console.error('Error verifying QR code URL:', error);
      return {
        success: false,
        message: 'Failed to verify QR code',
        error: error.message
      };
    }
  }

  /**
   * Verify QR code hash and process check-in/check-out
   * @param {string} hash - Hash from scanned QR code
   * @param {string} deviceInfo - Device information
   * @returns {Promise<{success: boolean, message: string, data: object}>} - Verification result
   */
  static async verifyAndProcessHash(hash, deviceInfo = {}) {
    try {
      // Find the hash in database
      const staffHash = await StaffHash.findOne({ 
        uniqueHash: hash, 
        isActive: true 
      }).populate('userId');

      if (!staffHash) {
        return {
          success: false,
          message: 'Invalid or expired QR code',
          data: null
        };
      }

      // Check if hash is expired (device registrations don't expire)
      if (staffHash.expiresAt && new Date() > staffHash.expiresAt) {
        staffHash.isActive = false;
        await staffHash.save();
        return {
          success: false,
          message: 'QR code has expired',
          data: null
        };
      }

      const user = staffHash.userId;
      const hashType = staffHash.hashType;

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          message: 'User account is inactive',
          data: null
        };
      }

      // Process check-in or check-out based on hash type
      let result;
      try {
        if (hashType === 'qr-checkin') {
          // Check if current time is within overtime hours
          const currentTime = new Date();
          const currentHour = currentTime.getHours();
          const currentMinute = currentTime.getMinutes();
          const currentTimeMinutes = currentHour * 60 + currentMinute;
          
          // Overtime hours: 5:00 PM (17:00) to 1:30 AM (1:30) next day
          const overtimeStartMinutes = 17 * 60; // 5:00 PM
          const overtimeEndMinutes = 1 * 60 + 30; // 1:30 AM
          
          let isOvertimeTime = false;
          if (currentHour >= 17) {
            // After 5:00 PM
            isOvertimeTime = currentTimeMinutes >= overtimeStartMinutes;
          } else if (currentHour <= 1) {
            // Before 1:30 AM (next day)
            isOvertimeTime = currentTimeMinutes <= overtimeEndMinutes;
          }
          
          result = await this.processCheckIn(user._id, deviceInfo, isOvertimeTime);
        } else if (hashType === 'qr-checkout') {
          result = await this.processCheckOut(user._id, deviceInfo);
        }
        
        // Check if result is valid - be more lenient with validation
        if (!result) {
          throw new Error('No result returned from check-in/check-out process');
        }
        
        // Ensure result has required properties
        if (typeof result !== 'object' || !result.message) {
          console.warn('🔍 [QRCodeService] Result validation warning:', result);
          // Don't throw error, just log warning and continue
        }
        
        console.log('🔍 [QRCodeService] Result after processing:', {
          result,
          type: typeof result,
          hasMessage: result && result.message,
          hashType
        });
              } catch (processError) {
          console.error('🔍 [QRCodeService] Error processing check-in/check-out:', processError);
          console.error('🔍 [QRCodeService] Process error details:', {
            error: processError.message,
            stack: processError.stack,
            hashType,
            userId: user._id
          });
          return {
            success: false,
            message: `Failed to process ${hashType === 'qr-checkin' ? 'check-in' : 'check-out'}: ${processError.message}`,
            data: null
          };
        }

      // Only increment hash usage if the operation was successful
      if (result && result.message && !result.message.includes('Already')) {
        staffHash.usageCount += 1;
        staffHash.lastUsed = new Date();
        await staffHash.save();
      }

      // Simplify message for phone display
      let phoneMessage = result.message;
      if (hashType === 'qr-checkin') {
        if (result.message.includes('Successfully clocked in for overtime')) {
          phoneMessage = 'Clocked in overtime';
        } else if (result.message.includes('Successfully clocked in')) {
          phoneMessage = 'Clocked in successfully';
        } else if (result.message.includes('Already clocked in today')) {
          phoneMessage = 'Already clocked in today';
        }
      } else if (hashType === 'qr-checkout') {
        if (result.message.includes('Successfully clocked out')) {
          phoneMessage = 'Clocked out successfully';
        } else if (result.message.includes('Early clock out')) {
          phoneMessage = 'Early clock out';
        }
      }

      // Get updated attendance status after the operation
      const updatedStatus = await this.getCurrentAttendanceStatus(user._id);

      return {
        success: true,
        message: phoneMessage,
        data: {
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          },
          action: hashType,
          timestamp: new Date(),
          currentStatus: updatedStatus, // Include updated status for automatic UI updates
          ...result.data
        }
      };
    } catch (error) {
      throw new Error(`Failed to verify hash: ${error.message}`);
    }
  }

  /**
   * Process staff check-in with daily limits and overtime checks
   * @param {string} userId - Staff member's user ID
   * @param {object} deviceInfo - Device information
   * @returns {Promise<{message: string, data: object}>} - Check-in result
   */
  static async processCheckIn(userId, deviceInfo = {}, isOvertimeCheckIn = false) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check if already clocked in today (both regular and overtime)
      const existingTimesheets = await Timesheet.find({
        userId,
        date: { $gte: today, $lt: tomorrow }
      }).sort({ createdAt: -1 });

      // Check if current time is within overtime hours
      const clockInTime = new Date();
      const currentHour = clockInTime.getHours();
      const currentMinute = clockInTime.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      
      const overtimeStartMinutes = 17 * 60; // 5:00 PM
      const overtimeEndMinutes = 1 * 60 + 30; // 1:30 AM
      
      let isWithinOvertimeHours = false;
      if (overtimeEndMinutes < overtimeStartMinutes) {
        // Overtime spans midnight
        isWithinOvertimeHours = currentTimeMinutes >= overtimeStartMinutes || currentTimeMinutes <= overtimeEndMinutes;
      } else {
        // Overtime within same day
        isWithinOvertimeHours = currentTimeMinutes >= overtimeStartMinutes && currentTimeMinutes <= overtimeEndMinutes;
      }

      // Check if user is already clocked in for regular hours (not overtime)
      const regularTimesheet = existingTimesheets.find(ts => !ts.isOvertime && ts.status === 'active');
      const overtimeTimesheet = existingTimesheets.find(ts => ts.isOvertime && ts.status === 'active');
      
      // Only return "Already clocked in today" if it's NOT overtime time and user has active regular timesheet
      if (regularTimesheet && regularTimesheet.clockIn && regularTimesheet.clockIn.time && !isOvertimeCheckIn && !isWithinOvertimeHours) {
        return {
          message: 'Already clocked in today',
          data: {
            clockInTime: regularTimesheet.clockIn.time,
            location: regularTimesheet.clockIn.location,
            attendanceStatus: regularTimesheet.clockIn.attendanceStatus
          }
        };
      }
      
      // Check if user is already clocked in for overtime
      if (overtimeTimesheet && overtimeTimesheet.clockIn && overtimeTimesheet.clockIn.time && isOvertimeCheckIn) {
        return {
          message: 'Already clocked in for overtime today',
          data: {
            clockInTime: overtimeTimesheet.clockIn.time,
            location: overtimeTimesheet.clockIn.location,
            attendanceStatus: overtimeTimesheet.clockIn.attendanceStatus
          }
        };
      }

      // Get user's department
      const user = await User.findById(userId).select('role');
      if (!user) {
        return {
          message: 'User not found',
          data: null
        };
      }

      let department = 'General';
      switch (user.role) {
        case 'doctor':
          department = 'Doctors/OPD';
          break;
        case 'nurse':
          department = 'Nurses/Ward';
          break;
        case 'lab':
          department = 'Laboratory';
          break;
        case 'reception':
          department = 'Reception';
          break;
        default:
          department = 'General';
      }

      // Determine if this is an overtime check-in
      const isOvertimeCheckInParam = isOvertimeCheckIn || isWithinOvertimeHours;
      
      // Calculate proper attendance status based on Ethiopian time
      let attendanceStatus = 'present-on-time';
      if (isOvertimeCheckInParam) {
        attendanceStatus = 'overtime-checkin';
      } else {
        attendanceStatus = EthiopianTime.getAttendanceStatus(clockInTime);
      }
      
      let timesheet;
      
      // Create or update timesheet based on overtime status
      if (isOvertimeCheckInParam && isWithinOvertimeHours) {
        // Create a new timesheet for overtime
        timesheet = new Timesheet({
          userId,
          date: today,
          clockIn: {
            time: clockInTime,
            location: deviceInfo.location || 'Main Office',
            method: 'qr-code',
            attendanceStatus: 'overtime-checkin' // Always set to overtime-checkin for overtime timesheets
          },
          department,
          status: 'active',
          isOvertime: true, // Mark as overtime timesheet
          totalWorkHours: 0, // Overtime timesheets start with 0 regular work hours
          overtimeHours: 0, // Will be calculated when clocked out
          notes: 'Overtime check-in'
        });
      } else {
        // Regular check-in - create new timesheet
        timesheet = new Timesheet({
          userId,
          date: today,
          clockIn: {
            time: clockInTime,
            location: deviceInfo.location || 'Main Office',
            method: 'qr-code',
            attendanceStatus: attendanceStatus
          },
          department,
          status: 'active',
          isOvertime: false,
          totalWorkHours: 0, // Will be calculated when clocked out
          overtimeHours: 0 // Will be calculated if they work past regular hours
        });
      }

      await timesheet.save();

      // Also update StaffAttendance model for the attendance overview
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find or create StaffAttendance record for today
        let staffAttendance = await StaffAttendance.findOne({
          userId,
          checkInTime: { $gte: today, $lt: tomorrow }
        });

        if (!staffAttendance) {
          // Create new StaffAttendance record
          staffAttendance = new StaffAttendance({
            userId,
            checkInTime: timesheet.clockIn.time,
            checkInLocation: timesheet.clockIn.location || 'Main Entrance',
            status: 'checked-in',
            attendanceStatus: timesheet.clockIn.attendanceStatus || attendanceStatus,
            notes: 'QR code check-in'
          });
        } else {
          // Update existing StaffAttendance record
          staffAttendance.status = 'checked-in';
          staffAttendance.checkInTime = timesheet.clockIn.time;
          staffAttendance.checkInLocation = timesheet.clockIn.location || 'Main Entrance';
          staffAttendance.attendanceStatus = timesheet.clockIn.attendanceStatus || attendanceStatus;
          staffAttendance.notes = 'QR code check-in';
        }

        await staffAttendance.save();
        console.log('🔍 [QRCodeService] Updated StaffAttendance for user:', userId);
      } catch (error) {
        console.error('🔍 [QRCodeService] Error updating StaffAttendance:', error);
        // Don't fail the check-in if StaffAttendance update fails
      }

      // Determine message based on attendance status and overtime
      let message = 'Successfully clocked in';
      if (timesheet.isOvertime) {
        message = 'Successfully clocked in for overtime (5:00 PM - 1:30 AM)';
      } else if (timesheet.clockIn.attendanceStatus === 'late') {
        message = `Clock in recorded (${timesheet.clockIn.minutesLate} minutes late)`;
      }

      const result = {
        message: message,
        data: {
          clockInTime: timesheet.clockIn.time,
          location: timesheet.clockIn.location,
          timesheetId: timesheet._id,
          attendanceStatus: timesheet.clockIn.attendanceStatus,
          minutesLate: timesheet.clockIn.minutesLate || 0,
          dayAttendanceStatus: timesheet.dayAttendanceStatus
        }
      };

      console.log('🔍 [QRCodeService] processCheckIn returning result:', result);
      return result;
    } catch (error) {
      throw new Error(`Failed to process check-in: ${error.message}`);
    }
  }

  /**
   * Process staff check-out with validation
   * @param {string} userId - Staff member's user ID
   * @param {object} deviceInfo - Device information
   * @returns {Promise<{message: string, data: object}>} - Check-out result
   */
  static async processCheckOut(userId, deviceInfo = {}) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find today's timesheets (both regular and overtime)
      const todayTimesheets = await Timesheet.find({
        userId,
        date: { $gte: today, $lt: tomorrow }
      }).sort({ createdAt: -1 });

      if (todayTimesheets.length === 0) {
        return {
          message: 'No timesheet found for today. Please clock in first.',
          data: null
        };
      }

      // Find the active timesheet (either regular or overtime)
      const activeTimesheet = todayTimesheets.find(ts => ts.status === 'active');
      
      if (!activeTimesheet) {
        return {
          message: 'No active timesheet found. You may have already clocked out.',
          data: null
        };
      }

      if (!activeTimesheet.clockIn || !activeTimesheet.clockIn.time) {
        return {
          message: 'No clock in record found. Please clock in first.',
          data: null
        };
      }

      if (activeTimesheet.clockOut && activeTimesheet.clockOut.time) {
        return {
          message: 'Already clocked out today',
          data: {
            clockInTime: activeTimesheet.clockIn.time,
            clockOutTime: activeTimesheet.clockOut.time,
            totalWorkHours: activeTimesheet.totalWorkHours,
            overtimeHours: activeTimesheet.overtimeHours
          }
        };
      }

      // Use the active timesheet for checkout
      const timesheet = activeTimesheet;

      const clockOutTime = new Date();
      const ethiopianTime = new Date(clockOutTime.getTime() + (3 * 60 * 60 * 1000)); // UTC+3

      // Check if early logout (before 11:00 AM Ethiopian time)
      const currentHour = ethiopianTime.getUTCHours();
      const currentMinute = ethiopianTime.getUTCMinutes();
      const currentTimeInMinutes = currentHour * 60 + currentMinute;
      const earlyThresholdInMinutes = 11 * 60; // 11:00 AM Ethiopian time
      const isEarlyClockOut = currentTimeInMinutes < earlyThresholdInMinutes;
      const minutesEarly = isEarlyClockOut ? earlyThresholdInMinutes - currentTimeInMinutes : 0;

      // Update timesheet with clock out
      timesheet.clockOut = {
        time: clockOutTime,
        location: deviceInfo.location || 'Main Office',
        method: 'qr-code',
        ethiopianTime: ethiopianTime,
        isEarlyClockOut: isEarlyClockOut,
        minutesEarly: minutesEarly
      };

      // Calculate work hours
      if (timesheet.clockIn && timesheet.clockIn.time) {
        const clockInTime = new Date(timesheet.clockIn.time);
        const workHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
        timesheet.totalWorkHours = Math.round(workHours * 100) / 100; // Round to 2 decimal places
      }

      // Update day attendance status based on clock in and clock out
      if (timesheet.clockIn?.attendanceStatus === 'late' && isEarlyClockOut) {
        timesheet.dayAttendanceStatus = 'partial';
      } else if (isEarlyClockOut) {
        timesheet.dayAttendanceStatus = 'early-clock-out';
      } else if (timesheet.clockIn?.attendanceStatus === 'late') {
        timesheet.dayAttendanceStatus = 'late';
      } else {
        timesheet.dayAttendanceStatus = 'present';
      }

      timesheet.status = 'completed';
      await timesheet.save();

      // Also update StaffAttendance model for the attendance overview
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find StaffAttendance record for today
        const staffAttendance = await StaffAttendance.findOne({
          userId,
          date: { $gte: today, $lt: tomorrow }
        });

        if (staffAttendance) {
          // Update existing StaffAttendance record
          staffAttendance.status = 'checked-out';
          staffAttendance.checkOutTime = timesheet.clockOut.time;
          staffAttendance.location = timesheet.clockOut.location;
          staffAttendance.method = 'qr-code';
          staffAttendance.totalWorkHours = timesheet.totalWorkHours || 0;
          staffAttendance.overtimeHours = timesheet.overtimeHours || 0;
          
          await staffAttendance.save();
          console.log('🔍 [QRCodeService] Updated StaffAttendance check-out for user:', userId);
        }
      } catch (error) {
        console.error('🔍 [QRCodeService] Error updating StaffAttendance check-out:', error);
        // Don't fail the check-out if StaffAttendance update fails
      }

      // Determine message based on early clock out
      let message = 'Successfully clocked out';
      if (timesheet.clockOut.isEarlyClockOut) {
        message = `Early clock out (${timesheet.clockOut.minutesEarly} minutes early)`;
      }

      return {
        message: message,
        data: {
          clockInTime: timesheet.clockIn.time,
          clockOutTime: timesheet.clockOut.time,
          totalWorkHours: timesheet.totalWorkHours,
          overtimeHours: timesheet.overtimeHours,
          overtimeMinutes: timesheet.overtimeMinutes,
          location: timesheet.clockOut.location,
          timesheetId: timesheet._id,
          isEarlyClockOut: timesheet.clockOut.isEarlyClockOut,
          minutesEarly: timesheet.clockOut.minutesEarly || 0,
          dayAttendanceStatus: timesheet.dayAttendanceStatus
        }
      };
    } catch (error) {
      throw new Error(`Failed to process check-out: ${error.message}`);
    }
  }

  /**
   * Get staff attendance history
   * @param {string} userId - Staff member's user ID
   * @param {object} options - Query options
   * @returns {Promise<Array>} - Attendance records
   */
  static async getAttendanceHistory(userId, options = {}) {
    try {
      const { limit = 30, skip = 0, startDate, endDate } = options;
      
      const query = { userId };
      
      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      const timesheets = await Timesheet.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'firstName lastName role');

      return timesheets;
    } catch (error) {
      throw new Error(`Failed to get attendance history: ${error.message}`);
    }
  }

  /**
   * Get current QR status for the user (for check-in/check-out modal)
   * @param {string} userId - Staff member's user ID
   * @returns {Promise<Object>} - Current status with canCheckIn/canCheckOut flags
   */
  static async getCurrentStatus(userId) {
    try {
      const attendanceStatus = await this.getCurrentAttendanceStatus(userId);
      
      if (!attendanceStatus) {
        return {
          status: 'checked_out',
          canCheckIn: true,
          canCheckOut: false,
          message: 'No attendance record - can check in',
          currentTime: new Date().toISOString()
        };
      }
      
      // Map attendance status to QR modal status
      const status = attendanceStatus.status;
      let qrStatus = 'checked_out';
      let canCheckIn = false;
      let canCheckOut = false;
      
      switch (status) {
        case 'not_clocked_in':
          qrStatus = 'checked_out';
          canCheckIn = true;
          canCheckOut = false;
          break;
        case 'clocked_in':
          qrStatus = 'checked_in';
          canCheckIn = false;
          canCheckOut = true;
          break;
        case 'clocked_out':
          qrStatus = 'checked_out';
          canCheckIn = true;
          canCheckOut = false;
          break;
        default:
          qrStatus = 'checked_out';
          canCheckIn = true;
          canCheckOut = false;
      }
      
      return {
        status: qrStatus,
        canCheckIn,
        canCheckOut,
        message: attendanceStatus.message || `Current status: ${qrStatus}`,
        currentTime: new Date().toISOString(),
        isOvertimeTime: attendanceStatus.isOvertimeTime,
        wasEarlyCheckOut: attendanceStatus.wasEarlyCheckOut,
        wasAutomaticClockOut: attendanceStatus.wasAutomaticClockOut || false,
        overtimeStartTime: attendanceStatus.overtimeStartTime,
        overtimeEndTime: attendanceStatus.overtimeEndTime,
        overlayMessage: attendanceStatus.overlayMessage,
        attendanceStatus
      };
    } catch (error) {
      console.error('Error getting current status:', error);
      return {
        status: 'checked_out',
        canCheckIn: true,
        canCheckOut: false,
        message: 'Error checking status - defaulting to checked out',
        currentTime: new Date().toISOString()
      };
    }
  }

  /**
   * Get current attendance status for a specific user with automatic disabling
   * @param {string} userId - Staff member's user ID
   * @returns {Promise<Object|null>} - Current attendance status or null
   */
  static async getCurrentAttendanceStatus(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's timesheets (both regular and overtime)
      const todayTimesheets = await Timesheet.find({
        userId,
        date: { $gte: today, $lt: tomorrow }
      }).populate('userId', 'firstName lastName role email').sort({ createdAt: -1 });

      // Get the most recent timesheet - prioritize active timesheets over completed ones
      // This ensures that if someone is currently checked in, we show that status
      const timesheet = todayTimesheets.find(ts => ts.status === 'active') || 
                       todayTimesheets.find(ts => ts.status === 'completed') || 
                       todayTimesheets[0];


      // If no timesheet today, user can check in
      if (!timesheet) {
        // Calculate if current time is overtime hours
        const now = new Date();
        const ethiopianNow = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // UTC+3
        const currentHour = ethiopianNow.getUTCHours();
        const currentMinute = ethiopianNow.getUTCMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        const overtimeStartMinutes = 17 * 60; // 5:00 PM
        const overtimeEndMinutes = 1 * 60 + 30; // 1:30 AM
        
        let isWithinOvertimeHours = false;
        if (overtimeEndMinutes < overtimeStartMinutes) {
          isWithinOvertimeHours = currentTimeMinutes >= overtimeStartMinutes || currentTimeMinutes <= overtimeEndMinutes;
        } else {
          isWithinOvertimeHours = currentTimeMinutes >= overtimeStartMinutes && currentTimeMinutes <= overtimeEndMinutes;
        }
        
        return {
          userId,
          status: 'not_clocked_in',
          canCheckIn: true,
          canCheckOut: false,
          message: 'No timesheet for today - can check in',
          todayRecord: null,
          isOvertimeTime: isWithinOvertimeHours,
          overtimeStartTime: '5:00 PM',
          overtimeEndTime: '1:30 AM'
        };
      }

      // Check current status
      if (!timesheet.clockIn || !timesheet.clockIn.time) {
        // Calculate if current time is overtime hours
        const now = new Date();
        const ethiopianNow = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // UTC+3
        const currentHour = ethiopianNow.getUTCHours();
        const currentMinute = ethiopianNow.getUTCMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        const overtimeStartMinutes = 17 * 60; // 5:00 PM
        const overtimeEndMinutes = 1 * 60 + 30; // 1:30 AM
        
        let isWithinOvertimeHours = false;
        if (overtimeEndMinutes < overtimeStartMinutes) {
          isWithinOvertimeHours = currentTimeMinutes >= overtimeStartMinutes || currentTimeMinutes <= overtimeEndMinutes;
        } else {
          isWithinOvertimeHours = currentTimeMinutes >= overtimeStartMinutes && currentTimeMinutes <= overtimeEndMinutes;
        }
        
        return {
          userId: timesheet.userId._id,
          firstName: timesheet.userId.firstName,
          lastName: timesheet.userId.lastName,
          role: timesheet.userId.role,
          email: timesheet.userId.email,
          status: 'not_clocked_in',
          canCheckIn: true,
          canCheckOut: false,
          message: 'Not clocked in today - can check in',
          isOvertimeTime: isWithinOvertimeHours,
          overtimeStartTime: '5:00 PM',
          overtimeEndTime: '1:30 AM'
        };
      }

      if (timesheet.clockOut && timesheet.clockOut.time) {
        // User has completed a timesheet (either regular or overtime)
        // Check if there's an active overtime timesheet
        const activeOvertimeTimesheet = await Timesheet.findOne({
          userId,
          date: { $gte: today, $lt: tomorrow },
          isOvertime: true,
          status: 'active'
        });

        if (activeOvertimeTimesheet) {
          // User is currently checked in for overtime
          return {
            userId: activeOvertimeTimesheet.userId._id,
            firstName: activeOvertimeTimesheet.userId.firstName,
            lastName: activeOvertimeTimesheet.userId.lastName,
            role: activeOvertimeTimesheet.userId.role,
            email: activeOvertimeTimesheet.userId.email,
            checkInTime: activeOvertimeTimesheet.clockIn.time,
            status: 'clocked_in_overtime',
            canCheckIn: false,
            canCheckOut: true,
            message: 'Currently clocked in for overtime - can check out',
            dayAttendanceStatus: activeOvertimeTimesheet.dayAttendanceStatus,
            isOvertime: true,
            overtimeStartTime: '5:00 PM',
            overtimeEndTime: '1:30 AM'
          };
        }
        
        // User has completed their timesheet - check if they can check in for overtime
        const now = new Date();
        const ethiopianNow = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // UTC+3
        const currentHour = ethiopianNow.getUTCHours();
        const currentMinute = ethiopianNow.getUTCMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        // Overtime hours: 17:00 (5:00 PM) to 01:30 (1:30 AM next day)
        const overtimeStartMinutes = 17 * 60; // 5:00 PM
        const overtimeEndMinutes = 1 * 60 + 30; // 1:30 AM
        
        let isWithinOvertimeHours = false;
        
        if (overtimeEndMinutes < overtimeStartMinutes) {
          // Overtime spans midnight (5:00 PM to 1:30 AM next day)
          isWithinOvertimeHours = currentTimeMinutes >= overtimeStartMinutes || currentTimeMinutes <= overtimeEndMinutes;
        } else {
          // Overtime within same day
          isWithinOvertimeHours = currentTimeMinutes >= overtimeStartMinutes && currentTimeMinutes <= overtimeEndMinutes;
        }
        
        // Format current Ethiopian time for display
        const currentTimeString = ethiopianNow.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
        
        // Check if this was an early check-out (before 11:00 AM Ethiopian time)
        const checkOutEthiopianTime = new Date(timesheet.clockOut.time.getTime() + (3 * 60 * 60 * 1000)); // UTC+3
        const checkOutHour = checkOutEthiopianTime.getUTCHours();
        const checkOutMinute = checkOutEthiopianTime.getUTCMinutes();
        const checkOutTimeMinutes = checkOutHour * 60 + checkOutMinute;
        const earlyThresholdMinutes = 11 * 60; // 11:00 AM Ethiopian time
        const wasEarlyCheckOut = checkOutTimeMinutes < earlyThresholdMinutes;
        
        // Check if this was an automatic clock-out for overtime transition
        const wasAutomaticClockOut = timesheet.clockOut?.automaticReason === 'overtime_transition';
        
        // Check if there's an existing overtime timesheet
        const overtimeTimesheet = await Timesheet.findOne({
          userId,
          date: { $gte: today, $lt: tomorrow },
          isOvertime: true
        });
        
        // Determine if user can check in for overtime
        let canCheckInOvertime = false;
        let overtimeMessage = '';
        let overlayMessage = '';
        let canCheckOut = false;
        
        // Handle automatic clock-out for overtime transition
        if (wasAutomaticClockOut) {
          // User was automatically clocked out when regular hours ended
          canCheckOut = false;
          
          if (isWithinOvertimeHours) {
            if (overtimeTimesheet) {
              // User already has overtime timesheet
              if (overtimeTimesheet.clockOut && overtimeTimesheet.clockOut.time) {
                // Overtime completed
                canCheckInOvertime = false;
                overtimeMessage = `Current time: ${currentTimeString} - Overtime already completed`;
                overlayMessage = 'Overtime completed for today. You were automatically clocked out when regular hours ended.';
              } else {
                // Overtime check-in in progress
                canCheckInOvertime = false;
                overtimeMessage = `Current time: ${currentTimeString} - Already checked in for overtime`;
                overlayMessage = 'Currently working overtime. You were automatically clocked out when regular hours ended.';
              }
            } else {
              // No overtime timesheet yet, can check in for overtime
              canCheckInOvertime = true;
              overtimeMessage = `Current time: ${currentTimeString} - Overtime check-in available (5:00 PM - 1:30 AM)`;
              overlayMessage = 'Overtime check-in available! You were automatically clocked out when regular hours ended.';
            }
          } else {
            // Outside overtime hours, show when overtime becomes available
            const timeUntilOvertime = overtimeStartMinutes - currentTimeMinutes;
            const hoursUntilOvertime = Math.floor(timeUntilOvertime / 60);
            const minutesUntilOvertime = timeUntilOvertime % 60;
            
            if (timeUntilOvertime > 0) {
              overtimeMessage = `Current time: ${currentTimeString} - Overtime check-in available in ${hoursUntilOvertime}h ${minutesUntilOvertime}m (5:00 PM - 1:30 AM)`;
              overlayMessage = `Overtime check-in available in ${hoursUntilOvertime}h ${minutesUntilOvertime}m. You were automatically clocked out when regular hours ended.`;
              // Allow check-in when overtime is approaching (within 1 hour)
              canCheckInOvertime = timeUntilOvertime <= 60;
            } else {
              overtimeMessage = `Current time: ${currentTimeString} - Overtime check-in available (5:00 PM - 1:30 AM)`;
              overlayMessage = 'Overtime check-in available! You were automatically clocked out when regular hours ended.';
              canCheckInOvertime = true;
            }
          }
        } else if (wasEarlyCheckOut) {
          // User checked out early - they can't check out again, but can check in for overtime
          canCheckOut = false;
          
          if (isWithinOvertimeHours) {
            if (overtimeTimesheet) {
              // User already has overtime timesheet
              if (overtimeTimesheet.clockOut && overtimeTimesheet.clockOut.time) {
                // Overtime completed
                canCheckInOvertime = false;
                overtimeMessage = `Current time: ${currentTimeString} - Overtime already completed`;
                overlayMessage = 'Overtime completed for today. You checked out early and completed overtime.';
              } else {
                // Overtime check-in in progress
                canCheckInOvertime = false;
                overtimeMessage = `Current time: ${currentTimeString} - Already checked in for overtime`;
                overlayMessage = 'Currently working overtime. You checked out early from regular hours.';
              }
            } else {
              // No overtime timesheet yet, can check in for overtime
              canCheckInOvertime = true;
              overtimeMessage = `Current time: ${currentTimeString} - Overtime check-in available (5:00 PM - 1:30 AM)`;
              overlayMessage = 'Overtime check-in available! You checked out early from regular hours.';
            }
          } else {
            // Outside overtime hours, show when overtime becomes available
            const timeUntilOvertime = overtimeStartMinutes - currentTimeMinutes;
            const hoursUntilOvertime = Math.floor(timeUntilOvertime / 60);
            const minutesUntilOvertime = timeUntilOvertime % 60;
            
            if (timeUntilOvertime > 0) {
              overtimeMessage = `Current time: ${currentTimeString} - Overtime check-in available in ${hoursUntilOvertime}h ${minutesUntilOvertime}m (5:00 PM - 1:30 AM)`;
              overlayMessage = `Overtime check-in available in ${hoursUntilOvertime}h ${minutesUntilOvertime}m. You checked out early from regular hours.`;
              // Allow check-in when overtime is approaching (within 1 hour)
              canCheckInOvertime = timeUntilOvertime <= 60;
            } else {
              overtimeMessage = `Current time: ${currentTimeString} - Overtime check-in available (5:00 PM - 1:30 AM)`;
              overlayMessage = 'Overtime check-in available! You checked out early from regular hours.';
              canCheckInOvertime = true;
            }
          }
        } else {
          // Normal check-out (after 11:00 AM) - can check in for overtime
          canCheckOut = false;
          
          if (isWithinOvertimeHours) {
            if (overtimeTimesheet) {
              // User already has overtime timesheet
              if (overtimeTimesheet.clockOut && overtimeTimesheet.clockOut.time) {
                // Overtime completed
                canCheckInOvertime = false;
                overtimeMessage = `Current time: ${currentTimeString} - Overtime already completed`;
                overlayMessage = 'Overtime completed for today. Regular work day completed.';
              } else {
                // Overtime check-in in progress
                canCheckInOvertime = false;
                overtimeMessage = `Current time: ${currentTimeString} - Already checked in for overtime`;
                overlayMessage = 'Currently working overtime. Regular work day completed.';
              }
            } else {
              // No overtime timesheet yet, can check in for overtime
              canCheckInOvertime = true;
              overtimeMessage = `Current time: ${currentTimeString} - Overtime check-in available (5:00 PM - 1:30 AM)`;
              overlayMessage = 'Overtime check-in available! Regular work day completed.';
            }
          } else {
            // Outside overtime hours, show when overtime becomes available
            const timeUntilOvertime = overtimeStartMinutes - currentTimeMinutes;
            const hoursUntilOvertime = Math.floor(timeUntilOvertime / 60);
            const minutesUntilOvertime = timeUntilOvertime % 60;
            
            if (timeUntilOvertime > 0) {
              overtimeMessage = `Current time: ${currentTimeString} - Overtime check-in available in ${hoursUntilOvertime}h ${minutesUntilOvertime}m (5:00 PM - 1:30 AM)`;
              overlayMessage = `Overtime check-in available in ${hoursUntilOvertime}h ${minutesUntilOvertime}m. Regular work day completed.`;
              // Allow check-in when overtime is approaching (within 1 hour)
              canCheckInOvertime = timeUntilOvertime <= 60;
            } else {
              overtimeMessage = `Current time: ${currentTimeString} - Overtime check-in available (5:00 PM - 1:30 AM)`;
              overlayMessage = 'Overtime check-in available! Regular work day completed.';
              canCheckInOvertime = true;
            }
          }
        }
        
        // Allow overtime check-in preparation from 11:00 AM onwards if checked out early
        const localHour = now.getHours();
        const localMinutes = now.getMinutes();
        const localTimeInMinutes = localHour * 60 + localMinutes;
        const overtimePrepStartTime = 11 * 60; // 11:00 AM in minutes
        
        // Can prepare for overtime from 11:00 AM, can actually check in from 5:00 PM
        const canPrepareForOvertime = localTimeInMinutes >= overtimePrepStartTime && !(overtimeTimesheet && overtimeTimesheet.clockOut && overtimeTimesheet.clockOut.time);
        const canActuallyCheckInForOvertime = isWithinOvertimeHours && !(overtimeTimesheet && overtimeTimesheet.clockOut && overtimeTimesheet.clockOut.time);
        
        return {
          userId: timesheet.userId._id,
          firstName: timesheet.userId.firstName,
          lastName: timesheet.userId.lastName,
          role: timesheet.userId.role,
          email: timesheet.userId.email,
          checkInTime: timesheet.clockIn.time,
          checkOutTime: timesheet.clockOut.time,
          totalWorkHours: timesheet.totalWorkHours,
          overtimeHours: timesheet.overtimeHours,
          status: 'clocked_out',
          canCheckIn: canPrepareForOvertime, // Can prepare from 11:00 AM, check in from 5:00 PM
          canCheckOut: false, // DISABLED: Can't check out after already checking out
          isOvertimeTime: canPrepareForOvertime, // Show as overtime time from 11:00 AM onwards
          wasEarlyCheckOut: wasEarlyCheckOut, // Flag to indicate early check-out
          wasAutomaticClockOut: wasAutomaticClockOut, // Flag to indicate automatic clock-out
          automaticReason: wasAutomaticClockOut ? timesheet.clockOut.automaticReason : null,
          currentTime: currentTimeString,
          message: canActuallyCheckInForOvertime ? 'Overtime check-in available now (5:00 PM - 1:30 AM)' :
                   canPrepareForOvertime ? 'Overtime check-in preparation available (active at 5:00 PM)' :
                   overtimeTimesheet && overtimeTimesheet.clockOut ? 'Overtime already completed' :
                   'Overtime check-in available from 11:00 AM onwards',
          overlayMessage: canActuallyCheckInForOvertime ? 'Overtime check-in available now!' :
                         canPrepareForOvertime ? 'You can prepare for overtime check-in (active at 5:00 PM).' :
                         overtimeTimesheet && overtimeTimesheet.clockOut ? 'Overtime completed for today.' :
                         'Overtime check-in available from 11:00 AM onwards.',
          dayAttendanceStatus: timesheet.dayAttendanceStatus,
          overtimeStartTime: '5:00 PM',
          overtimeEndTime: '1:30 AM'
        };
      }

      // Currently clocked in - can only check out
      // Calculate if current time is overtime hours
      const now = new Date();
      const ethiopianNow = new Date(now.getTime() + (3 * 60 * 60 * 1000)); // UTC+3
      const currentHour = ethiopianNow.getUTCHours();
      const currentMinute = ethiopianNow.getUTCMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      
      const overtimeStartMinutes = 17 * 60; // 5:00 PM
      const overtimeEndMinutes = 1 * 60 + 30; // 1:30 AM
      
      let isWithinOvertimeHours = false;
      if (overtimeEndMinutes < overtimeStartMinutes) {
        isWithinOvertimeHours = currentTimeMinutes >= overtimeStartMinutes || currentTimeMinutes <= overtimeEndMinutes;
      } else {
        isWithinOvertimeHours = currentTimeMinutes >= overtimeStartMinutes && currentTimeMinutes <= overtimeEndMinutes;
      }
      
      return {
        userId: timesheet.userId._id,
        firstName: timesheet.userId.firstName,
        lastName: timesheet.userId.lastName,
        role: timesheet.userId.role,
        email: timesheet.userId.email,
        checkInTime: timesheet.clockIn.time,
        status: 'clocked_in',
        canCheckIn: false,
        canCheckOut: true,
        message: timesheet.isOvertime ? 'Currently clocked in for overtime - can check out' : 'Currently clocked in - can check out',
        dayAttendanceStatus: timesheet.dayAttendanceStatus,
        minutesLate: timesheet.clockIn.minutesLate || 0,
        isOvertime: timesheet.isOvertime || false,
        isOvertimeTime: isWithinOvertimeHours,
        overtimeStartTime: '5:00 PM',
        overtimeEndTime: '1:30 AM'
      };

    } catch (error) {
      throw new Error(`Failed to get current attendance status: ${error.message}`);
    }
  }

  /**
   * Calculate duration since check-in
   * @param {Date} checkInTime - Check-in timestamp
   * @returns {string} - Formatted duration
   */
  static calculateDuration(checkInTime) {
    const now = new Date();
    const diffMs = now - checkInTime;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  }

  /**
   * Mark users as absent if they haven't checked in by end of working day
   * @param {Date} date - Date to check (defaults to today)
   * @returns {Promise<{success: boolean, message: string, absentCount: number}>}
   */
  static async markAbsentUsers(date = new Date()) {
    try {
      const today = new Date(date);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Get all active users
      const activeUsers = await User.find({ isActive: true });
      
      let absentCount = 0;
      
      for (const user of activeUsers) {
        // Check if user has any timesheet for today
        const todayTimesheet = await Timesheet.findOne({
          userId: user._id,
          date: { $gte: today, $lt: tomorrow }
        });
        
        // If no timesheet found, create absent record
        if (!todayTimesheet) {
          const absentTimesheet = new Timesheet({
            userId: user._id,
            date: today,
            department: user.role === 'doctor' ? 'Doctors/OPD' : 
                      user.role === 'nurse' ? 'Nurses/Ward' :
                      user.role === 'lab' ? 'Laboratory' :
                      user.role === 'reception' ? 'Reception' : 'General',
            dayAttendanceStatus: 'absent',
            status: 'completed',
            notes: 'Automatically marked absent - no check-in recorded'
          });
          
          await absentTimesheet.save();
          absentCount++;
        }
      }
      
      return {
        success: true,
        message: `Marked ${absentCount} users as absent for ${date.toDateString()}`,
        absentCount
      };
    } catch (error) {
      console.error('Error marking absent users:', error);
      return {
        success: false,
        message: 'Failed to mark absent users',
        error: error.message
      };
    }
  }

  /**
   * Get attendance summary for a specific date with Ethiopian time classification
   * @param {Date} date - Date to get summary for
   * @returns {Promise<{success: boolean, data: object}>}
   */
  static async getAttendanceSummary(date = new Date()) {
    try {
      const startOfWorkingDay = EthiopianTime.getStartOfWorkingDay(date);
      const endOfWorkingDay = EthiopianTime.getEndOfWorkingDay(date);
      
      const attendanceRecords = await StaffAttendance.find({
        checkInTime: {
          $gte: startOfWorkingDay,
          $lte: endOfWorkingDay
        }
      }).populate('userId', 'firstName lastName role department');
      
      const summary = {
        date: date.toDateString(),
        totalStaff: 0,
        presentOnTime: 0,
        latePresent: 0,
        absent: 0,
        checkedIn: 0,
        checkedOut: 0,
        details: []
      };
      
      // Count by attendance status
      attendanceRecords.forEach(record => {
        summary.totalStaff++;
        
        switch (record.attendanceStatus) {
          case 'present-on-time':
            summary.presentOnTime++;
            break;
          case 'late-present':
            summary.latePresent++;
            break;
          case 'absent':
            summary.absent++;
            break;
        }
        
        if (record.status === 'checked-in') {
          summary.checkedIn++;
        } else if (record.status === 'checked-out') {
          summary.checkedOut++;
        }
        
        summary.details.push({
          userId: record.userId._id,
          name: `${record.userId.firstName} ${record.userId.lastName}`,
          role: record.userId.role,
          department: record.userId.department,
          attendanceStatus: record.attendanceStatus,
          checkInTime: record.checkInTime,
          isWithinWorkingHours: record.isWithinWorkingHours
        });
      });
      
      return {
        success: true,
        data: summary
      };
    } catch (error) {
      console.error('Error getting attendance summary:', error);
      return {
        success: false,
        message: 'Failed to get attendance summary',
        error: error.message
      };
    }
  }
}

module.exports = QRCodeService;
