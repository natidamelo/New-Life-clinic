const fs = require('fs');
const path = require('path');

// List of missing route files
const missingRoutes = [
  'doctorRoutes',
  'admin',
  'paymentSync',
  'nurseRoutes',
  'nurseTasks',
  'vitalSigns',
  'staff',
  'attendance',
  'leave',
  'qrCode',
  'automaticOvertime',
  'reception',
  'medicationPaymentStatus'
];

// Template for basic route file
const routeTemplate = (routeName) => `const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// @route   GET /api/${routeName}
// @desc    Get all ${routeName}
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: '${routeName} endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching ${routeName}:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/${routeName}
// @desc    Create new ${routeName}
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: '${routeName} created successfully'
    });
  } catch (error) {
    console.error('Error creating ${routeName}:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
`;

// Create missing route files
missingRoutes.forEach(routeName => {
  const filePath = path.join(__dirname, 'routes', `${routeName}.js`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, routeTemplate(routeName));
    console.log(`Created ${routeName}.js`);
  } else {
    console.log(`${routeName}.js already exists`);
  }
});

console.log('All missing route files created!');
