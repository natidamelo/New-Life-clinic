const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const appointmentController = require('../controllers/appointmentController');
const { authenticate, authorize } = require('../src/middleware/auth');

// Dashboard data
router.get('/dashboard-summary', authenticate, appointmentController.getDashboardSummary);
router.get('/today', authenticate, appointmentController.getTodaysAppointments);
router.get('/upcoming', authenticate, appointmentController.getUpcomingAppointments);

// Test endpoint without auth for debugging
router.get('/test-no-auth', appointmentController.getFastAppointments);

// Fast appointments endpoint for better performance
router.get('/fast-load', appointmentController.getFastAppointments);

// Get all appointments
router.get('/', authenticate, authorize('admin', 'reception', 'doctor'), appointmentController.getAppointments);

// Get appointment by ID
router.get('/:id', authenticate, appointmentController.getAppointmentById);

// Get available time slots
router.get('/slots', authenticate, appointmentController.getAvailableTimeSlots);

// Create a new appointment
router.post('/', authenticate, authorize('admin', 'reception'), appointmentController.createAppointment);

// Update an appointment
router.put('/:id', authenticate, authorize('admin', 'reception', 'doctor'), appointmentController.updateAppointment);

// Delete an appointment
router.delete('/:id', authenticate, authorize('admin', 'reception'), appointmentController.deleteAppointment);

module.exports = router; 