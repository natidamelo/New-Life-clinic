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
      const { identifier, password } = req.body;
      const clinicId = req.body.clinicId || req.headers['x-clinic-id'] || 'default';
      
      logger.info('Login attempt', { identifier });
      
      const { user, token } = await authService.loginUser(identifier, password, clinicId);
      
      logger.info('User logged in successfully', {
        userId: user._id,
        username: user.username,
        role: user.role
      });
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user, token }
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
      // User is already available from auth middleware
      console.log('getMe: Returning user data:', {
        id: req.user._id,
        email: req.user.email,
        hasPhoto: !!req.user.photo,
        photoLength: req.user.photo ? req.user.photo.length : 0
      });
      res.status(200).json({
        success: true,
        data: {
          user: req.user
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
  }
};

module.exports = authController; 
