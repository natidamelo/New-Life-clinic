/**
 * Depo Injection Routes
 * 
 * API routes for Depo-Provera injection scheduling and management
 */

const express = require('express');
const router = express.Router();
const {
  createSchedule,
  recordInjection,
  getPatientSchedules,
  getUpcomingInjections,
  getOverdueInjections,
  getStatistics,
  getDashboardData,
  searchSchedules,
  getInjectionHistory,
  updateSchedule,
  cancelSchedule,
  scheduleNextAppointment,
  getSchedule,
  getAllSchedules
} = require('../controllers/depoInjectionController');

// Middleware for authentication
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Schedule management routes
router.route('/schedules')
  .post(createSchedule)           // Create new schedule
  .get(getAllSchedules);          // Get all schedules

router.route('/schedules/:id')
  .get(getSchedule)               // Get single schedule
  .put(updateSchedule);           // Update schedule

router.route('/schedules/:id/record')
  .post(recordInjection);         // Record injection administration

router.route('/schedules/:id/history')
  .get(getInjectionHistory);      // Get injection history

router.route('/schedules/:id/cancel')
  .put(cancelSchedule);           // Cancel schedule

router.route('/schedules/:id/schedule-appointment')
  .post(scheduleNextAppointment); // Schedule next appointment

// Patient-specific routes
router.route('/patient/:patientId')
  .get(getPatientSchedules);      // Get schedules for specific patient

// Dashboard and reporting routes
router.route('/dashboard')
  .get(getDashboardData);         // Get dashboard data

router.route('/upcoming')
  .get(getUpcomingInjections);    // Get upcoming injections

router.route('/overdue')
  .get(getOverdueInjections);     // Get overdue injections

router.route('/statistics')
  .get(getStatistics);            // Get injection statistics

router.route('/search')
  .get(searchSchedules);          // Search schedules

module.exports = router;

