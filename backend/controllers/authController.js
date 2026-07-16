const authService = require('../services/authService');
const { logger } = require('../middleware/errorHandler');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

/**
 * Authentication Controller
 * Handles HTTP requests for authentication routes
 */
const authController = {
  /**
   * Register a new user
   * @route POST /api/auth/register
   */
  register: async (req, res, next) => {
    try {
      logger.info('User registration attempt', { 
        username: req.body.username,
        email: req.body.email,
        role: req.body.role,
        clinicId: req.body.clinicId || req.headers['x-clinic-id'] || 'default'
      });

      const user = await authService.registerUser({
        ...req.body,
        clinicId: req.body.clinicId || req.headers['x-clinic-id'] || 'default'
      });
      
      logger.info('User registered successfully', { 
        userId: user._id,
        username: user.username,
        role: user.role
      });
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Login a user
   * @route POST /api/auth/login
   */
  login: async (req, res, next) => {
    try {
      // Fast-fail if the database isn't connected yet (Render cold start / Atlas reconnect)
      const dbState = mongoose.connection.readyState;
      if (dbState !== 1) {
        logger.warn('Login attempt while database is not ready', { readyState: dbState });
        return res.status(503).json({
          success: false,
          error: 'database_unavailable',
          message: 'Database is still connecting. Please wait a moment and try again.'
        });
      }

      const { identifier, password } = req.body;
      const clinicId = req.body.clinicId || req.headers['x-clinic-id'] || 'default';
      
      logger.info('Login attempt', { identifier });
      
      const loginResult = await authService.loginUser(identifier, password, clinicId);
      
      if (loginResult.twoFactorRequired || loginResult.twoFactorSetupRequired) {
        return res.status(200).json({
          success: true,
          message: 'Two-factor authentication required',
          ...loginResult
        });
      }
      
      const { user, token } = loginResult;
      
      // Look up clinic branding info
      let clinicInfo = null;
      try {
        const Clinic = require('../models/Clinic');
        const userClinicId = user.clinicId || clinicId;
        const clinic = await Clinic.findOne({ slug: userClinicId });
        if (clinic) {
          clinicInfo = {
            name: clinic.name,
            slug: clinic.slug,
            logo: clinic.logo || null,
            fullName: clinic.fullName || clinic.name,
            tagline: clinic.tagline || '',
            address: clinic.address || '',
            contactEmail: clinic.contactEmail || '',
            contactPhone: clinic.contactPhone || ''
          };
        }
      } catch (clinicErr) {
        logger.warn('Could not fetch clinic info during login', { error: clinicErr.message });
      }

      logger.info('User logged in successfully', {
        userId: user._id,
        username: user.username,
        role: user.role
      });
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user, token, clinic: clinicInfo }
      });
    } catch (error) {
      logger.warn('Login failed', { 
        identifier: req.body.identifier,
        error: error.message 
      });
      next(error);
    }
  },
  
  /**
   * Get current user profile
   * @route GET /api/auth/me
   */
  getMe: async (req, res, next) => {
    try {
      const User = require('../models/User');
      const user = await User.findById(req.user._id).select('+photo +digitalSignature');
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Look up clinic branding info
      let clinicInfo = null;
      try {
        const Clinic = require('../models/Clinic');
        if (user.clinicId) {
          const clinic = await Clinic.findOne({ slug: user.clinicId });
          if (clinic) {
            clinicInfo = {
              name: clinic.name,
              slug: clinic.slug,
              logo: clinic.logo || null,
              fullName: clinic.fullName || clinic.name,
              tagline: clinic.tagline || '',
              address: clinic.address || '',
              contactEmail: clinic.contactEmail || '',
              contactPhone: clinic.contactPhone || ''
            };
          }
        }
      } catch (clinicErr) {
        console.warn('Could not fetch clinic info for getMe:', clinicErr.message);
      }

      console.log('getMe: Returning user data:', {
        id: user._id,
        email: user.email,
        hasPhoto: !!user.photo,
        photoLength: user.photo ? user.photo.length : 0
      });
      res.status(200).json({
        success: true,
        data: {
          user,
          clinic: clinicInfo
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Request password reset
   * @route POST /api/auth/forgot-password
   */
  forgotPassword: async (req, res, next) => {
    try {
      const { email } = req.body;
      
      logger.info('Password reset requested', { email });
      
      const result = await authService.requestPasswordReset(email);
      
      // In a real-world app, you would send an email with the reset token
      // For this example, we'll just return it
      
      res.status(200).json({
        success: true,
        message: 'Password reset instructions sent to email',
        data: {
          resetToken: result.resetToken,
          email: result.email
        }
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Reset password with token
   * @route POST /api/auth/reset-password
   */
  resetPassword: async (req, res, next) => {
    try {
      const { resetToken, newPassword } = req.body;
      
      await authService.resetPassword(resetToken, newPassword);
      
      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully'
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Change password (when user is logged in)
   * @route POST /api/auth/change-password
   */
  changePassword: async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      await authService.changePassword(req.user._id, currentPassword, newPassword);
      
      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  },
  
  /**
   * Test login route for development
   * @route POST /api/auth/test-login
   */
  testLogin: async (req, res, next) => {
    try {
      logger.info('🔍 [testLogin] Endpoint accessed', {
        method: req.method,
        url: req.originalUrl,
        body: req.body ? { identifier: req.body.identifier, hasPassword: !!req.body.password } : null,
        nodeEnv: process.env.NODE_ENV
      });

      // This route is intended for testing only - but allow in development and test
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        logger.warn('⚠️ [testLogin] Attempted access in production mode');
        return res.status(404).json({
          success: false,
          message: 'Route not found'
        });
      }
      
      logger.info('✅ [testLogin] Processing test login request');
      
      const { identifier, password } = req.body;
      const clinicId = req.body.clinicId || req.headers['x-clinic-id'] || 'default';
      
      if (!identifier || !password) {
        logger.warn('⚠️ [testLogin] Missing credentials', { hasIdentifier: !!identifier, hasPassword: !!password });
        return res.status(400).json({
          success: false,
          message: 'Identifier and password are required'
        });
      }
      
      logger.info(`🔍 [testLogin] Searching for user with identifier: ${identifier}`);
      
      // Require DB connection for real authentication
      const dbConnected = mongoose.connection && mongoose.connection.readyState === 1;

      if (!dbConnected) {
        logger.error('❌ [testLogin] Database not connected');
        return res.status(503).json({ 
          success: false, 
          message: 'Database unavailable. Please start MongoDB and try again.' 
        });
      }

      logger.info('✅ [testLogin] Database connected, attempting authentication');
      
      // Normal flow when DB is connected
      const { user, token } = await authService.loginUser(identifier, password, clinicId);

      logger.info('✅ [testLogin] Login successful', { 
        userId: user._id, 
        hasToken: !!token,
        tokenLength: token ? token.length : 0
      });
      
      const response = {
        success: true,
        message: 'Test login successful',
        data: { user, token }
      };
      
      logger.info('📤 [testLogin] Sending success response');
      
      res.status(200).json(response);
    } catch (error) {
      logger.error('❌ [testLogin] Login failed:', {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // If error looks like a DB/auth validation issue, return 401 instead of 500
      if (error && (error.message === 'Invalid credentials' || error.name === 'MongoServerError' || error.message?.includes('Invalid credentials'))) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }
      
      // For other errors, return 500 with error details in development
      const isDevelopment = process.env.NODE_ENV !== 'production';
      res.status(500).json({
        success: false,
        message: isDevelopment ? error.message : 'An error occurred during login',
        ...(isDevelopment && { error: error.stack })
      });
    }
  },
  
  /**
   * Update user profile
   * @route PUT /api/auth/profile
   */
  updateProfile: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const updateData = req.body;
      
      logger.info('Profile update attempt', { 
        userId,
        fields: Object.keys(updateData)
      });
      
      const updatedUser = await authService.updateUserProfile(userId, updateData);
      
      logger.info('Profile updated successfully', { 
        userId,
        updatedFields: Object.keys(updateData)
      });
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Verify authentication token
   * @route GET /api/auth/verify
   */
  verify: (req, res) => {
    res.status(200).json({ success: true, user: req.user });
  },

  logout: async (req, res, next) => {
    try {
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Verify two-factor authentication code and sign in
   * @route POST /api/auth/verify-2fa
   */
  verify2FA: async (req, res, next) => {
    try {
      const { tempToken, code } = req.body;
      
      if (!tempToken || !code) {
        return res.status(400).json({
          success: false,
          message: 'Verification session and code are required'
        });
      }
      
      const { user, token } = await authService.verifyTwoFactorCode(tempToken, code);
      
      // Look up clinic branding info
      let clinicInfo = null;
      try {
        const Clinic = require('../models/Clinic');
        const userClinicId = user.clinicId || 'default';
        const clinic = await Clinic.findOne({ slug: userClinicId });
        if (clinic) {
          clinicInfo = {
            name: clinic.name,
            slug: clinic.slug,
            logo: clinic.logo || null,
            fullName: clinic.fullName || clinic.name,
            tagline: clinic.tagline || '',
            address: clinic.address || '',
            contactEmail: clinic.contactEmail || '',
            contactPhone: clinic.contactPhone || ''
          };
        }
      } catch (clinicErr) {
        logger.warn('Could not fetch clinic info during 2FA verification', { error: clinicErr.message });
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user, token, clinic: clinicInfo }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Register a new patient and link/create clinical Patient record
   * @route POST /api/auth/patient/register
   */
  patientRegister: async (req, res, next) => {
    try {
      const { firstName, lastName, email, password, contactNumber, gender, dateOfBirth, patientCardId } = req.body;
      const clinicId = req.body.clinicId || req.headers['x-clinic-id'] || 'default';

      logger.info('Patient registration attempt', { firstName, lastName, email, contactNumber, patientCardId });

      if (!firstName || !lastName || !email || !password || !contactNumber || !gender) {
        return res.status(400).json({
          success: false,
          message: 'First name, last name, email, password, contact number, and gender are required'
        });
      }

      const User = require('../models/User');
      const Patient = require('../models/Patient');

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: email.toLowerCase() }
        ]
      }).setOptions({ skipTenantScope: true });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists'
        });
      }

      let patient = null;

      // 1. If Patient Card ID is provided, try to find by that ID first
      if (patientCardId && patientCardId.trim()) {
        const normalizedCardId = patientCardId.trim();
        // Try exact match in Patient model using standard id checking
        patient = await Patient.findByAnyId(normalizedCardId);
        
        if (!patient) {
          return res.status(400).json({
            success: false,
            message: `Clinical Patient record with Card ID "${normalizedCardId}" was not found. Please double-check the ID or leave the field blank if you do not have one.`
          });
        }

        // Verify if a user is already linked to this patient record
        const alreadyLinkedUser = await User.findOne({ patient: patient._id }).setOptions({ skipTenantScope: true });
        if (alreadyLinkedUser) {
          return res.status(400).json({
            success: false,
            message: 'This Patient Card is already linked to an existing portal account. Please sign in or reset your password.'
          });
        }

        logger.info('Linked user signup to existing patient record via Patient Card ID', { patientId: patient._id, patientCardId: normalizedCardId });
        
        // Update contact number / email on patient if empty
        let updated = false;
        if (!patient.email && email) {
          patient.email = email.toLowerCase();
          updated = true;
        }
        if (updated) {
          await patient.save();
        }
      } else {
        // 2. If no Patient Card ID is provided, search by email or contactNumber
        patient = await Patient.findOne({
          clinicId,
          $or: [
            { email: email.toLowerCase() },
            { contactNumber: contactNumber }
          ]
        }).setOptions({ skipTenantScope: true });

        if (patient) {
          // Verify if a user is already linked to this patient record
          const alreadyLinkedUser = await User.findOne({ patient: patient._id }).setOptions({ skipTenantScope: true });
          if (alreadyLinkedUser) {
            return res.status(400).json({
              success: false,
              message: 'A portal account is already linked to your email or phone number. Please sign in.'
            });
          }

          logger.info('Existing clinic patient record found by email/phone, linking account', { patientId: patient._id });
          // Update patient info if empty
          let updated = false;
          if (!patient.email && email) {
            patient.email = email.toLowerCase();
            updated = true;
          }
          if (updated) {
            await patient.save();
          }
        } else {
          // 3. Create a new patient record
          logger.info('No existing patient record found, creating a new one');
          patient = new Patient({
            clinicId,
            firstName,
            lastName,
            gender,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            contactNumber,
            email: email.toLowerCase(),
            status: 'Outpatient'
          });
          await patient.save();
        }
      }

      // Create new patient user
      const user = new User({
        clinicId,
        username: email.toLowerCase(),
        email: email.toLowerCase(),
        password,
        role: 'patient',
        firstName,
        lastName,
        patient: patient._id,
        isActive: true
      });

      await user.save();

      // Generate JWT
      const token = authService.generateToken(user);

      // Remove password from response
      const userResponse = user.toObject();
      delete userResponse.password;

      logger.info('Patient user registered successfully', { userId: user._id, patientId: patient._id });

      res.status(201).json({
        success: true,
        message: 'Patient registered successfully',
        data: {
          user: userResponse,
          token,
          patient
        }
      });
    } catch (error) {
      logger.error('Patient registration failed', { error: error.message });
      next(error);
    }
  },

  /**
   * Check if a patient card exists and is valid for linking, returning safe profile details for autofill
   * @route GET /api/auth/patient/check-card/:cardId
   */
  checkPatientCard: async (req, res, next) => {
    try {
      const { cardId } = req.params;
      
      logger.info('Patient card verification request', { cardId });

      if (!cardId || !cardId.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Patient Card ID is required'
        });
      }

      const Patient = require('../models/Patient');
      const User = require('../models/User');

      const patient = await Patient.findByAnyId(cardId.trim());

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: `Clinical Patient record with Card ID "${cardId}" was not found`
        });
      }

      // Check if this patient is already associated with a User account
      const alreadyLinkedUser = await User.findOne({ patient: patient._id }).setOptions({ skipTenantScope: true });
      if (alreadyLinkedUser) {
        return res.status(400).json({
          success: false,
          message: 'This Patient Card is already associated with an active portal account'
        });
      }

      logger.info('Safe patient demographics returned for registration autofill', { patientId: patient._id });

      let calculatedDob = '';
      if (patient.dateOfBirth) {
        calculatedDob = new Date(patient.dateOfBirth).toISOString().split('T')[0];
      } else if (patient.age !== undefined && patient.age !== null) {
        // Approximate date of birth from age (Jan 1st of birth year)
        const birthYear = new Date().getFullYear() - patient.age;
        calculatedDob = `${birthYear}-01-01`;
      }

      const cleanEmail = patient.email ? patient.email.replace(/\s+/g, '').toLowerCase() : '';

      res.status(200).json({
        success: true,
        data: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: cleanEmail,
          contactNumber: patient.contactNumber || '',
          gender: patient.gender || '',
          dateOfBirth: calculatedDob
        }
      });
    } catch (error) {
      logger.error('Patient card verification failed', { error: error.message });
      next(error);
    }
  }
};

module.exports = authController; 
