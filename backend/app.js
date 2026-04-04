const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const path = require('path');
const config = require('./config');
require('./config/tenantIsolation');
const { logger, notFound, errorHandler, corsErrorHandler } = require('./middleware/errorHandler');
const { corsMiddleware, handleOptions } = require('./middleware/corsMiddleware');
const { apiLimiter, authLimiter } = require('./middleware/rateLimitMiddleware');
const { setupCacheRoutes } = require('./middleware/cacheMiddleware');
const { initializeDefaultCardTypes } = require('./controllers/cardTypeController');
const { tenantContextMiddleware } = require('./middleware/tenantContext');
const { auth } = require('./middleware/auth');
// Temporarily disabled to fix server startup issues
// const { validatePaymentStatusData, logPaymentStatusCorrections } = require('./middleware/paymentStatusValidationMiddleware');

/**
 * Initialize Express application
 * @returns {express.Application} Configured Express app
 */
const createApp = () => {
  // Create Express app
  const app = express();
  
  // =========================================
  // MIDDLEWARE - BEFORE ROUTES
  // =========================================
  
  // Security headers with helmet
  app.use(helmet());
  
  // Add compression middleware to improve response time
  app.use(compression());
  
  // Request logging middleware
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
  });
  
  // Set performance-related headers
  app.use((req, res, next) => {
    // Cache static assets for 1 day
    if (req.url.match(/\.(css|js|jpg|png|gif|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
    next();
  });
  
  // CORS middleware setup - try the advanced one first, fallback to simple CORS
  try {
    app.use(corsMiddleware);
  } catch (corsError) {
    console.warn('Advanced CORS middleware failed, using simple CORS:', corsError.message);
    // Fallback to simple CORS configuration
    app.use(require('cors')({
      origin: ['http://localhost:5175', 'http://127.0.0.1:5175', 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'x-clinic-id',
        'X-Clinic-Id'
      ]
    }));
  }
  
  // Enable pre-flight requests for all routes using a dedicated OPTIONS handler
  // This ensures proper Access-Control-* headers are always set for CORS preflight
  app.options('*', handleOptions);
  
  // Prevent NoSQL injection attacks
  app.use(mongoSanitize());
  
  // Parse JSON and URL-encoded request bodies
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(tenantContextMiddleware);
  
  // Payment Status Validation Middleware - Automatically corrects incorrect payment status data
  // Temporarily disabled to fix server startup issues
  // app.use(validatePaymentStatusData);
  // app.use(logPaymentStatusCorrections);
  
  // =========================================
  // HEALTH CHECK - Must be before any other middleware
  // =========================================
  
  // Root ping for server availability checks
  app.get('/ping', (req, res) => {
    res.status(200).json({ 
      success: true, 
      message: 'API server is running', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });
  
  // Serve web version as main page
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../mobile-app/web-version.html'));
  });
  
  // CACHE-BYPASS ROUTE - Use this to test if browser cache is the issue
  app.get('/test-qr', (req, res) => {
    const { hash, type, userId } = req.query;
    console.log('🚀 CACHE-BYPASS QR request:', { hash, type, userId });
    
    if ((type === 'checkin' || type === 'checkout') && hash && userId) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
      
      const actionText = type === 'checkin' ? 'Check-in' : 'Check-out';
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>CACHE-BYPASS ${actionText}</title>
          <style>body { font-family: Arial, sans-serif; padding: 20px; }</style>
        </head>
        <body>
          <h1 id="status">🚀 CACHE-BYPASS ACTIVE</h1>
          <script>
            document.getElementById('status').innerHTML = '🔍 Testing device...';
            document.body.style.background = 'lightgreen';
            
            var staffUserId = localStorage.getItem('staffUserId') || localStorage.getItem('clinic_staffUserId');
            var expectedUserId = ${JSON.stringify(userId)};
            var deviceRegistered = localStorage.getItem('deviceRegistered') || localStorage.getItem('clinic_deviceRegistered');
            var staffHash = localStorage.getItem('staffHash') || localStorage.getItem('clinic_staffHash');
            
            // Instead of localStorage, validate via backend API
            setTimeout(async function() {
              try {
                document.getElementById('status').innerHTML = '🔍 Checking with server...';
                
                const response = await fetch('/api/qr/staff-registration-status/' + expectedUserId);
                const result = await response.json();
                
                if (result.success && result.isRegistered) {
                  // Device is registered, proceed with check-in
                  document.body.innerHTML = '<h1>✅ Processing ${type}...</h1><p>Device validated, processing...</p>';
                  
                  const payload = {
                    type: ${JSON.stringify(type)},
                    userId: ${JSON.stringify(userId)},
                    hash: ${JSON.stringify(hash)},
                    timestamp: new Date().toISOString()
                  };
                  
                  const checkInResponse = await fetch('/api/qr/verify-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });
                  const checkInResult = await checkInResponse.json();
                  
                  if (checkInResponse.ok && checkInResult.success) {
                    document.body.innerHTML = '<h1>✅ ${type === 'checkin' ? 'Check-in' : 'Check-out'} Successful!</h1><button onclick="window.close()">Close</button>';
                  } else {
                    document.body.innerHTML = '<h1>❌ ${type === 'checkin' ? 'Check-in' : 'Check-out'} Failed</h1><p>' + (checkInResult.message || 'Unknown error') + '</p><button onclick="window.close()">Close</button>';
                  }
                } else {
                  document.body.innerHTML = '<h1>❌ Device Not Registered</h1><p>Please register your device first.</p><button onclick="window.close()">Close</button>';
                }
              } catch (e) {
                document.body.innerHTML = '<h1>❌ Error</h1><p>Connection error: ' + e.message + '</p><button onclick="window.close()">Close</button>';
              }
            }, 1000);
          </script>
        </body>
        </html>
      `);
    } else {
      res.send('<h1>Test Route - Invalid Parameters</h1>');
    }
  });

  // Handle QR verification for browser scanning
  app.get('/verify-qr', (req, res) => {
    const { hash, userId, type } = req.query;
    
    // If it's a staff registration QR code, process it directly
    if (type === 'staff-registration' && hash && userId) {
      console.log('🔍 Direct QR registration processing:', { hash, userId, type });
      
      // Process the registration directly
      processQRRegistration(hash, userId, res, req);
    } else if ((type === 'checkin' || type === 'checkout') && hash && userId) {
      console.log('🔍 QR check-in/out requested via GET, serving secure client bridge page');
      
      // Set headers to allow inline scripts and prevent caching
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('ETag', Math.random().toString());
      
      // IMPORTANT: Do NOT process check-in/out directly on GET.
      // Serve a minimal page that posts to the secured POST API with device fingerprint from localStorage
      const actionText = type === 'checkin' ? 'Check-in' : 'Check-out';
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${actionText} - ${Date.now()}</title>
          <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
          <meta http-equiv="Pragma" content="no-cache">
          <meta http-equiv="Expires" content="0">
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            .msg { margin: 12px 0; }
            .ok { color: #1b5e20 }
            .err { color: #b71c1c }
          </style>
        </head>
        <body>
          <h1 id="status">⏳ Processing ${actionText}...</h1>
          <script>
            (async function() {
              // Minimal, robust flow: rely on server-side fingerprint from headers
              try {
                document.body.style.background = '#f0f7ff';
                document.getElementById('status').style.color = '#0b5394';

                const payload = {
                  type: ${JSON.stringify(type)},
                  userId: ${JSON.stringify(userId)},
                  hash: ${JSON.stringify(hash)},
                  timestamp: new Date().toISOString(),
                  // Do NOT send client fingerprint; server will derive from headers securely
                  deviceInfo: { userAgent: navigator.userAgent, platform: navigator.platform }
                };

                const resp = await fetch('/api/qr/verify-url', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload)
                });

                const result = await resp.json().catch(() => ({}));
                if (resp.ok && result && result.success) {
                  document.body.innerHTML = '<h1 class="ok">✅ ${actionText} Successful</h1><div class="msg">You have been ${type === 'checkin' ? 'checked in' : 'checked out'}.</div>';
                } else {
                  const msg = (result && (result.message || result.error)) || 'Device not registered or verification failed';
                  document.body.innerHTML = '<h1 class="err">❌ ${actionText} Failed</h1><div class="msg">' + msg + '</div>';
                }
              } catch (e) {
                document.body.innerHTML = '<h1 class="err">❌ Error</h1><div class="msg">' + (e && e.message ? e.message : 'Unexpected error') + '</div>';
              }
            })();
          </script>
        </body>
        </html>
      `);
    } else {
      // Serve the web version
      res.sendFile(path.join(__dirname, '../mobile-app/web-version.html'));
    }
  });
  
  // Function to process QR registration directly
  async function processQRRegistration(hash, userId, res, req) {
    try {
      console.log('📱 Processing QR registration directly:', { hash: hash.substring(0, 10) + '...', userId });
      
      // For staff registration, we need to verify the hash exists and mark device as registered
      const StaffHash = require('./models/StaffHash');
      const User = require('./models/User');
      
      // Find the hash in database
      const staffHash = await StaffHash.findOne({ 
        uniqueHash: hash, 
        isActive: true,
        hashType: 'staff-registration'
      }).populate('userId');
      
      if (!staffHash) {
        throw new Error('Invalid or expired registration QR code');
      }
      
      // Verify the user ID matches
      if (staffHash.userId._id.toString() !== userId) {
        throw new Error('QR code does not match the user');
      }
      
      // Get user information
      const user = await User.findById(userId).select('firstName lastName email role');
      if (!user) {
        throw new Error('User not found');
      }
      
      // Create a proper device registration record
      const DeviceRegistration = require('./models/DeviceRegistration');
      
      // Generate device fingerprint based on browser characteristics
      // This should be consistent for the same device/browser combination
      const userAgent = req.headers['user-agent'] || 'unknown';
      const acceptLanguage = req.headers['accept-language'] || 'unknown';
      const acceptEncoding = req.headers['accept-encoding'] || 'unknown';
      
      // Create a device fingerprint that's consistent for the same device
      // Use only browser characteristics, NOT the QR code hash
      const cryptoLib = require('crypto');
      const deviceFingerprint = cryptoLib.createHash('sha256')
        .update(userAgent + acceptLanguage + acceptEncoding + 'browser-device-fingerprint')
        .digest('hex');
      // Lite fingerprint that ignores Accept-Encoding differences
      const deviceFingerprintLite = cryptoLib.createHash('sha256')
        .update(userAgent + acceptLanguage + 'browser-device-fingerprint-lite')
        .digest('hex');
      // Ultra-lite fingerprint that uses only userAgent (last-resort migration aid)
      const deviceFingerprintUltra = cryptoLib.createHash('sha256')
        .update(userAgent + 'browser-device-fingerprint-ultra')
        .digest('hex');
      
      // ENHANCED SECURITY: Check for existing device registrations with better duplicate prevention
      // Check 1: User already has an active device registration
      const userExistingDevice = await DeviceRegistration.findOne({
        userId: userId,
        isActive: true
      });

      // Check 2: This device fingerprint is already registered to ANY user (prevents device sharing)
      const deviceExistingUser = await DeviceRegistration.findOne({
        deviceFingerprint: deviceFingerprint,
        isActive: true
      });

      // Check 3: This specific combination already exists (exact duplicate)
      const exactDuplicate = await DeviceRegistration.findOne({
        userId: userId,
        deviceFingerprint: deviceFingerprint,
        isActive: true
      });

      console.log('🔍 [REGISTRATION] Checking for conflicts:', {
        userId: userId,
        deviceFingerprint: deviceFingerprint.substring(0, 10) + '...',
        userHasDevice: !!userExistingDevice,
        deviceUsedByOther: !!deviceExistingUser,
        exactDuplicate: !!exactDuplicate
      });

      // Handle exact duplicate (same user, same device) - just refresh
      if (exactDuplicate) {
        console.log('✅ [REGISTRATION] Exact duplicate found - refreshing existing registration');
        exactDuplicate.lastUsed = new Date();
        exactDuplicate.deviceHash = hash;
        exactDuplicate.staffHashId = staffHash._id;
        await exactDuplicate.save();
        console.log('✅ Device registration refreshed for same user-device combination');
      }
      // Handle device already used by another user - BLOCK
      else if (deviceExistingUser) {
        const existingUser = await User.findById(deviceExistingUser.userId).select('firstName lastName email role');
        console.log('❌ [REGISTRATION] Device already registered to different user:', {
          existingUser: existingUser?.email,
          newUser: user.email,
          deviceFingerprint: deviceFingerprint.substring(0, 10) + '...'
        });

        res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Device Already Registered</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ffe6e6; }
              .error { color: #f44336; font-size: 24px; margin: 20px 0; }
              .info { color: #666; margin: 10px 0; }
              .warning { color: #ff9800; font-size: 18px; margin: 20px 0; font-weight: bold; }
              .button { background: #f44336; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin: 20px; }
            </style>
          </head>
          <body>
            <h1>❌ This Device Is Already Registered!</h1>
            <div class="error">This device is already registered to another staff member</div>
            <div class="warning">Only one staff member per device is allowed</div>
            <div class="info">Registered to: ${existingUser?.firstName} ${existingUser?.lastName}</div>
            <div class="info">Email: ${existingUser?.email}</div>
            <div class="info">Role: ${existingUser?.role}</div>
            <div class="info">Registration time: ${deviceExistingUser.registeredAt.toLocaleString()}</div>
            <div class="info">To use this device, please contact your administrator to clear the registration</div>
            <button class="button" onclick="window.close()">Close</button>
          </body>
          </html>
        `);
        return;
      }
      // Handle user already has a different device - ALLOW but warn (flexible policy)
      else if (userExistingDevice) {
        console.log('⚠️ [REGISTRATION] User has existing device but registering new one - allowing with warning');

        // Log this as a device change for audit purposes
        console.log('📋 [AUDIT] Device change detected:', {
          userId: userId,
          oldDevice: userExistingDevice.deviceFingerprint.substring(0, 10) + '...',
          newDevice: deviceFingerprint.substring(0, 10) + '...',
          oldRegistration: userExistingDevice.registeredAt
        });

        // Deactivate old device registration
        userExistingDevice.isActive = false;
        await userExistingDevice.save();

        // Continue with new registration (this will create the new record below)
      } else {
        // Check if this DEVICE is already registered to another user
        const deviceExistingUser = await DeviceRegistration.findOne({
          deviceFingerprint: deviceFingerprint,
          isActive: true
        });
        
        if (deviceExistingUser) {
          // This device is registered to a different user
          const existingUser = await User.findById(deviceExistingUser.userId).select('firstName lastName email role');
          
          console.log('❌ Device registration blocked - device already registered to different user:', {
            existingUser: existingUser?.email,
            newUser: user.email,
            deviceFingerprint: deviceFingerprint.substring(0, 10) + '...'
          });
          
          res.status(400).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Device Already Registered</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ffe6e6; }
                .error { color: #f44336; font-size: 24px; margin: 20px 0; }
                .info { color: #666; margin: 10px 0; }
                .warning { color: #ff9800; font-size: 18px; margin: 20px 0; }
                .button { background: #f44336; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin: 20px; }
              </style>
            </head>
            <body>
              <h1>❌ This Device Is Already Registered!</h1>
              <div class="error">This device is already registered to another staff member</div>
              <div class="warning">Only one staff member per device is allowed</div>
              <div class="info">Registered to: ${existingUser?.firstName} ${existingUser?.lastName}</div>
              <div class="info">Email: ${existingUser?.email}</div>
              <div class="info">Role: ${existingUser?.role}</div>
              <div class="info">Registration time: ${deviceExistingUser.registeredAt.toLocaleString()}</div>
              <div class="info">To use this device, please contact your administrator to clear the registration</div>
              <button class="button" onclick="window.close()">Close</button>
            </body>
            </html>
          `);
          return;
        }
        
        // No conflicts - create new registration
        const deviceRegistration = new DeviceRegistration({
          userId: userId,
          deviceHash: hash,
          staffHashId: staffHash._id,
          deviceFingerprint: deviceFingerprint,
          userAgent: 'Browser Registration',
          ipAddress: 'Unknown',
          registeredAt: new Date(),
          lastUsed: new Date(),
          isActive: true
        });
        
        await deviceRegistration.save();
        console.log('✅ Device registration saved to database for user:', user.email);
      }
      
      // Return success page with localStorage persistence
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registration Successful</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f8ff; }
            .success { color: #4CAF50; font-size: 24px; margin: 20px 0; }
            .info { color: #666; margin: 10px 0; }
            .button { background: #4CAF50; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin: 20px; }
          </style>
          <script>
            // Save registration data to localStorage for verification
            localStorage.setItem('staffHash', '${hash}');
            localStorage.setItem('staffUserId', '${userId}');
            localStorage.setItem('deviceRegistered', 'true');
            localStorage.setItem('registrationTimestamp', new Date().toISOString());
            localStorage.setItem('deviceFingerprint', '${deviceFingerprint}');
            console.log('✅ Device registration saved to localStorage');
          </script>
        </head>
        <body>
          <h1>✅ Device Registration Successful!</h1>
          <div class="success">Your device has been registered for staff check-in/check-out</div>
          <div class="info">User: ${user.firstName} ${user.lastName}</div>
          <div class="info">Email: ${user.email}</div>
          <div class="info">Role: ${user.role}</div>
          <div class="info">You can now use this device to check in and out</div>
          <button class="button" onclick="window.close()">Close</button>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('❌ QR registration error:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Registration Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ffe6e6; }
            .error { color: #f44336; font-size: 24px; margin: 20px 0; }
            .info { color: #666; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>❌ Registration Error</h1>
          <div class="error">${error.message}</div>
          <div class="info">Please try scanning the QR code again</div>
        </body>
        </html>
      `);
    }
  }
  
  // Function to process check-in/check-out directly
  async function processCheckInOut(hash, userId, res, req, type) {
    try {
      console.log('📱 Processing QR check-in/out directly:', { hash: hash.substring(0, 10) + '...', userId, type });
      
      const User = require('./models/User');
      const DeviceRegistration = require('./models/DeviceRegistration');
      const crypto = require('crypto');
      
      console.log(`🔍 Checking device registration for user: ${userId}`);
      
      // Generate device fingerprint from request headers
      const userAgent = req.headers['user-agent'] || 'unknown';
      const acceptLanguage = req.headers['accept-language'] || 'unknown';
      const acceptEncoding = req.headers['accept-encoding'] || 'unknown';
      
      const deviceFingerprint = crypto.createHash('sha256')
        .update(userAgent + acceptLanguage + acceptEncoding + 'browser-device-fingerprint')
        .digest('hex');
      
      console.log(`🔍 Generated device fingerprint: ${deviceFingerprint.substring(0, 20)}...`);
      
      // SECURITY: Check if THIS specific device is registered to this user
      const deviceRegistration = await DeviceRegistration.findOne({
        userId: userId,
        deviceFingerprint: deviceFingerprint,
        isActive: true
      });
      
      // SECURITY: Block unregistered devices
      if (!deviceRegistration) {
        console.log(`❌ QR ${type} blocked - Device not registered for user: ${userId}`);
        console.log(`   Expected device fingerprint to match: ${deviceFingerprint.substring(0, 20)}...`);
        
        // Get user info for error message
        const user = await User.findById(userId).select('firstName lastName email');
        const userName = user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
        
        throw new Error(`Device not registered for ${userName}. Please register your device first by scanning the staff registration QR code before using check-in/check-out QR codes.`);
      }
      
      console.log(`✅ Device registration verified for user: ${userId}`);
      
      // Call the QR verification service for check-in/out
      const qrService = require('./services/enhancedQRCodeService');
      const result = await qrService.verifyEnhancedQRCode(hash, {
        userAgent: 'Browser',
        language: 'en',
        platform: 'Web'
      });
      
      if (result.success) {
        // Update device registration last used time
        deviceRegistration.lastUsed = new Date();
        await deviceRegistration.save();
        
        console.log(`✅ QR ${type} successful:`, result);
        
        // Return a simple success page
        const actionText = type === 'checkin' ? 'Check-in' : 'Check-out';
        const actionIcon = type === 'checkin' ? '🕐' : '✅';
        
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${actionText} Successful</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f8ff; }
              .success { color: #4CAF50; font-size: 24px; margin: 20px 0; }
              .info { color: #666; margin: 10px 0; }
              .button { background: #4CAF50; color: white; padding: 15px 30px; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin: 20px; }
            </style>
            <script>
              // Verify localStorage has registration data
              const storedUserId = localStorage.getItem('staffUserId');
              const deviceRegistered = localStorage.getItem('deviceRegistered');
              console.log('✅ ${actionText} successful. LocalStorage check:', { storedUserId, deviceRegistered });
            </script>
          </head>
          <body>
            <h1>${actionIcon} ${actionText} Successful!</h1>
            <div class="success">You have successfully ${type === 'checkin' ? 'checked in' : 'checked out'}</div>
            <div class="info">User ID: ${userId}</div>
            <div class="info">Time: ${new Date().toLocaleString()}</div>
            <div class="info">Device: Registered and Active</div>
            <button class="button" onclick="window.close()">Close</button>
          </body>
          </html>
        `);
      } else {
        console.log(`❌ QR ${type} failed:`, result);
        const actionText = type === 'checkin' ? 'Check-in' : 'Check-out';
        res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${actionText} Failed</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ffe6e6; }
              .error { color: #f44336; font-size: 24px; margin: 20px 0; }
              .info { color: #666; margin: 10px 0; }
            </style>
          </head>
          <body>
            <h1>❌ ${actionText} Failed</h1>
            <div class="error">${result.message || 'Unknown error'}</div>
            <div class="info">Please try scanning the QR code again</div>
          </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('❌ QR check-in error:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Check-in Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #ffe6e6; }
            .error { color: #f44336; font-size: 24px; margin: 20px 0; }
            .info { color: #666; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>❌ Check-in Error</h1>
          <div class="error">${error.message}</div>
          <div class="info">Please try again later</div>
        </body>
        </html>
      `);
    }
  }
  
  // =========================================
  // DEVICE REGISTRATION STATUS CHECK
  // =========================================
  
  // Route to check if a device is already registered
  app.get('/api/device/status/:hash', async (req, res) => {
    try {
      const { hash } = req.params;
      
      const DeviceRegistration = require('./models/DeviceRegistration');
      
      // Generate device fingerprint based on browser characteristics
      const userAgent = req.headers['user-agent'] || 'unknown';
      const acceptLanguage = req.headers['accept-language'] || 'unknown';
      const acceptEncoding = req.headers['accept-encoding'] || 'unknown';
      
      // Use only browser characteristics, NOT the QR code hash
      const deviceFingerprint = require('crypto').createHash('sha256')
        .update(userAgent + acceptLanguage + acceptEncoding + 'browser-device-fingerprint')
        .digest('hex');
      
      const deviceRegistration = await DeviceRegistration.findOne({
        deviceFingerprint: deviceFingerprint,
        isActive: true
      }).populate('userId', 'firstName lastName email role');
      
      if (deviceRegistration) {
        res.json({
          isRegistered: true,
          registeredTo: {
            userId: deviceRegistration.userId._id,
            name: `${deviceRegistration.userId.firstName} ${deviceRegistration.userId.lastName}`,
            email: deviceRegistration.userId.email,
            role: deviceRegistration.userId.role
          },
          registeredAt: deviceRegistration.registeredAt,
          lastUsed: deviceRegistration.lastUsed
        });
      } else {
        res.json({
          isRegistered: false
        });
      }
    } catch (error) {
      console.error('❌ Device status check error:', error);
      res.status(500).json({
        error: 'Failed to check device status',
        message: error.message
      });
    }
  });
  
  // Route to clear device registration
  app.post('/api/device/clear', async (req, res) => {
    try {
      const DeviceRegistration = require('./models/DeviceRegistration');
      
      // Generate device fingerprint based on browser characteristics
      const userAgent = req.headers['user-agent'] || 'unknown';
      const acceptLanguage = req.headers['accept-language'] || 'unknown';
      const acceptEncoding = req.headers['accept-encoding'] || 'unknown';
      
      const deviceFingerprint = require('crypto').createHash('sha256')
        .update(userAgent + acceptLanguage + acceptEncoding + 'browser-device-fingerprint')
        .digest('hex');
      
      // Find and deactivate the device registration
      const deviceRegistration = await DeviceRegistration.findOne({
        deviceFingerprint: deviceFingerprint,
        isActive: true
      });
      
      if (deviceRegistration) {
        deviceRegistration.isActive = false;
        deviceRegistration.deactivatedAt = new Date();
        await deviceRegistration.save();
        
        console.log('✅ Device registration cleared for fingerprint:', deviceFingerprint.substring(0, 10) + '...');
        
        res.json({
          success: true,
          message: 'Device registration cleared successfully',
          data: {
            deviceFingerprint: deviceFingerprint.substring(0, 10) + '...',
            clearedAt: new Date().toISOString()
          }
        });
      } else {
        res.json({
          success: false,
          message: 'No active device registration found for this device'
        });
      }
    } catch (error) {
      console.error('❌ Clear device registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear device registration',
        message: error.message
      });
    }
  });
  
  // =========================================
  // RATE LIMITING
  // =========================================
  
  // Enable rate limiting only in production
  if (config.NODE_ENV === 'production') {
    // Apply strict rate limits in production
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
    app.use('/api/auth/reset-password', authLimiter);
    app.use('/api', apiLimiter);
    
    logger.info(`Rate limiting enabled: ${config.RATE_LIMIT_MAX} requests per ${config.RATE_LIMIT_WINDOW} minutes`);
  } else {
    logger.warn('Rate limiting is DISABLED in development');
  }
  
  // =========================================
  // STATIC FILES
  // =========================================
  
  // Serve static files with caching
  app.use('/static', express.static(path.join(__dirname, 'public'), {
    maxAge: '1d' // Cache static assets for 1 day
  }));
  
  // Serve signature uploads
  app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d' // Cache signature images for 1 day
  }));
  
  // Serve mobile web version
  app.use('/mobile', express.static(path.join(__dirname, '../mobile-app'), {
    maxAge: '1d' // Cache mobile app files for 1 day
  }));
  
  // =========================================
  // SETUP ROUTES
  // =========================================
  
  // Health check routes
  app.use('/api/health-check', require('./routes/health-check'));
  
  // Dashboard routes (for all the missing endpoints)
  app.use('/api', require('./routes/dashboard'));
  
  // Auth routes
  app.use('/api/auth', require('./routes/auth'));
  
  // Patient routes
  app.use('/api/patients', require('./routes/patients'));
  
  // Appointment routes
  app.use('/api/appointments', require('./routes/appointments'));

  // Appointment payment routes
  app.use('/api/appointment-payments', require('./routes/appointmentPayments'));
  
  // Doctor routes
  app.use('/api/doctors', require('./routes/doctors'));
  app.use('/api/doctor', require('./routes/doctorRoutes'));

  
  // Service routes
  app.use('/api/services', require('./routes/services'));
  
  // Visit routes
  app.use('/api/visits', require('./routes/visits'));
  
  // Consultation routes (separate from medical records)
  app.use('/api/consultations', require('./routes/consultations'));
  
  // Prescription routes
  app.use('/api/prescriptions', require('./routes/prescriptions'));
  
  // Enhanced EMR Prescription routes
  app.use('/api/emr-prescriptions', require('./routes/emrPrescriptions'));
  
  // DASH Diet routes
  app.use('/api/dash-diet', require('./routes/dashDiet'));
  
  // Laboratory routes
  app.use('/api/lab-orders', require('./routes/labOrders'));
  app.use('/api/lab-results', require('./routes/labRoutes'));
  app.use('/api/labs', require('./routes/labs'));
  app.use('/api/lab-tests', require('./routes/labTests'));
  
  // Imaging routes
  app.use('/api/imaging-orders', require('./routes/imagingOrders'));
  
  // Administrative routes
  app.use('/api/admin', require('./routes/admin'));
  app.use('/api/facility', require('./routes/facility'));
  
  // Billing routes
  app.use('/api/billing', require('./routes/billingRoutes'));
  app.use('/api/billing', require('./routes/billing')); // Add the main billing routes with process-lab-payment
  app.use('/api/billable-items', require('./routes/billableItems'));
  // Also support /billable-items for legacy/compatibility
  app.use('/billable-items', require('./routes/billableItems'));
  app.use('/api/patient-cards', require('./routes/patientCards'));
  app.use('/api/card-types', require('./routes/cardTypeRoutes'));
  
  // Cleanup routes (for development/admin)
  app.use('/api/cleanup', require('./routes/cleanup'));
  app.use('/api/fix-nurse-tasks', require('./routes/fix-nurse-tasks'));
  
  // Payment synchronization routes (ROOT CAUSE FIX)
  app.use('/api/payment-sync', require('./routes/paymentSync'));
  
  // Patient status synchronization routes (ROOT CAUSE FIX - Ensures finalized patients are marked completed)
  app.use('/api/patient-status-sync', require('./routes/patientStatusSync'));
  
  // AI-powered HPI generation (mounted before medicalRecords so /generate-hpi is matched first)
  app.use('/api/medical-records', require('./routes/hpiAI'));

  // Medical records routes
  app.use('/api/medical-records', require('./routes/medicalRecords'));
  
  // WHO ICD-11 API routes
  app.use('/api/icd11', require('./routes/icd11'));
  
  // Medical certificates routes
  app.use('/api/medical-certificates', require('./routes/medicalCertificates'));
  app.use('/medical-certificates', require('./routes/medicalCertificateRoutes'));
  
  // Referral routes
  app.use('/api/referrals', require('./routes/referrals'));
  
  // Notifications routes
  app.use('/api/notifications', require('./routes/notifications'));
  
  // Inventory routes
  app.use('/api/inventory', require('./routes/inventory'));
  
  // Dispensed Item Charges routes
  app.use('/api/dispensed-charges', require('./routes/dispensedItemCharges'));
  
  // Payment routes
  app.use('/api/payments', require('./routes/paymentRoutes'));
  
  // Nurse routes
  app.use('/api/nurse', require('./routes/nurseRoutes'));
  app.use('/api/nurse-tasks', require('./routes/nurseTasks'));
  app.use('/api/medication-administration', require('./routes/medicationAdministration'));
  // Fix medication issues route removed - extension logic no longer needed
  app.use('/api/fix-samuel-display', require('./routes/fix-samuel-display'));

  // Medication Payment Status Routes - Prevents frontend calculation errors
  app.use('/api/medication-payment-status', require('./routes/medicationPaymentStatus'));
  
  // Medication-Nurse Task Synchronization Routes
  app.use('/api/medication-nurse-sync', require('./routes/medicationNurseTaskSync'));

  // Vital Signs AI override routes (must be before vitalSigns to intercept ai-analyze)
  app.use('/api/vital-signs', require('./routes/vitalSignsAIOverride'));
  // Vital Signs routes
  app.use('/api/vital-signs', require('./routes/vitalSigns'));
  
  // Eating Plans routes
  app.use('/api/eating-plans', require('./routes/eatingPlans'));

  // Procedures routes
  app.use('/api/procedures', require('./routes/procedures'));

  // IPD (In Patient Department) - admissions, bed billing
  app.use('/api/ipd', require('./routes/ipd'));
  
  // Staff management routes
  app.use('/api/staff', require('./routes/staff'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/attendance', require('./routes/attendance'));
  app.use('/api/timesheets', require('./routes/timesheets'));
  
  // Leave management routes
  app.use('/api/leave', require('./routes/leave'));
  
  // QR Code and Staff Attendance routes
  app.use('/api/qr', require('./routes/qrCode'));
  
  // Enhanced QR Code routes
  app.use('/api/qr/enhanced', require('./routes/enhancedQRCode'));
  
  // Automatic Overtime Transition routes
  app.use('/api/automatic-overtime', require('./routes/automaticOvertime'));
  
  // Data Share routes
  app.use('/api/data-share', require('./routes/dataShare'));
  app.use('/api/clinics', require('./routes/clinics'));
  
  // Service request routes
  app.use('/api/service-requests', require('./routes/serviceRequests'));

  // Reception routes
  app.use('/api/reception', require('./routes/reception'));

  // Depo Injection routes
  app.use('/api/depo-injections', require('./routes/depoInjectionRoutes'));

  // Settings routes
  app.use('/api/settings', require('./routes/settings'));
  
  // Global Settings routes
  app.use('/api/global-settings', require('./routes/globalSettings'));

  // Telegram notification routes
  app.use('/api/telegram', require('./routes/telegram'));
  
  // Enhanced notification routes
  app.use('/api/notifications', require('./routes/notifications'));

  // Operating Expenses routes
  try {
    app.use('/api/operating-expenses', require('./routes/operatingExpenses'));


  } catch (err) {
    console.error('Failed to load operating expenses routes:', err);
  }

  // Weekly Diseases Report routes
  app.use('/api/weekly-diseases-reports', require('./routes/weeklyDiseasesReport'));
  
  // Analytics routes (route usage/workload)
  app.use('/api/analytics', require('./routes/analytics'));
  
  // Set up cache management routes
  setupCacheRoutes(app);

  // =========================================
  // API PING ENDPOINT - Must be after all other routes
  // =========================================
  
  // API ping for API layer checks
  app.get('/api/ping', (req, res) => {
    res.status(200).json({ 
      success: true, 
      message: 'API is responding', 
      timestamp: new Date().toISOString() 
    });
  });

  // Initialization of default data moved to server startup after successful DB connection
  
  // =========================================
  // ERROR HANDLING - After all routes
  // =========================================
  
  // 404 - Not Found for any routes not matched
  app.use(notFound);
  
  // Error handling middleware
  app.use(corsErrorHandler);
  app.use(errorHandler);
  
  return app;
};

module.exports = createApp; 
