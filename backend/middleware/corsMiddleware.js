const cors = require('cors');
const { logger } = require('./errorHandler');

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5175',
  'http://127.0.0.1:5175',
  'http://192.168.1.8:5175',
  'http://10.56.140.157:5175',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

function getAllowedOrigins() {
  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
    : [];
  
  const merged = Array.from(new Set([...envOrigins, ...DEFAULT_ALLOWED_ORIGINS]));
  return merged;
}

function configureCorsOptions() {
  const allowedOrigins = getAllowedOrigins();

  return {
    origin(origin, callback) {
      if (!origin) {
        // Allow server-to-server or curl requests with no origin header
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        // Return the origin so cors sets it correctly
        return callback(null, origin);
      }

      // In non-production environments, be generous to prevent dev blocks
      if ((process.env.NODE_ENV || '').toLowerCase() !== 'production') {
        logger.warn(`⚠️ [CORS] Allowing non-whitelisted origin in ${process.env.NODE_ENV}: ${origin}`);
        // Return the origin so cors sets it correctly
        return callback(null, origin);
      }

      logger.warn(`🚫 [CORS] Blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200, // Changed from 204 to 200 for better compatibility
    maxAge: 86400,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Cache-Control',
      'Pragma',
      'Origin',
      'X-CSRF-Token',
      'X-Request-ID',
      'x-request-id',
      'Expires',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ],
    exposedHeaders: [
      'Content-Range',
      'X-Content-Range',
      'Cache-Control',
      'Pragma'
    ]
  };
}

const corsMiddleware = (req = {}, res, next) => {
  if (!req.headers) {
    req.headers = {};
  }
  
  // Apply CORS middleware - it will set headers based on the origin callback
  return cors(configureCorsOptions())(req, res, next);
};

const handleOptions = (req = {}, res) => {
  if (!req.headers) {
    req.headers = {};
  }
  
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = req.headers.origin;
  
  // Determine which origin to use
  let originToUse = '*';
  if (requestOrigin) {
    if (allowedOrigins.includes(requestOrigin)) {
      originToUse = requestOrigin;
    } else if ((process.env.NODE_ENV || '').toLowerCase() !== 'production') {
      // In dev mode, allow the request origin
      originToUse = requestOrigin;
    } else {
      originToUse = allowedOrigins[0] || '*';
    }
  }
  
  res.header('Access-Control-Allow-Origin', originToUse);
  if (originToUse !== '*') {
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Cache-Control, Pragma, Origin, X-CSRF-Token, X-Request-ID, x-request-id');
  res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range, Cache-Control, Pragma');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Cache-Control', 'public, max-age=86400');
  res.header('Vary', 'Origin');
  
  res.status(204).end();
};

module.exports = {
  corsMiddleware,
  handleOptions,
  configureCorsOptions,
  getAllowedOrigins
}; 
