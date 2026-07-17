const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { checkDoctorAvailability } = require('../utils/appointmentValidation');

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

    // Enforce history validation for Follow-up and Check-up
    const isHistoryRequiredType = ['Check-up', 'checkup', 'Follow-up', 'follow-up'].includes(type);
    if (isHistoryRequiredType) {
      const MedicalRecord = require('../models/MedicalRecord');
      const hasHistory = await MedicalRecord.exists({
        $or: [{ patient: patient }, { patientId: patient }]
      });
      
      if (!hasHistory) {
        console.log(`❌ [createappointment] Rejecting creation: type "${type}" requires history for patient ${patient}`);
        return res.status(400).json({
          success: false,
          message: `${type} appointments are only allowed for existing patients with a medical history. New patients must schedule a Consultation first.`
        });
      }
    }

    // Verify Doctor Availability & Schedule Slots
    const availability = await checkDoctorAvailability(
      doctor,
      dateTime,
      durationMinutes || 30
    );

    if (!availability.available) {
      return res.status(409).json({
        success: false,
        message: availability.message || 'The selected doctor is not available at this time.'
      });
    }

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
  return updateAppointment(req, res);
};

// @desc    Delete appointment
// @route   DELETE /api/appointment/:id
// @access  Private
const deleteappointment = async (req, res) => {
  return deleteAppointment(req, res);
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

    // Enforce history validation for Follow-up and Check-up
    const isHistoryRequiredType = ['Check-up', 'checkup', 'Follow-up', 'follow-up'].includes(type);
    if (isHistoryRequiredType) {
      const MedicalRecord = require('../models/MedicalRecord');
      const hasHistory = await MedicalRecord.exists({
        $or: [{ patient: patient }, { patientId: patient }]
      });
      
      if (!hasHistory) {
        console.log(`❌ [createAppointment] Rejecting creation: type "${type}" requires history for patient ${patient}`);
        return res.status(400).json({
          success: false,
          message: `${type} appointments are only allowed for existing patients with a medical history. New patients must schedule a Consultation first.`
        });
      }
    }
    
    // Parse the ISO date string from frontend
    const appointmentDateTime = new Date(dateTime);
    
    if (isNaN(appointmentDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format provided'
      });
    }

    // Verify Doctor Availability & Schedule Slots
    const availability = await checkDoctorAvailability(
      doctor,
      appointmentDateTime,
      durationMinutes || 30
    );

    if (!availability.available) {
      return res.status(409).json({
        success: false,
        message: availability.message || 'The selected doctor is not available at this time.'
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
    const { id } = req.params;
    const { patientId, doctorId, appointmentDateTime, date, time, durationMinutes, duration, type, reason, notes, status, selectedLabService, selectedImagingService } = req.body;

    const existingAppt = await Appointment.findById(id);
    if (!existingAppt) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Determine new date/time if date/time are updated
    let newDateTime = existingAppt.appointmentDateTime;
    if (appointmentDateTime) {
      newDateTime = new Date(appointmentDateTime);
    } else if (date) {
      const dateStr = date;
      const timeStr = time || '09:00';
      newDateTime = new Date(`${dateStr}T${timeStr}`);
    }

    const newDoctor = doctorId || existingAppt.doctorId;
    const newDuration = durationMinutes || duration || existingAppt.durationMinutes || 30;

    // Check doctor availability if doctor, date/time, or duration changed
    if (
      (newDoctor && newDoctor.toString() !== existingAppt.doctorId?.toString()) ||
      newDateTime.getTime() !== existingAppt.appointmentDateTime.getTime() ||
      Number(newDuration) !== Number(existingAppt.durationMinutes)
    ) {
      const availability = await checkDoctorAvailability(
        newDoctor,
        newDateTime,
        newDuration,
        id
      );

      if (!availability.available) {
        return res.status(409).json({
          success: false,
          message: availability.message || 'The doctor is not available at this time.'
        });
      }
    }

    // Update fields
    if (patientId) existingAppt.patientId = patientId;
    if (doctorId !== undefined) existingAppt.doctorId = doctorId || null;
    existingAppt.appointmentDateTime = newDateTime;
    existingAppt.durationMinutes = newDuration;
    if (type) existingAppt.type = type;
    if (reason !== undefined) existingAppt.reason = reason;
    if (notes !== undefined) existingAppt.notes = notes;
    if (status) existingAppt.status = status;
    if (selectedLabService !== undefined) existingAppt.selectedLabService = selectedLabService || null;
    if (selectedImagingService !== undefined) existingAppt.selectedImagingService = selectedImagingService || null;

    const updatedAppt = await existingAppt.save();

    const populated = await Appointment.findById(updatedAppt._id)
      .populate('patientId', 'firstName lastName patientId')
      .populate('doctorId', 'firstName lastName')
      .populate('selectedLabService', 'name price category')
      .populate('selectedImagingService', 'name price category');

    res.json({
      success: true,
      message: 'Appointment updated successfully',
      data: populated
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
    const { id } = req.params;
    const deleted = await Appointment.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
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
