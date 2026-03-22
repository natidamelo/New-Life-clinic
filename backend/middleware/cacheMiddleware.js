const { logger } = require('./errorHandler');

/**
 * Simple in-memory cache store
 * For production use, consider using Redis or another distributed cache system
 */
class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 60; // Default TTL in seconds
    this.checkPeriod = options.checkPeriod || 600; // Cleanup every 10 minutes
    this.maxSize = options.maxSize || 100; // Maximum number of items in cache
    
    // Set up periodic cleanup
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, this.checkPeriod * 1000);
  }
  
  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or undefined if not found/expired
   */
  get(key) {
    const item = this.cache.get(key);
    
    // Return undefined if item doesn't exist or is expired
    if (!item || (item.expiry && item.expiry < Date.now())) {
      return undefined;
    }
    
    return item.value;
  }
  
  /**
   * Store a value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  set(key, value, ttl = this.defaultTTL) {
    // If maxSize reached, remove oldest item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    const expiry = ttl > 0 ? Date.now() + (ttl * 1000) : null;
    
    this.cache.set(key, {
      value,
      expiry,
      createdAt: Date.now()
    });
  }
  
  /**
   * Remove a value from cache
   * @param {string} key - Cache key
   */
  del(key) {
    this.cache.delete(key);
  }
  
  /**
   * Clear entire cache
   */
  flush() {
    this.cache.clear();
  }
  
  /**
   * Get stats about cache usage
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
  
  /**
   * Clean up expired items
   */
  cleanup() {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry && item.expiry < now) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      logger.debug(`Cache cleanup: removed ${deletedCount} expired items`);
    }
  }
  
  /**
   * Find the oldest key in the cache
   * @returns {string|null}
   */
  getOldestKey() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.createdAt < oldestTime) {
        oldestKey = key;
        oldestTime = item.createdAt;
      }
    }
    
    return oldestKey;
  }
  
  /**
   * Stop the cleanup interval when no longer needed
   */
  close() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Create a global cache instance
const cache = new MemoryCache({
  defaultTTL: process.env.CACHE_TTL || 60, // 1 minute default
  maxSize: process.env.CACHE_MAX_SIZE || 500
});

/**
 * Route caching middleware
 * @param {number} duration - Cache TTL in milliseconds
 * @param {Function} keyGenerator - Function to generate cache key (defaults to URL)
 */
const cacheMiddleware = (duration, keyGenerator) => {
  // Convert milliseconds to seconds for internal storage
  const durationSeconds = duration >= 1000 ? Math.floor(duration / 1000) : duration;
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip caching in development when CACHE_DISABLED is true
    if (process.env.NODE_ENV === 'development' && process.env.CACHE_DISABLED === 'true') {
      return next();
    }
    
    // Generate cache key
    const key = keyGenerator ? keyGenerator(req) : req.originalUrl;
    
    // Try to get cached response
    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      logger.debug(`Cache hit: ${key}`);
      
      // Send cached response
      res.setHeader('X-Cache', 'HIT');
      return res.status(cachedResponse.status)
        .set(cachedResponse.headers)
        .send(cachedResponse.body);
    }
    
    // Cache miss - store the original res.send method
    const originalSend = res.send;
    
    // Override res.send method to cache the response
    res.send = function(body) {
      // Don't cache error responses
      if (res.statusCode >= 400) {
        return originalSend.call(this, body);
      }
      
      // Store response in cache
      const responseToCache = {
        status: res.statusCode,
        headers: res._headers,
        body
      };
      
      cache.set(key, responseToCache, durationSeconds);
      logger.debug(`Cache set: ${key}, TTL: ${durationSeconds}s`);
      
      // Set cache header
      res.setHeader('X-Cache', 'MISS');
      
      // Call original send method
      return originalSend.call(this, body);
    };
    
    next();
  };
};

/**
 * Clears cache for a specific key or pattern
 * @param {string} pattern - Key pattern to clear
 */
const clearCache = (pattern) => {
  let count = 0;
  
  if (pattern) {
    // If pattern is provided, clear matching keys
    const stats = cache.getStats();
    for (const key of stats.keys) {
      if (key.includes(pattern)) {
        cache.del(key);
        count++;
      }
    }
  } else {
    // If no pattern provided, flush entire cache
    cache.flush();
    count = 'all';
  }
  
  logger.info(`Cleared ${count} cache entries ${pattern ? `matching '${pattern}'` : ''}`);
  return count;
};

/**
 * Routes to manually manage the cache
 * @param {object} router - Express router
 */
const setupCacheRoutes = (router) => {
  router.get('/api/admin/cache/stats', (req, res) => {
    res.json({
      success: true,
      stats: cache.getStats()
    });
  });
  
  router.post('/api/admin/cache/clear', (req, res) => {
    const pattern = req.body.pattern || '';
    const count = clearCache(pattern);
    
    res.json({
      success: true,
      message: `Cleared ${count} cache entries ${pattern ? `matching '${pattern}'` : ''}`,
    });
  });
};

module.exports = {
  cache,
  cacheMiddleware,
  clearCache,
  setupCacheRoutes
}; 
