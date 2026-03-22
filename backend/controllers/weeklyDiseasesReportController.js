const WeeklyDiseasesReport = require('../models/WeeklyDiseasesReport');
const { logger } = require('../middleware/errorHandler');
const { countDiseasesFromAssessments, getDiseaseStatistics } = require('../services/diseaseMappingService');

/**
 * Get all weekly diseases reports
 */
const getAllReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const query = {};

    // Filter by date range if provided
    if (startDate || endDate) {
      query.reportDate = {};
      if (startDate) query.reportDate.$gte = new Date(startDate);
      if (endDate) query.reportDate.$lte = new Date(endDate);
    }

    const reports = await WeeklyDiseasesReport.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ reportDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await WeeklyDiseasesReport.countDocuments(query);

    res.json({
      success: true,
      data: reports,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    logger.error('Error fetching weekly diseases reports:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
};

/**
 * Get a specific weekly diseases report by ID
 */
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await WeeklyDiseasesReport.findById(id)
      .populate('createdBy', 'firstName lastName email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Weekly diseases report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error fetching weekly diseases report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report',
      error: error.message
    });
  }
};

/**
 * Create a new weekly diseases report
 */
const createReport = async (req, res) => {
  try {
    const { weekStartDate, weekEndDate, healthCenter, weeklyIndicators, reportableConditions } = req.body;

    // Validate required fields
    if (!weekStartDate || !weekEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Week start date and end date are required'
      });
    }

    // Check if report already exists for this week
    const existingReport = await WeeklyDiseasesReport.findOne({
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate)
    });

    if (existingReport) {
      return res.status(400).json({
        success: false,
        message: 'A report for this week already exists'
      });
    }

    const reportData = {
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate),
      healthCenter: healthCenter || 'Health Center',
      createdBy: req.user._id || req.user.id,
      weeklyIndicators: weeklyIndicators || {},
      reportableConditions: reportableConditions || {}
    };

    const report = new WeeklyDiseasesReport(reportData);
    await report.save();

    // Populate the created report
    await report.populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Weekly diseases report created successfully',
      data: report
    });
  } catch (error) {
    logger.error('Error creating weekly diseases report:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating report',
      error: error.message
    });
  }
};

/**
 * Update a weekly diseases report
 */
const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { weeklyIndicators, reportableConditions } = req.body;

    const report = await WeeklyDiseasesReport.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Weekly diseases report not found'
      });
    }

    // Update fields
    if (weeklyIndicators) {
      report.weeklyIndicators = { ...report.weeklyIndicators, ...weeklyIndicators };
    }
    if (reportableConditions) {
      report.reportableConditions = { ...report.reportableConditions, ...reportableConditions };
    }

    report.lastModified = new Date();
    await report.save();

    // Populate the updated report
    await report.populate('createdBy', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Weekly diseases report updated successfully',
      data: report
    });
  } catch (error) {
    logger.error('Error updating weekly diseases report:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating report',
      error: error.message
    });
  }
};

/**
 * Delete a weekly diseases report
 */
const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await WeeklyDiseasesReport.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Weekly diseases report not found'
      });
    }

    await WeeklyDiseasesReport.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Weekly diseases report deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting weekly diseases report:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting report',
      error: error.message
    });
  }
};

/**
 * Get current week's report or create a new one
 */
const getCurrentWeekReport = async (req, res) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of current week (Saturday)

    let report = await WeeklyDiseasesReport.findOne({
      weekStartDate: { $gte: startOfWeek, $lt: new Date(startOfWeek.getTime() + 24 * 60 * 60 * 1000) },
      weekEndDate: { $gte: endOfWeek, $lt: new Date(endOfWeek.getTime() + 24 * 60 * 60 * 1000) }
    }).populate('createdBy', 'firstName lastName email');

    if (!report) {
      // Get disease counts from assessments for this week
      let diseaseCounts = { weeklyIndicators: {}, reportableConditions: {} };
      
      try {
        diseaseCounts = await countDiseasesFromAssessments(startOfWeek, endOfWeek);
        logger.info(`Auto-populated disease counts for week ${startOfWeek.toISOString().split('T')[0]} to ${endOfWeek.toISOString().split('T')[0]}:`, diseaseCounts);
      } catch (error) {
        logger.warn('Could not auto-populate disease counts from assessments:', error.message);
      }

      // Create a new report for current week with auto-populated data
      const reportData = {
        weekStartDate: startOfWeek,
        weekEndDate: endOfWeek,
        healthCenter: 'Health Center',
        createdBy: req.user._id || req.user.id,
        weeklyIndicators: diseaseCounts.weeklyIndicators,
        reportableConditions: diseaseCounts.reportableConditions
      };

      report = new WeeklyDiseasesReport(reportData);
      await report.save();
      await report.populate('createdBy', 'firstName lastName email');
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error getting current week report:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting current week report',
      error: error.message
    });
  }
};

/**
 * Get report statistics
 */
const getReportStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.reportDate = {};
      if (startDate) query.reportDate.$gte = new Date(startDate);
      if (endDate) query.reportDate.$lte = new Date(endDate);
    }

    const totalReports = await WeeklyDiseasesReport.countDocuments(query);
    const latestReport = await WeeklyDiseasesReport.findOne(query)
      .sort({ reportDate: -1 })
      .populate('createdBy', 'firstName lastName');

    res.json({
      success: true,
      data: {
        totalReports,
        latestReport: latestReport ? {
          id: latestReport._id,
          reportDate: latestReport.reportDate,
          weekStartDate: latestReport.weekStartDate,
          weekEndDate: latestReport.weekEndDate,
          createdBy: latestReport.createdBy
        } : null
      }
    });
  } catch (error) {
    logger.error('Error getting report statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting statistics',
      error: error.message
    });
  }
};

/**
 * Refresh disease counts from assessments for a specific report
 */
const refreshDiseaseCounts = async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await WeeklyDiseasesReport.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Weekly diseases report not found'
      });
    }

    // Get fresh disease counts from assessments
    const diseaseCounts = await countDiseasesFromAssessments(report.weekStartDate, report.weekEndDate);
    
    // Update the report with new counts
    report.weeklyIndicators = { ...report.weeklyIndicators, ...diseaseCounts.weeklyIndicators };
    report.reportableConditions = { ...report.reportableConditions, ...diseaseCounts.reportableConditions };
    report.lastModified = new Date();
    
    await report.save();
    await report.populate('createdBy', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Disease counts refreshed successfully',
      data: report
    });
  } catch (error) {
    logger.error('Error refreshing disease counts:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing disease counts',
      error: error.message
    });
  }
};

/**
 * Get disease statistics for a specific week
 */
const getDiseaseStats = async (req, res) => {
  try {
    const { weekStartDate, weekEndDate } = req.query;
    
    if (!weekStartDate || !weekEndDate) {
      return res.status(400).json({
        success: false,
        message: 'Week start date and end date are required'
      });
    }

    const stats = await getDiseaseStatistics(new Date(weekStartDate), new Date(weekEndDate));
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting disease statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting disease statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  getCurrentWeekReport,
  getReportStatistics,
  refreshDiseaseCounts,
  getDiseaseStats
};
