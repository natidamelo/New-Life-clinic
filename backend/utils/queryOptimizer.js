const mongoose = require('mongoose');
const { logger } = require('../middleware/errorHandler');

/**
 * Query optimization utilities for preventing timeouts and improving performance
 */

// Default query options for optimization
const DEFAULT_QUERY_OPTIONS = {
  maxTimeMS: 10000,        // 10 second timeout
  limit: 1000,             // Default limit to prevent large result sets
  lean: false,             // Don't use lean by default - can be overridden per query
  allowDiskUse: true       // Allow MongoDB to use disk for large operations
};

// Specific timeouts for different operation types
const OPERATION_TIMEOUTS = {
  find: 10000,             // 10 seconds for find operations
  findOne: 5000,           // 5 seconds for single document queries
  aggregate: 15000,        // 15 seconds for aggregation pipelines
  count: 8000,             // 8 seconds for count operations
  update: 12000,           // 12 seconds for update operations
  delete: 10000,           // 10 seconds for delete operations
  create: 8000             // 8 seconds for create operations
};

/**
 * Optimize a find query with performance enhancements
 * @param {mongoose.Query} query - The mongoose query to optimize
 * @param {Object} options - Additional options
 * @returns {mongoose.Query} Optimized query
 */
const optimizeFindQuery = (query, options = {}) => {
  const opts = { ...DEFAULT_QUERY_OPTIONS, ...options };
  
  return query
    .maxTimeMS(opts.maxTimeMS || OPERATION_TIMEOUTS.find)
    .limit(opts.limit)
    .lean(opts.lean);
};

/**
 * Optimize a findOne query
 * @param {mongoose.Query} query - The mongoose query to optimize
 * @param {Object} options - Additional options
 * @returns {mongoose.Query} Optimized query
 */
const optimizeFindOneQuery = (query, options = {}) => {
  const opts = { ...DEFAULT_QUERY_OPTIONS, ...options };
  
  return query
    .maxTimeMS(opts.maxTimeMS || OPERATION_TIMEOUTS.findOne)
    .lean(opts.lean);
};

/**
 * Optimize an aggregation pipeline
 * @param {mongoose.Aggregate} aggregate - The mongoose aggregate to optimize
 * @param {Object} options - Additional options
 * @returns {mongoose.Aggregate} Optimized aggregate
 */
const optimizeAggregateQuery = (aggregate, options = {}) => {
  const opts = { ...DEFAULT_QUERY_OPTIONS, ...options };
  
  return aggregate
    .maxTimeMS(opts.maxTimeMS || OPERATION_TIMEOUTS.aggregate)
    .allowDiskUse(opts.allowDiskUse);
};

/**
 * Optimize a count query
 * @param {mongoose.Query} query - The mongoose query to optimize
 * @param {Object} options - Additional options
 * @returns {mongoose.Query} Optimized query
 */
const optimizeCountQuery = (query, options = {}) => {
  const opts = { ...DEFAULT_QUERY_OPTIONS, ...options };
  
  return query.maxTimeMS(opts.maxTimeMS || OPERATION_TIMEOUTS.count);
};

/**
 * Optimize an update query
 * @param {mongoose.Query} query - The mongoose query to optimize
 * @param {Object} options - Additional options
 * @returns {mongoose.Query} Optimized query
 */
const optimizeUpdateQuery = (query, options = {}) => {
  const opts = { ...DEFAULT_QUERY_OPTIONS, ...options };
  
  return query.maxTimeMS(opts.maxTimeMS || OPERATION_TIMEOUTS.update);
};

/**
 * Optimize a delete query
 * @param {mongoose.Query} query - The mongoose query to optimize
 * @param {Object} options - Additional options
 * @returns {mongoose.Query} Optimized query
 */
const optimizeDeleteQuery = (query, options = {}) => {
  const opts = { ...DEFAULT_QUERY_OPTIONS, ...options };
  
  return query.maxTimeMS(opts.maxTimeMS || OPERATION_TIMEOUTS.delete);
};

/**
 * Execute a query with timeout handling and error recovery
 * @param {Function} queryFn - Function that returns a query
 * @param {string} operationType - Type of operation for logging
 * @param {Object} options - Additional options
 * @returns {Promise} Query result
 */
const executeWithTimeout = async (queryFn, operationType = 'query', options = {}) => {
  const startTime = Date.now();
  
  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;
    
    if (duration > 5000) { // Log slow queries
      logger.warn(`Slow ${operationType} detected: ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle specific timeout errors
    if (error.name === 'MongoServerError' && error.code === 50) {
      logger.error(`${operationType} timeout after ${duration}ms: ${error.message}`);
      throw new Error(`Database operation timed out. Please try again or contact support if the problem persists.`);
    }
    
    // Handle connection errors
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      logger.error(`${operationType} network error after ${duration}ms: ${error.message}`);
      throw new Error(`Database connection error. Please check your connection and try again.`);
    }
    
    // Handle other MongoDB errors
    if (error.name && error.name.startsWith('Mongo')) {
      logger.error(`${operationType} MongoDB error after ${duration}ms: ${error.message}`);
      throw new Error(`Database error occurred. Please try again later.`);
    }
    
    // Re-throw other errors
    logger.error(`${operationType} error after ${duration}ms:`, error);
    throw error;
  }
};

/**
 * Create a safe query wrapper that handles common issues
 * @param {mongoose.Model} Model - The mongoose model
 * @param {string} operation - The operation type
 * @param {Array} args - Arguments for the operation
 * @param {Object} options - Additional options
 * @returns {Promise} Query result
 */
const safeQuery = async (Model, operation, args = [], options = {}) => {
  const operationType = `${Model.modelName}.${operation}`;
  
  return executeWithTimeout(async () => {
    let query;
    
    switch (operation) {
      case 'find':
        query = Model.find(...args);
        return optimizeFindQuery(query, options);
        
      case 'findOne':
        query = Model.findOne(...args);
        return optimizeFindOneQuery(query, options);
        
      case 'findById':
        query = Model.findById(...args);
        return optimizeFindOneQuery(query, options);
        
      case 'countDocuments':
        query = Model.countDocuments(...args);
        return optimizeCountQuery(query, options);
        
      case 'updateOne':
      case 'updateMany':
        query = Model[operation](...args);
        return optimizeUpdateQuery(query, options);
        
      case 'deleteOne':
      case 'deleteMany':
        query = Model[operation](...args);
        return optimizeDeleteQuery(query, options);
        
      case 'aggregate':
        const aggregate = Model.aggregate(...args);
        return optimizeAggregateQuery(aggregate, options);
        
      case 'create':
        // Create operations don't return queries, handle differently
        const createPromise = Model.create(...args);
        return Promise.race([
          createPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Create operation timed out')), 
            OPERATION_TIMEOUTS.create)
          )
        ]);
        
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }, operationType, options);
};

/**
 * Batch process large datasets to prevent memory issues
 * @param {mongoose.Model} Model - The mongoose model
 * @param {Object} filter - Query filter
 * @param {Function} processFn - Function to process each batch
 * @param {Object} options - Batch processing options
 * @returns {Promise} Processing result
 */
const batchProcess = async (Model, filter = {}, processFn, options = {}) => {
  const {
    batchSize = 100,
    maxBatches = 100,
    sortField = '_id',
    sortOrder = 1
  } = options;
  
  let processed = 0;
  let lastId = null;
  let batchCount = 0;
  
  while (batchCount < maxBatches) {
    const batchFilter = { ...filter };
    if (lastId) {
      batchFilter[sortField] = { $gt: lastId };
    }
    
    const batch = await safeQuery(Model, 'find', [batchFilter], {
      limit: batchSize,
      lean: true,
      sort: { [sortField]: sortOrder }
    });
    
    if (batch.length === 0) {
      break; // No more documents
    }
    
    await processFn(batch);
    
    processed += batch.length;
    lastId = batch[batch.length - 1][sortField];
    batchCount++;
    
    logger.debug(`Processed batch ${batchCount}: ${batch.length} documents (total: ${processed})`);
  }
  
  return { processed, batches: batchCount };
};

/**
 * Check database connection health
 * @returns {Object} Connection health status
 */
const checkConnectionHealth = () => {
  const readyState = mongoose.connection.readyState;
  const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  return {
    isConnected: readyState === 1,
    state: stateNames[readyState],
    readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  };
};

/**
 * Create indexes for better query performance
 * @param {mongoose.Model} Model - The mongoose model
 * @param {Array} indexes - Array of index definitions
 * @returns {Promise} Index creation result
 */
const ensureIndexes = async (Model, indexes) => {
  const results = [];
  
  for (const indexDef of indexes) {
    try {
      const result = await Model.createIndex(indexDef.fields, indexDef.options || {});
      results.push({ success: true, index: indexDef, result });
      logger.info(`Index created for ${Model.modelName}: ${JSON.stringify(indexDef.fields)}`);
    } catch (error) {
      results.push({ success: false, index: indexDef, error: error.message });
      logger.error(`Failed to create index for ${Model.modelName}: ${error.message}`);
    }
  }
  
  return results;
};

module.exports = {
  optimizeFindQuery,
  optimizeFindOneQuery,
  optimizeAggregateQuery,
  optimizeCountQuery,
  optimizeUpdateQuery,
  optimizeDeleteQuery,
  executeWithTimeout,
  safeQuery,
  batchProcess,
  checkConnectionHealth,
  ensureIndexes,
  DEFAULT_QUERY_OPTIONS,
  OPERATION_TIMEOUTS
}; 
