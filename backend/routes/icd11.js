const express = require('express');
const router = express.Router();
const whoIcd11Service = require('../services/whoIcd11Service');

/**
 * WHO ICD-11 API Routes
 * Provides endpoints for searching and retrieving ICD-11 classification data
 */

/**
 * @route   GET /api/icd11/search
 * @desc    Search ICD-11 entities
 * @access  Public (or Protected - add auth middleware if needed)
 * @query   q - search query (required)
 * @query   maxResults - maximum number of results (optional, default: 20)
 * @query   chapter - filter by chapter (optional)
 */
router.get('/search', async (req, res) => {
  try {
    const { q, maxResults, chapter, subtrees } = req.query;

    // Validate query parameter
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query parameter "q" is required'
      });
    }

    console.log(`[ICD-11 API] Search request for: ${q}`);

    // Prepare search options
    const options = {
      maxResults: maxResults ? parseInt(maxResults) : 20,
      flatResults: true,
      useFlexisearch: true
    };

    if (chapter) options.chapterFilter = chapter;
    if (subtrees) options.subtreesFilter = subtrees;

    // Perform search
    const results = await whoIcd11Service.search(q, options);

    // Format results for frontend consumption
    const formattedResults = results.map(result => ({
      nhdd: result.icd11Code || '',
      icd10: '', // WHO API doesn't provide ICD-10 mapping directly
      icd11: result.icd11Code || '',
      diagnosis: result.title || '',
      category: 'WHO ICD-11',
      subcategory: result.chapter || '',
      severity: '',
      commonTerms: result.synonyms || [],
      nhddDescription: result.definition || '',
      icd11Chapter: result.chapter || '',
      icd11Block: '',
      source: 'WHO-API',
      matchScore: result.matchScore || 0
    }));

    return res.json({
      success: true,
      count: formattedResults.length,
      query: q,
      source: 'WHO ICD-11 API',
      results: formattedResults
    });

  } catch (error) {
    console.error('[ICD-11 API] Search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error searching ICD-11 database',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/icd11/code/:code
 * @desc    Search for ICD-11 entity by specific code
 * @access  Public (or Protected - add auth middleware if needed)
 * @param   code - ICD-11 code (e.g., "1A00", "8B11.Z")
 */
router.get('/code/:code', async (req, res) => {
  try {
    const { code } = req.params;

    if (!code || code.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'ICD-11 code parameter is required'
      });
    }

    console.log(`[ICD-11 API] Code lookup for: ${code}`);

    const result = await whoIcd11Service.searchByCode(code);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `No ICD-11 entity found for code: ${code}`
      });
    }

    // Format result
    const formattedResult = {
      nhdd: result.icd11Code || code,
      icd10: '',
      icd11: result.icd11Code || code,
      diagnosis: result.title || '',
      category: 'WHO ICD-11',
      subcategory: result.chapter || '',
      severity: '',
      commonTerms: result.synonyms || [],
      nhddDescription: result.definition || '',
      icd11Chapter: result.chapter || '',
      icd11Block: '',
      source: 'WHO-API'
    };

    return res.json({
      success: true,
      code: code,
      result: formattedResult
    });

  } catch (error) {
    console.error('[ICD-11 API] Code lookup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error looking up ICD-11 code',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/icd11/entity/:entityId
 * @desc    Get detailed information about an ICD-11 entity
 * @access  Public (or Protected - add auth middleware if needed)
 * @param   entityId - ICD-11 entity ID
 */
router.get('/entity/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;

    if (!entityId || entityId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Entity ID parameter is required'
      });
    }

    console.log(`[ICD-11 API] Entity details for: ${entityId}`);

    const details = await whoIcd11Service.getEntityDetails(entityId);

    if (!details) {
      return res.status(404).json({
        success: false,
        message: `No ICD-11 entity found for ID: ${entityId}`
      });
    }

    return res.json({
      success: true,
      entityId: entityId,
      details: details
    });

  } catch (error) {
    console.error('[ICD-11 API] Entity details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving entity details',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/icd11/cache/stats
 * @desc    Get cache statistics
 * @access  Public (or Protected)
 */
router.get('/cache/stats', (req, res) => {
  try {
    const stats = whoIcd11Service.getCacheStats();
    return res.json({
      success: true,
      cache: stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error retrieving cache stats',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/icd11/cache/clear
 * @desc    Clear the cache
 * @access  Protected (add auth middleware)
 */
router.post('/cache/clear', (req, res) => {
  try {
    whoIcd11Service.clearCache();
    return res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error clearing cache',
      error: error.message
    });
  }
});

module.exports = router;

