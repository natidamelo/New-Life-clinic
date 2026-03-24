const rateLimit = require('express-rate-limit');
const { ApiError } = require('./errorHandler');

/**
 * Configure rate limit options
 * @param {Object} options - Custom rate limit options
 * @returns {Object} - Configured rate limiter options
 */
const configureRateLimiter = (options = {}) => {
  const {
    windowMs = process.env.RATE_LIMIT_WINDOW ? parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 : 15 * 60 * 1000,
    max = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 100,
    message = 'Too many requests, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = false,
    ...rest
  } = options;

  return {
    windowMs,
    max,
    message: {
      success: false,
      message,
      error: 'rate_limit_exceeded'
    },
    standardHeaders,
    legacyHeaders,
    skipSuccessfulRequests,
    // Custom handler to format the error response
    handler: (req, res, next, options) => {
      res.status(429).json(options.message);
    },
    // Skip rate limiting in development mode if specified
    skip: (req, res) => {
      // Skip rate limiting in development mode
      if (process.env.NODE_ENV !== 'production') {
        return true;
      }
      return false;
    },
    ...rest
  };
};

/**
 * General API rate limiter - applies to all API routes
 */
const apiLimiter = rateLimit(
  configureRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per window
    message: 'Too many API requests from this IP, please try again later'
  })
);

/**
 * Authentication rate limiter - more strict, for login/register endpoints
 */
const authLimiter = rateLimit(
  configureRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.AUTH_RATE_LIMIT_MAX ? parseInt(process.env.AUTH_RATE_LIMIT_MAX) : 30,
    message: 'Too many authentication attempts, please try again later',
    skipSuccessfulRequests: true
  })
);

/**
 * Standard rate limiter for normal endpoints
 */
const standardLimiter = rateLimit(
  configureRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests from this IP, please try again later'
  })
);

/**
 * No rate limit middleware - passes through all requests 
 * Use for public endpoints that don't need rate limiting
 */
const noRateLimit = (req, res, next) => {
  next();
};

module.exports = {
  apiLimiter,
  authLimiter,
  standardLimiter,
  noRateLimit,
  configureRateLimiter
}; 
