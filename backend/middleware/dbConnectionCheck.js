const mongoose = require('mongoose');
const { logger } = require('./errorHandler');

/**
 * Check if MongoDB is connected
 * @returns {boolean} True if connected, false otherwise
 */
const isDbConnected = () => {
  return mongoose.connection && mongoose.connection.readyState === 1;
};

/**
 * Middleware to check database connection before processing requests
 * Returns 503 if database is not connected
 */
const checkDbConnection = (req, res, next) => {
  if (!isDbConnected()) {
    logger.warn(`Database not connected for ${req.method} ${req.path}`);
    return res.status(503).json({
      success: false,
      message: 'Database service unavailable. Please ensure MongoDB is running.',
      error: 'database_unavailable',
      retryAfter: 5 // seconds
    });
  }
  next();
};

/**
 * Middleware that allows requests to proceed but adds db status to request
 * Use this for endpoints that can work without DB (like health checks)
 */
const optionalDbCheck = (req, res, next) => {
  req.dbConnected = isDbConnected();
  next();
};

module.exports = {
  isDbConnected,
  checkDbConnection,
  optionalDbCheck
};
