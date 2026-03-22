const express = require('express');
const router = express.Router();
const {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  getCurrentWeekReport,
  getReportStatistics,
  refreshDiseaseCounts,
  getDiseaseStats
} = require('../controllers/weeklyDiseasesReportController');
const { auth } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(auth());

/**
 * @route GET /api/v1/weekly-diseases-reports
 * @desc Get all weekly diseases reports with pagination and filtering
 * @access Private
 */
router.get('/', getAllReports);

/**
 * @route GET /api/v1/weekly-diseases-reports/current-week
 * @desc Get current week's report or create a new one
 * @access Private
 */
router.get('/current-week', getCurrentWeekReport);

/**
 * @route GET /api/v1/weekly-diseases-reports/statistics
 * @desc Get report statistics
 * @access Private
 */
router.get('/statistics', getReportStatistics);

/**
 * @route POST /api/v1/weekly-diseases-reports/:id/refresh-counts
 * @desc Refresh disease counts from assessments for a specific report
 * @access Private
 */
router.post('/:id/refresh-counts', refreshDiseaseCounts);

/**
 * @route GET /api/v1/weekly-diseases-reports/:id
 * @desc Get a specific weekly diseases report by ID
 * @access Private
 */
router.get('/:id', getReportById);

/**
 * @route POST /api/v1/weekly-diseases-reports
 * @desc Create a new weekly diseases report
 * @access Private
 */
router.post('/', createReport);

/**
 * @route PUT /api/v1/weekly-diseases-reports/:id
 * @desc Update a weekly diseases report
 * @access Private
 */
router.put('/:id', updateReport);

/**
 * @route DELETE /api/v1/weekly-diseases-reports/:id
 * @desc Delete a weekly diseases report
 * @access Private
 */
router.delete('/:id', deleteReport);

/**
 * @route GET /api/v1/weekly-diseases-reports/disease-stats
 * @desc Get disease statistics for a specific week
 * @access Private
 */
router.get('/disease-stats', getDiseaseStats);

module.exports = router;
