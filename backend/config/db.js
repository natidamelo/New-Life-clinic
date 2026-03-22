const mongoose = require('mongoose');
const config = require('./index');
const { logger } = require('../middleware/errorHandler');

// Connection monitoring and statistics
let connectionStats = {
  totalConnections: 0,
  activeConnections: 0,
  connectionErrors: 0,
  reconnectAttempts: 0,
  lastConnected: null,
  lastDisconnected: null,
  connectionHistory: []
};

// Connection pool monitoring
let poolMonitor = {
  maxPoolSize: 0,
  currentPoolSize: 0,
  availableConnections: 0,
  checkedOutConnections: 0
};

// Track if event listeners have been set up
let eventListenersSetup = false;

/**
 * Database connection function with comprehensive management
 * @returns {Promise<mongoose.Connection>} Mongoose connection object
 */
const connectDB = async () => {
  try {
    // Set up event listeners on first call (even if connection fails)
    if (!eventListenersSetup) {
      setupConnectionEventListeners();
      eventListenersSetup = true;
      logger.info('MongoDB event listeners initialized');
    }
    
    logger.info(`Connecting to MongoDB at ${config.MONGO_URI.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://****:****@')}`);
    
    // Enhanced connection options with strict limits
    const options = {
      // Connection pooling settings - STRICT LIMITS
      maxPoolSize: 5,          // Reduced to prevent pool exhaustion
      minPoolSize: 1,          // Minimum connections
      maxIdleTimeMS: 30000,    // Close connections after 30s idle
      waitQueueTimeoutMS: 5000, // Max wait time for connection from pool
      
      // Timeout settings - AGGRESSIVE
      socketTimeoutMS: 20000,   // Socket timeout
      connectTimeoutMS: 5000,   // Connection timeout
      serverSelectionTimeoutMS: 3000, // Server selection timeout
      heartbeatFrequencyMS: 5000,     // Heartbeat frequency
      
      // Connection behavior
      family: 4,               // Use IPv4 only
      bufferCommands: false,   // Disable mongoose buffering
      
      // Monitoring and debugging
      monitorCommands: true   // Enable command monitoring
    };
    
    // Update pool monitor settings
    poolMonitor.maxPoolSize = options.maxPoolSize;
    
    // Connect to MongoDB
    const conn = await mongoose.connect(config.MONGO_URI, options);
    
    // Update connection stats
    connectionStats.totalConnections++;
    connectionStats.activeConnections++;
    connectionStats.lastConnected = new Date();
    connectionStats.connectionHistory.push({
      event: 'connected',
      timestamp: new Date(),
      host: conn.connection.host
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    logger.info('MongoDB connected...');
    
    // Start connection monitoring (only once)
    if (!global.connectionMonitoringStarted) {
      startConnectionMonitoring();
      global.connectionMonitoringStarted = true;
    }
    
    // Set up periodic cleanup (only once)
    if (!global.periodicCleanupStarted) {
      setupPeriodicCleanup();
      global.periodicCleanupStarted = true;
    }
    
    return conn;
  } catch (err) {
    connectionStats.connectionErrors++;
    logger.error(`Error connecting to MongoDB: ${err.message}`);
    
    // Implement retry logic for initial connection
    if (config.NODE_ENV !== 'test') {
      connectionStats.reconnectAttempts++;
      logger.info('Retrying connection in 3 seconds...');
      setTimeout(() => {
        connectDB().catch((retryErr) => {
          // Silently handle retry errors - they'll be logged on the next retry
          logger.debug(`Retry connection attempt failed: ${retryErr.message}`);
        });
      }, 3000);
      // Don't throw error - allow server to start
      return null;
    } else {
      throw err;
    }
  }
};

/**
 * Set up comprehensive connection event listeners
 */
const setupConnectionEventListeners = () => {
  // Connection events
  mongoose.connection.on('connected', () => {
    connectionStats.activeConnections++;
    connectionStats.lastConnected = new Date();
    logger.info('MongoDB connection established');
  });
  
  mongoose.connection.on('error', (err) => {
    connectionStats.connectionErrors++;
    logger.error(`MongoDB connection error: ${err}`);
    
    // Log connection pool status on error
    logConnectionPoolStatus();
  });
  
  mongoose.connection.on('disconnected', () => {
    connectionStats.activeConnections = Math.max(0, connectionStats.activeConnections - 1);
    connectionStats.lastDisconnected = new Date();
    connectionStats.connectionHistory.push({
      event: 'disconnected',
      timestamp: new Date()
    });
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
  });
  
  mongoose.connection.on('reconnected', () => {
    connectionStats.activeConnections++;
    connectionStats.lastConnected = new Date();
    connectionStats.connectionHistory.push({
      event: 'reconnected',
      timestamp: new Date()
    });
    logger.info('MongoDB reconnected');
  });
  
  mongoose.connection.on('reconnectFailed', () => {
    connectionStats.connectionErrors++;
    logger.error('MongoDB reconnection failed after maximum attempts');
    
    // Force cleanup on reconnect failure
    forceConnectionCleanup();
    
    if (config.NODE_ENV === 'production') {
      logger.error('Critical database failure in production - exiting process');
      process.exit(1);
    }
  });
  
  // Connection pool events (if available)
  mongoose.connection.on('connectionPoolCreated', (event) => {
    logger.info(`Connection pool created: ${JSON.stringify(event)}`);
  });
  
  mongoose.connection.on('connectionPoolClosed', (event) => {
    logger.info(`Connection pool closed: ${JSON.stringify(event)}`);
  });
  
  mongoose.connection.on('connectionCreated', (event) => {
    poolMonitor.currentPoolSize++;
    logger.debug(`New connection created. Pool size: ${poolMonitor.currentPoolSize}`);
  });
  
  mongoose.connection.on('connectionClosed', (event) => {
    poolMonitor.currentPoolSize = Math.max(0, poolMonitor.currentPoolSize - 1);
    logger.debug(`Connection closed. Pool size: ${poolMonitor.currentPoolSize}`);
  });
  
  mongoose.connection.on('connectionCheckOutStarted', (event) => {
    poolMonitor.checkedOutConnections++;
    poolMonitor.availableConnections = Math.max(0, poolMonitor.currentPoolSize - poolMonitor.checkedOutConnections);
  });
  
  mongoose.connection.on('connectionCheckedOut', (event) => {
    logger.debug(`Connection checked out. Available: ${poolMonitor.availableConnections}`);
  });
  
  mongoose.connection.on('connectionCheckOutFailed', (event) => {
    logger.warn(`Connection checkout failed: ${event.reason}`);
    poolMonitor.checkedOutConnections = Math.max(0, poolMonitor.checkedOutConnections - 1);
    poolMonitor.availableConnections = poolMonitor.currentPoolSize - poolMonitor.checkedOutConnections;
  });
  
  mongoose.connection.on('connectionCheckedIn', (event) => {
    poolMonitor.checkedOutConnections = Math.max(0, poolMonitor.checkedOutConnections - 1);
    poolMonitor.availableConnections = poolMonitor.currentPoolSize - poolMonitor.checkedOutConnections;
    logger.debug(`Connection checked in. Available: ${poolMonitor.availableConnections}`);
  });
};

/**
 * Start connection monitoring with periodic health checks
 */
const startConnectionMonitoring = () => {
  // Monitor connection health every 30 seconds
  setInterval(() => {
    const readyState = mongoose.connection.readyState;
    const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    logger.debug(`MongoDB Status: ${stateNames[readyState]} | Pool: ${poolMonitor.currentPoolSize}/${poolMonitor.maxPoolSize} | Available: ${poolMonitor.availableConnections}`);
    
    // Check for potential issues
    if (poolMonitor.checkedOutConnections > poolMonitor.maxPoolSize * 0.8) {
      logger.warn(`High connection usage: ${poolMonitor.checkedOutConnections}/${poolMonitor.maxPoolSize} connections in use`);
    }
    
    if (connectionStats.connectionErrors > 10) {
      logger.error(`High error count: ${connectionStats.connectionErrors} connection errors detected`);
    }
    
    // Log detailed status every 5 minutes
    if (Date.now() % 300000 < 30000) { // Every 5 minutes (with 30s tolerance)
      logDetailedConnectionStatus();
    }
  }, 30000);
  
  // Cleanup stale connections every 2 minutes
  setInterval(() => {
    cleanupStaleConnections();
  }, 120000);
};

/**
 * Set up periodic cleanup tasks
 */
const setupPeriodicCleanup = () => {
  // Force garbage collection every 10 minutes (if available)
  setInterval(() => {
    if (global.gc) {
      logger.debug('Running garbage collection...');
      global.gc();
    }
    
    // Reset error counters periodically
    if (connectionStats.connectionErrors > 50) {
      logger.info('Resetting connection error counter');
      connectionStats.connectionErrors = Math.floor(connectionStats.connectionErrors / 2);
    }
    
    // Trim connection history
    if (connectionStats.connectionHistory.length > 100) {
      connectionStats.connectionHistory = connectionStats.connectionHistory.slice(-50);
    }
  }, 600000); // 10 minutes
};

/**
 * Log connection pool status
 */
const logConnectionPoolStatus = () => {
  logger.info('=== Connection Pool Status ===');
  logger.info(`Pool Size: ${poolMonitor.currentPoolSize}/${poolMonitor.maxPoolSize}`);
  logger.info(`Available: ${poolMonitor.availableConnections}`);
  logger.info(`Checked Out: ${poolMonitor.checkedOutConnections}`);
  logger.info(`Connection State: ${['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]}`);
  logger.info('==============================');
};

/**
 * Log detailed connection status
 */
const logDetailedConnectionStatus = () => {
  logger.info('=== Detailed MongoDB Status ===');
  logger.info(`Total Connections: ${connectionStats.totalConnections}`);
  logger.info(`Active Connections: ${connectionStats.activeConnections}`);
  logger.info(`Connection Errors: ${connectionStats.connectionErrors}`);
  logger.info(`Reconnect Attempts: ${connectionStats.reconnectAttempts}`);
  logger.info(`Last Connected: ${connectionStats.lastConnected}`);
  logger.info(`Last Disconnected: ${connectionStats.lastDisconnected}`);
  logger.info(`Pool Status: ${poolMonitor.currentPoolSize}/${poolMonitor.maxPoolSize} (${poolMonitor.availableConnections} available)`);
  logger.info('===============================');
};

/**
 * Clean up stale connections
 */
const cleanupStaleConnections = () => {
  try {
    const readyState = mongoose.connection.readyState;
    
    if (readyState === 1) { // Connected
      // Check if we have too many idle connections
      if (poolMonitor.availableConnections > poolMonitor.maxPoolSize * 0.7) {
        logger.debug('High number of idle connections detected, allowing natural cleanup');
      }
    } else if (readyState === 0) { // Disconnected
      logger.warn('Database disconnected during cleanup check');
      // Reset pool monitor
      poolMonitor.currentPoolSize = 0;
      poolMonitor.availableConnections = 0;
      poolMonitor.checkedOutConnections = 0;
    }
  } catch (error) {
    logger.error(`Error during connection cleanup: ${error.message}`);
  }
};

/**
 * Force connection cleanup (emergency measure)
 */
const forceConnectionCleanup = async () => {
  try {
    logger.warn('Forcing connection cleanup...');
    
    // Reset all monitoring counters
    poolMonitor.currentPoolSize = 0;
    poolMonitor.availableConnections = 0;
    poolMonitor.checkedOutConnections = 0;
    
    // Close and recreate connection if needed
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(true); // Force close
      logger.info('Forced connection closure completed');
    }
    
    // Wait a moment before allowing reconnection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    logger.error(`Error during force cleanup: ${error.message}`);
  }
};

/**
 * Get connection statistics
 */
const getConnectionStats = () => {
  return {
    ...connectionStats,
    poolStatus: { ...poolMonitor },
    currentState: mongoose.connection.readyState,
    stateName: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
  };
};

/**
 * Gracefully close the MongoDB connection
 * @param {string} signal - The signal that triggered the shutdown
 */
const gracefulShutdown = async (signal) => {
  try {
    logger.info(`${signal} received - closing MongoDB connection`);
    
    // Stop all monitoring intervals
    // Note: In a real implementation, you'd want to track interval IDs and clear them
    
    // Log final statistics
    logDetailedConnectionStatus();
    
    // Close connection gracefully
    await mongoose.connection.close(false); // Don't force close initially
    
    logger.info('MongoDB connection closed gracefully');
    
    // Reset stats
    connectionStats.activeConnections = 0;
    poolMonitor.currentPoolSize = 0;
    poolMonitor.availableConnections = 0;
    poolMonitor.checkedOutConnections = 0;
    
    process.kill(process.pid, signal);
  } catch (err) {
    logger.error(`Error during MongoDB connection closure: ${err.message}`);
    
    // Force close if graceful close fails
    try {
      await mongoose.connection.close(true);
      logger.info('MongoDB connection force closed');
    } catch (forceErr) {
      logger.error(`Error during force close: ${forceErr.message}`);
    }
    
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  await gracefulShutdown('SIGINT');
});

process.on('SIGTERM', async () => {
  await gracefulShutdown('SIGTERM');
});

// For nodemon restarts or similar
process.on('SIGUSR2', async () => {
  await gracefulShutdown('SIGUSR2');
});

// Handle uncaught exceptions related to database
process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes('mongo')) {
    logger.error(`Uncaught MongoDB exception: ${err.message}`);
    forceConnectionCleanup();
  }
});

module.exports = {
  connectDB,
  getConnectionStats,
  logConnectionPoolStatus,
  forceConnectionCleanup,
  gracefulShutdown
}; 
