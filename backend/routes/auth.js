const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validationMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  validate.user.create, 
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get token
 * @access  Public
 */
router.post('/login', 
  authLimiter,
  validate.user.login, 
  authController.login
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', 
  auth, 
  authController.getMe
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', 
  validate.user.login, 
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', 
  authLimiter,
  validate.user.login,
  authController.resetPassword
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (when logged in)
 * @access  Private
 */
router.post('/change-password', 
  auth,
  authController.changePassword
);

/**
 * @route   GET /api/auth/test-login
 * @desc    Test if test-login route is accessible (for debugging)
 * @access  Public (dev only)
 */
router.get('/test-login', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Test-login route is accessible',
    method: 'Use POST to login',
    endpoint: '/api/auth/test-login'
  });
});

/**
 * @route   POST /api/auth/test-login
 * @desc    Test login route for development
 * @access  Public (dev only)
 */
router.post('/test-login', 
  authController.testLogin
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', 
  auth,
  validate.user.updateProfile,
  authController.updateProfile
);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify authentication token
 * @access  Private
 */
router.get('/verify', auth, authController.verify);

module.exports = router; 
