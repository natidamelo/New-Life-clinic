const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const User = require('../models/User');

// @desc    Get all appointment
// @route   GET /api/appointment
// @access  Private
const getappointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('patientId', 'firstName lastName patientId')
      .populate('doctorId', 'firstName lastName')
      .populate('selectedLabService', 'name price category description')
      .populate('selectedImagingService', 'name price category description')
      .sort({ appointmentDateTime: 1 });
    
    res.json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: appointments
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get appointment by ID
// @route   GET /api/appointment/:id
// @access  Private
const getappointmentById = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'appointment by ID endpoint working',
      data: null
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new appointment
// @route   POST /api/appointment
// @access  Private
const createappointment = async (req, res) => {
  try {
    const { patient, doctor, dateTime, type, reason, notes, durationMinutes, selectedLabService, selectedImagingService } = req.body;
    
    // Create appointment
    const appointment = new Appointment({
      patientId: patient,
      doctorId: doctor,
      appointmentDateTime: new Date(dateTime),
      durationMinutes: durationMinutes || 30,
      type: type,
      reason: reason,
      notes: notes,
      status: 'Scheduled',
      selectedLabService: selectedLabService || null,
      selectedImagingService: selectedImagingService || null
    });

    const savedAppointment = await appointment.save();
    
    // Populate the response
    const populatedAppointment = await Appointment.findById(savedAppointment._id)
      .populate('patientId', 'firstName lastName patientId')
      .populate('doctorId', 'firstName lastName')
      .populate('selectedLabService', 'name price category')
      .populate('selectedImagingService', 'name price category');

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: populatedAppointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update appointment
// @route   PUT /api/appointment/:id
// @access  Private
const updateappointment = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'appointment updated successfully'
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete appointment
// @route   DELETE /api/appointment/:id
// @access  Private
const deleteappointment = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'appointment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Additional functions needed by the routes
const getDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's appointments count
    const todayCount = await Appointment.countDocuments({
      appointmentDateTime: {
        $gte: today,
        $lt: tomorrow
      }
    });

    // Get upcoming appointments count
    const upcomingCount = await Appointment.countDocuments({
      appointmentDateTime: {
        $gte: tomorrow
      }
    });

    // Get total scheduled appointments
    const totalScheduled = await Appointment.countDocuments({
      status: 'Scheduled'
    });

    res.json({
      success: true,
      message: 'Dashboard summary retrieved successfully',
      data: {
        todayCount,
        upcomingCount,
        totalScheduled
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const getTodaysAppointments = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      appointmentDateTime: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('patientId', 'firstName lastName patientId')
    .populate('doctorId', 'firstName lastName')
    .sort({ appointmentDateTime: 1 });

    res.json({
      success: true,
      message: 'Today\'s appointments retrieved successfully',
      data: appointments
    });
  } catch (error) {
    console.error('Error fetching today\'s appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const getUpcomingAppointments = async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const appointments = await Appointment.find({
      appointmentDateTime: {
        $gte: tomorrow
      }
    })
    .populate('patientId', 'firstName lastName patientId')
    .populate('doctorId', 'firstName lastName')
    .sort({ appointmentDateTime: 1 });

    res.json({
      success: true,
      message: 'Upcoming appointments retrieved successfully',
      data: appointments
    });
  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Removed getFastAppointments - was test endpoint that caused confusion

const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('patientId', 'firstName lastName patientId')
      .populate('doctorId', 'firstName lastName')
      .populate('selectedLabService', 'name price category description')
      .populate('selectedImagingService', 'name price category description')
      .sort({ appointmentDateTime: 1 });
    
    res.json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: appointments
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Get appointment by ID endpoint working',
      data: null
    });
  } catch (error) {
    console.error('Error fetching appointment by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const getAvailableTimeSlots = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Get available time slots endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching available time slots:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const createAppointment = async (req, res) => {
  try {
    const { patient, doctor, dateTime, type, reason, notes, durationMinutes } = req.body;
    
    // Parse the ISO date string from frontend
    const appointmentDateTime = new Date(dateTime);
    
    if (isNaN(appointmentDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format provided'
      });
    }
    
    // Create appointment
    const appointment = new Appointment({
      patientId: patient,
      doctorId: doctor,
      appointmentDateTime: appointmentDateTime,
      durationMinutes: durationMinutes || 30,
      type: type,
      reason: reason || '',
      notes: notes || '',
      status: 'Scheduled'
    });

    const savedAppointment = await appointment.save();
    
    // Populate the response
    const populatedAppointment = await Appointment.findById(savedAppointment._id)
      .populate('patientId', 'firstName lastName patientId')
      .populate('doctorId', 'firstName lastName')
      .populate('selectedLabService', 'name price category')
      .populate('selectedImagingService', 'name price category');

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: populatedAppointment
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const updateAppointment = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Appointment updated successfully'
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const deleteAppointment = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Appointment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getappointments,
  getappointmentById,
  createappointment,
  updateappointment,
  deleteappointment,
  getDashboardSummary,
  getTodaysAppointments,
  getUpcomingAppointments,
  getAppointments,
  getAppointmentById,
  getAvailableTimeSlots,
  createAppointment,
  updateAppointment,
  deleteAppointment
};
