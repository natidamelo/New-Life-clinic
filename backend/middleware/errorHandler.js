const winston = require('winston');

// Configure winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'clinic-cms-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Add console transport in development environment
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Handle CORS preflight errors
 */
const corsErrorHandler = (err, req, res, next) => {
  if (err.message.includes('CORS')) {
    logger.error('CORS Error:', { error: err.message, origin: req.headers.origin, path: req.path });
    return res.status(403).json({
      success: false,
      message: 'CORS error: Origin not allowed',
      error: 'cors_rejected'
    });
  }
  next(err);
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Not Found - ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('API Error:', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    statusCode: err.statusCode || 500,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '(hidden in production)' : err.stack
  });

  // Handle MongoDB duplicate key errors
  if ((err.name === 'MongoError' || err.name === 'MongoServerError') && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate value for ${field}: ${value}. Please use another value.`;
    return res.status(409).json({
      success: false,
      message,
      error: 'duplicate_key'
    });
  }
  
  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
      error: 'validation_error'
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please log in again.',
      error: 'invalid_token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Your session has expired. Please log in again.',
      error: 'token_expired'
    });
  }

  // Handle Mongoose/MongoDB connection errors
  if (err.name === 'MongooseError' || 
      err.name === 'MongoServerError' || 
      err.name === 'MongoNetworkError' ||
      err.name === 'MongoTimeoutError' ||
      err.message?.includes('buffering timed out') ||
      err.message?.includes('Operation') && err.message?.includes('buffering timed out')) {
    logger.error('Database connection error:', err.message);
    return res.status(503).json({
      success: false,
      message: 'Database service unavailable. Please ensure MongoDB is running.',
      error: 'database_unavailable',
      retryAfter: 5
    });
  }

  // Send standardized error response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: err.isOperational ? err.name : 'server_error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  ApiError,
  corsErrorHandler,
  notFound,
  errorHandler,
  logger
}; 
