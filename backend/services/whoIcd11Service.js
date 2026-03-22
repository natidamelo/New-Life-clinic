const axios = require('axios');

/**
 * WHO ICD-11 API Service
 * Provides access to the WHO ICD-11 classification system API
 * 
 * API Documentation: https://icd.who.int/icdapi
 */

class WHOIcd11Service {
  constructor() {
    this.baseURL = 'https://id.who.int/icd';
    this.apiVersion = 'release/11/2024-01'; // Latest stable version
    this.entityURL = `${this.baseURL}/entity`;
    this.searchURL = `${this.baseURL}/entity/search`;
    
    // WHO ICD-11 API is public and doesn't require authentication for basic access
    // For production, you may want to register for API credentials at https://icd.who.int/icdapi
    this.headers = {
      'Accept': 'application/json',
      'Accept-Language': 'en',
      'API-Version': 'v2',
    };

    // Cache to store recent searches (in-memory cache for simplicity)
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hour in milliseconds
  }

  /**
   * Search ICD-11 entities by query string
   * @param {string} query - Search query
   * @param {object} options - Search options
   * @returns {Promise<Array>} - Array of search results
   */
  async search(query, options = {}) {
    try {
      // Check cache first
      const cacheKey = `search_${query}_${JSON.stringify(options)}`;
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        console.log(`[WHO ICD-11] Cache hit for query: ${query}`);
        return cachedResult;
      }

      const {
        flatResults = true,
        useFlexisearch = true,
        subtreesFilter = '',
        chapterFilter = '',
        linearizationName = 'mms', // Mortality and Morbidity Statistics
        maxResults = 20
      } = options;

      // Build query parameters
      const params = {
        q: query,
        flatResults: flatResults,
        useFlexisearch: useFlexisearch,
        linearizationname: linearizationName
      };

      if (subtreesFilter) params.subtreesFilter = subtreesFilter;
      if (chapterFilter) params.chapterFilter = chapterFilter;

      console.log(`[WHO ICD-11] Searching for: ${query}`);
      
      const response = await axios.get(this.searchURL, {
        params,
        headers: this.headers,
        timeout: 10000 // 10 second timeout
      });

      // Extract and format results
      const results = this.formatSearchResults(response.data, maxResults);
      
      // Cache the results
      this.saveToCache(cacheKey, results);

      console.log(`[WHO ICD-11] Found ${results.length} results for: ${query}`);
      return results;

    } catch (error) {
      console.error('[WHO ICD-11] Search error:', error.message);
      
      // If API fails, return empty array instead of throwing
      if (error.response) {
        console.error('[WHO ICD-11] API Response Error:', error.response.status, error.response.data);
      }
      
      return [];
    }
  }

  /**
   * Get entity details by ICD-11 code or entity ID
   * @param {string} entityId - ICD-11 entity ID or code
   * @returns {Promise<object>} - Entity details
   */
  async getEntityDetails(entityId) {
    try {
      // Check cache
      const cacheKey = `entity_${entityId}`;
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      const url = `${this.entityURL}/${entityId}`;
      console.log(`[WHO ICD-11] Fetching entity details: ${entityId}`);

      const response = await axios.get(url, {
        headers: this.headers,
        timeout: 10000
      });

      const entityDetails = this.formatEntityDetails(response.data);
      
      // Cache the result
      this.saveToCache(cacheKey, entityDetails);

      return entityDetails;

    } catch (error) {
      console.error('[WHO ICD-11] Entity fetch error:', error.message);
      return null;
    }
  }

  /**
   * Search by ICD-11 code specifically
   * @param {string} code - ICD-11 code (e.g., "1A00", "8B11.Z")
   * @returns {Promise<object>} - Entity matching the code
   */
  async searchByCode(code) {
    try {
      const results = await this.search(code, {
        flatResults: true,
        maxResults: 5
      });

      // Find exact code match
      const exactMatch = results.find(r => 
        r.icd11Code && r.icd11Code.toLowerCase() === code.toLowerCase()
      );

      return exactMatch || results[0] || null;

    } catch (error) {
      console.error('[WHO ICD-11] Code search error:', error.message);
      return null;
    }
  }

  /**
   * Format search results from WHO API response
   * @param {object} data - Raw API response data
   * @param {number} maxResults - Maximum number of results to return
   * @returns {Array} - Formatted results
   */
  formatSearchResults(data, maxResults = 20) {
    if (!data || !data.destinationEntities) {
      return [];
    }

    return data.destinationEntities
      .slice(0, maxResults)
      .map(entity => ({
        id: entity.id || '',
        title: entity.title || '',
        icd11Code: this.extractCode(entity),
        chapter: this.extractChapter(entity),
        definition: entity.definition || '',
        synonyms: entity.indexTerm || [],
        url: entity.id || '',
        matchScore: entity.score || 0
      }));
  }

  /**
   * Format entity details from WHO API response
   * @param {object} data - Raw entity data
   * @returns {object} - Formatted entity details
   */
  formatEntityDetails(data) {
    if (!data) return null;

    return {
      id: data.id || '',
      title: data.title || '',
      icd11Code: this.extractCode(data),
      definition: data.definition || '',
      longDefinition: data.longDefinition || '',
      synonyms: data.indexTerm || [],
      chapter: this.extractChapter(data),
      parents: data.parent || [],
      children: data.child || [],
      exclusions: data.exclusion || [],
      inclusions: data.inclusion || [],
      codingNote: data.codingNote || '',
      blockId: data.blockId || '',
      url: data.id || ''
    };
  }

  /**
   * Extract ICD-11 code from entity data
   * @param {object} entity - Entity data
   * @returns {string} - ICD-11 code
   */
  extractCode(entity) {
    if (entity.theCode) return entity.theCode;
    if (entity.code) return entity.code;
    
    // Try to extract from ID or other fields
    if (entity.id && entity.id.includes('/')) {
      const parts = entity.id.split('/');
      return parts[parts.length - 1] || '';
    }

    return '';
  }

  /**
   * Extract chapter information from entity data
   * @param {object} entity - Entity data
   * @returns {string} - Chapter name
   */
  extractChapter(entity) {
    if (entity.classKind === 'chapter' && entity.title) {
      return entity.title;
    }
    
    if (entity.breadcrumbTitle) {
      const breadcrumbs = entity.breadcrumbTitle.split(' / ');
      return breadcrumbs[0] || '';
    }

    return '';
  }

  /**
   * Get cached result if available and not expired
   * @param {string} key - Cache key
   * @returns {any} - Cached result or null
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Save result to cache
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   */
  saveToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean up old cache entries if cache gets too large
    if (this.cache.size > 100) {
      const keysToDelete = [];
      const now = Date.now();
      
      for (const [cacheKey, value] of this.cache.entries()) {
        if (now - value.timestamp > this.cacheTimeout) {
          keysToDelete.push(cacheKey);
        }
      }

      keysToDelete.forEach(k => this.cache.delete(k));
    }
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[WHO ICD-11] Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: 100,
      timeout: this.cacheTimeout
    };
  }
}

// Export singleton instance
module.exports = new WHOIcd11Service();

