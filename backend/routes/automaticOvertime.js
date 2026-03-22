const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// @route   GET /api/automaticOvertime
// @desc    Get all automaticOvertime
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'automaticOvertime endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching automaticOvertime:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/automaticOvertime
// @desc    Create new automaticOvertime
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'automaticOvertime created successfully'
    });
  } catch (error) {
    console.error('Error creating automaticOvertime:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
