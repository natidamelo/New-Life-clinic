const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const doctorController = require('../controllers/doctorController');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');

// Get all doctors (public endpoint for frontend compatibility)
router.get('/all', asyncHandler(async (req, res) => {
  try {
    const doctors = await User.find({ 
      role: 'doctor', 
      isActive: true 
    }).select('firstName lastName email username role specialization');
    
    const formattedDoctors = doctors.map(doctor => ({
      id: doctor._id,
      firstName: doctor.firstName || '',
      lastName: doctor.lastName || '',
      role: doctor.role,
      specialization: doctor.specialization || '',
      email: doctor.email,
      username: doctor.username,
      name: `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim()
    }));
    
    console.log(`[/api/doctor/all] Found ${formattedDoctors.length} doctors`);
    
    res.json(formattedDoctors);
  } catch (error) {
    console.error('[/api/doctor/all] Error fetching doctors:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch doctors', 
      error: error.message 
    });
  }
}));

// Get all doctors
router.get('/', auth, doctorController.getDoctors);

// Get doctor by ID
router.get('/:id', auth, doctorController.getDoctorById);

module.exports = router; 
