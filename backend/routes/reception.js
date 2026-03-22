const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// @route   GET /api/reception
// @desc    Get all reception
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'reception endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching reception:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/reception/dashboard-stats
// @desc    Get reception dashboard statistics
// @access  Private
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const Patient = require('../models/Patient');
    const Appointment = require('../models/Appointment');
    
    // Get basic statistics
    const totalPatients = await Patient.countDocuments();
    const todayPatients = await Patient.countDocuments({
      createdAt: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });
    
    const totalAppointments = await Appointment.countDocuments();
    const todayAppointments = await Appointment.countDocuments({
      appointmentDate: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });
    
    const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    
    res.json({
      success: true,
      data: {
        totalPatients,
        todayPatients,
        totalAppointments,
        todayAppointments,
        pendingAppointments,
        completedAppointments,
        waitingPatients: 0, // Will be calculated by frontend
        excludedPatients: 0 // Will be calculated by frontend
      }
    });
  } catch (error) {
    console.error('Error fetching reception dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/reception
// @desc    Create new reception
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'reception created successfully'
    });
  } catch (error) {
    console.error('Error creating reception:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
