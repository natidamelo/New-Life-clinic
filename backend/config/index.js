const dotenv = require('dotenv');
const path = require('path');
const { logger } = require('../middleware/errorHandler');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Configuration validation
 */
const validateConfig = (config) => {
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'MONGO_URI'
  ];
  
  const missingVars = requiredVars.filter(key => !config[key]);
  
  if (missingVars.length > 0) {
    if (config.NODE_ENV === 'production') {
      logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    } else {
      logger.warn(`Missing recommended environment variables: ${missingVars.join(', ')}`);
    }
  }
  
  return config;
};

/**
 * Default configuration with fallbacks
 */
const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5002', 10),
  HOST: process.env.HOST || 'localhost',
  
  // MongoDB
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms',
  
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'development' 
    ? 'clinic-management-system-default-secret-key-12345' 
    : undefined),
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '24h',
  
  // CORS - Allow common development IPs and network ranges
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5175,http://127.0.0.1:5175,http://192.168.222.157:5175,http://192.168.222.44:5175,http://192.168.91.144:5175,http://192.168.34.157:5175,http://192.168.76.157:5175,http://192.168.22.146:5175,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://192.168.1.:5175,http://192.168.0.:5175,http://192.168.222.:5175',
  
  // Rate limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10), // minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // requests per window
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '5', 10), // login attempts
  SKIP_RATE_LIMIT: process.env.SKIP_RATE_LIMIT === 'true',
  
  // Caching
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '60', 10), // seconds
  CACHE_MAX_SIZE: parseInt(process.env.CACHE_MAX_SIZE || '500', 10), // items
  CACHE_DISABLED: process.env.CACHE_DISABLED === 'true',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // WebSocket
  WS_PATH: process.env.WS_PATH || '/ws',
  
  // Features
  ENABLE_SWAGGER: process.env.ENABLE_SWAGGER !== 'false',
  
  // Security
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  
  // Financial Configuration
  INCLUDE_MEDICAL_USE_IN_COGS: process.env.INCLUDE_MEDICAL_USE_IN_COGS !== 'false', // Default: include
  
  // Email configuration (if needed in future)
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT) || 587,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  
  // File upload configuration
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  UPLOAD_PATH: process.env.UPLOAD_PATH || './public/uploads'
};

// Override PORT if it's been set to 5002 specifically
if (process.env.PORT === '5002') {
  config.PORT = 5002;
  config.HOST = 'localhost';
}

// Validate config during initialization
const validatedConfig = validateConfig(config);

// Print config in development mode
if (validatedConfig.NODE_ENV === 'development') {
  // Filter out sensitive values
  const printableConfig = { ...validatedConfig };
  const sensitiveKeys = ['JWT_SECRET', 'MONGO_URI'];
  
  sensitiveKeys.forEach(key => {
    if (printableConfig[key]) {
      printableConfig[key] = '[REDACTED]';
    }
  });
  
  logger.info('Server configuration:', printableConfig);
}

module.exports = validatedConfig; 
