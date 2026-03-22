const mongoose = require('mongoose');

/**
 * Helper function to check MongoDB connection status
 * @returns {Object} Connection details and status
 */
const checkDbConnection = async () => {
  try {
    const connectionState = mongoose.connection.readyState;
    
    // Map mongoose connection states to readable strings
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized'
    };
    
    const stateStr = states[connectionState] || 'unknown';
    
    // Get more details if connected
    let details = {};
    if (connectionState === 1) {
      details = {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        collections: Object.keys(mongoose.connection.collections).length,
        models: Object.keys(mongoose.models).length
      };
    }
    
    console.log(`MongoDB connection state: ${stateStr}`, details);
    
    return {
      state: connectionState,
      stateStr,
      details,
      isConnected: connectionState === 1
    };
  } catch (err) {
    console.error('Error checking MongoDB connection:', err);
    return {
      state: -1,
      stateStr: 'error',
      error: err.message,
      isConnected: false
    };
  }
};

/**
 * Tries to perform a basic find operation on a collection to verify database is working
 * @param {String} modelName - Mongoose model to test
 * @returns {Object} Result of the test operation
 */
const testDbOperation = async (modelName = 'User') => {
  try {
    // Check connection first
    const connection = await checkDbConnection();
    if (!connection.isConnected) {
      return {
        success: false,
        message: `Cannot test DB operations, connection state is: ${connection.stateStr}`
      };
    }
    
    // Make sure the model exists
    if (!mongoose.models[modelName]) {
      return {
        success: false,
        message: `Model ${modelName} not found. Available models: ${Object.keys(mongoose.models).join(', ')}`
      };
    }
    
    // Try a simple find operation
    const model = mongoose.models[modelName];
    console.log(`Testing DB operation with model: ${modelName}`);
    
    const startTime = Date.now();
    const result = await model.findOne().limit(1).lean();
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      duration,
      hasResults: !!result,
      message: `Database operation completed in ${duration}ms`
    };
  } catch (err) {
    console.error(`Error testing DB operation with ${modelName}:`, err);
    return {
      success: false,
      error: err.message,
      message: `Database operation failed: ${err.message}`
    };
  }
};

module.exports = {
  checkDbConnection,
  testDbOperation
}; 
