/**
 * Depo Injection Controller
 * 
 * Handles HTTP requests for Depo-Provera injection scheduling and management
 */

const DepoInjectionService = require('../services/depoInjectionService');
const asyncHandler = require('express-async-handler');

// @desc    Create new Depo injection schedule
// @route   POST /api/depo-injections/schedules
// @access  Private
exports.createSchedule = asyncHandler(async (req, res) => {
  try {
    const scheduleData = {
      ...req.body,
      createdBy: req.user.id
    };

    const schedule = await DepoInjectionService.createSchedule(scheduleData);

    res.status(201).json({
      success: true,
      message: 'Depo injection schedule created successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error creating Depo injection schedule:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create Depo injection schedule'
    });
  }
});

// @desc    Record Depo injection administration
// @route   POST /api/depo-injections/schedules/:id/record
// @access  Private
exports.recordInjection = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const injectionData = {
      ...req.body,
      administeredBy: req.user.id,
      administeredByName: `${req.user.firstName} ${req.user.lastName}`
    };

    const schedule = await DepoInjectionService.recordInjection(id, injectionData);

    res.json({
      success: true,
      message: 'Depo injection recorded successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error recording Depo injection:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to record Depo injection'
    });
  }
});

// @desc    Get all Depo injection schedules for a patient
// @route   GET /api/depo-injections/patient/:patientId
// @access  Private
exports.getPatientSchedules = asyncHandler(async (req, res) => {
  try {
    const { patientId } = req.params;
    const schedules = await DepoInjectionService.getPatientSchedules(patientId);

    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    console.error('Error fetching patient schedules:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch patient schedules'
    });
  }
});

// @desc    Get upcoming Depo injections
// @route   GET /api/depo-injections/upcoming
// @access  Private
exports.getUpcomingInjections = asyncHandler(async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const injections = await DepoInjectionService.getUpcomingInjections(parseInt(days));

    res.json({
      success: true,
      data: injections
    });
  } catch (error) {
    console.error('Error fetching upcoming injections:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch upcoming injections'
    });
  }
});

// @desc    Get overdue Depo injections
// @route   GET /api/depo-injections/overdue
// @access  Private
exports.getOverdueInjections = asyncHandler(async (req, res) => {
  try {
    const injections = await DepoInjectionService.getOverdueInjections();

    res.json({
      success: true,
      data: injections
    });
  } catch (error) {
    console.error('Error fetching overdue injections:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch overdue injections'
    });
  }
});

// @desc    Get Depo injection statistics
// @route   GET /api/depo-injections/statistics
// @access  Private
exports.getStatistics = asyncHandler(async (req, res) => {
  try {
    const statistics = await DepoInjectionService.getStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error fetching injection statistics:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch injection statistics'
    });
  }
});

// @desc    Get Depo injection dashboard data
// @route   GET /api/depo-injections/dashboard
// @access  Private
exports.getDashboardData = asyncHandler(async (req, res) => {
  try {
    const dashboardData = await DepoInjectionService.getDashboardData();

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch dashboard data'
    });
  }
});

// @desc    Search Depo injection schedules
// @route   GET /api/depo-injections/search
// @access  Private
exports.searchSchedules = asyncHandler(async (req, res) => {
  try {
    const searchCriteria = req.query;
    const results = await DepoInjectionService.searchSchedules(searchCriteria);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error searching schedules:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to search schedules'
    });
  }
});

// @desc    Get injection history for a schedule
// @route   GET /api/depo-injections/schedules/:id/history
// @access  Private
exports.getInjectionHistory = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const history = await DepoInjectionService.getInjectionHistory(id);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching injection history:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch injection history'
    });
  }
});

// @desc    Update Depo injection schedule
// @route   PUT /api/depo-injections/schedules/:id
// @access  Private
exports.updateSchedule = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    const schedule = await DepoInjectionService.updateSchedule(id, updateData);

    res.json({
      success: true,
      message: 'Depo injection schedule updated successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update schedule'
    });
  }
});

// @desc    Cancel Depo injection schedule
// @route   PUT /api/depo-injections/schedules/:id/cancel
// @access  Private
exports.cancelSchedule = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const schedule = await DepoInjectionService.cancelSchedule(id, reason);

    res.json({
      success: true,
      message: 'Depo injection schedule cancelled successfully',
      data: schedule
    });
  } catch (error) {
    console.error('Error cancelling schedule:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cancel schedule'
    });
  }
});

// @desc    Schedule next appointment for Depo injection
// @route   POST /api/depo-injections/schedules/:id/schedule-appointment
// @access  Private
exports.scheduleNextAppointment = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await DepoInjectionService.scheduleNextAppointment(id);

    res.json({
      success: true,
      message: 'Next appointment scheduled successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Error scheduling next appointment:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to schedule next appointment'
    });
  }
});

// @desc    Get single Depo injection schedule
// @route   GET /api/depo-injections/schedules/:id
// @access  Private
exports.getSchedule = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const DepoInjectionSchedule = require('../models/DepoInjectionSchedule');
    
    const schedule = await DepoInjectionSchedule.findById(id)
      .populate('patient', 'firstName lastName phone email patientId')
      .populate('prescribingDoctor', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Depo injection schedule not found'
      });
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch schedule'
    });
  }
});

// @desc    Get all Depo injection schedules
// @route   GET /api/depo-injections/schedules
// @access  Private
exports.getAllSchedules = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const DepoInjectionSchedule = require('../models/DepoInjectionSchedule');
    
    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [schedules, total] = await Promise.all([
      DepoInjectionSchedule.find(query)
        .populate('patient', 'firstName lastName phone email patientId')
        .populate('prescribingDoctor', 'firstName lastName')
        .sort({ nextInjectionDate: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      DepoInjectionSchedule.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        schedules,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching all schedules:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch schedules'
    });
  }
});

