const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const { auth, checkRole } = require('../middleware/auth');

// Dashboard data
router.get('/dashboard-summary', auth, appointmentController.getDashboardSummary);
router.get('/today', auth, appointmentController.getTodaysAppointments);
router.get('/upcoming', auth, appointmentController.getUpcomingAppointments);

// Note: Removed test endpoints to prevent confusion

// Get all appointments
router.get('/', auth, checkRole('admin', 'reception', 'doctor', 'nurse'), appointmentController.getAppointments);

// Get appointment by ID
router.get('/:id', auth, appointmentController.getAppointmentById);

// Get available time slots
router.get('/slots', auth, appointmentController.getAvailableTimeSlots);

// Create a new appointment
router.post('/', [
  auth, 
  checkRole('admin', 'reception', 'doctor', 'nurse'),
  body('patient').isString().notEmpty().withMessage('Patient ID is required'),
  body('doctor').isString().notEmpty().withMessage('Doctor ID is required'),
  body('dateTime').isString().notEmpty().withMessage('Date and time is required'),
  body('type').isString().notEmpty().withMessage('Appointment type is required'),
  body('reason').optional().isString(),
  body('notes').optional().isString(),
  body('durationMinutes').optional().isNumeric(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  }
], appointmentController.createappointment);

// Update an appointment
router.put('/:id', [
  auth, 
  checkRole('admin', 'reception', 'doctor', 'nurse'),
  body('patientId').optional().isString(),
  body('doctorId').optional().isString(),
  body('date').optional().isString(),
  body('time').optional().isString(),
  body('duration').optional().isNumeric(),
  body('service').optional().isString(),
  body('status').optional().isString()
], appointmentController.updateAppointment);

// Delete an appointment
router.delete('/:id', auth, checkRole('admin', 'reception'), appointmentController.deleteAppointment);

module.exports = router; 
