const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// @route   GET /api/paymentSync
// @desc    Get all paymentSync
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'paymentSync endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching paymentSync:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/paymentSync
// @desc    Create new paymentSync
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'paymentSync created successfully'
    });
  } catch (error) {
    console.error('Error creating paymentSync:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
