const express = require('express');
const router = express.Router();
const { auth, checkRole, checkPermission } = require('../middleware/auth');
const { validate } = require('../middleware/validationMiddleware');
const medicalRecordController = require('../controllers/medicalRecordController');
const { apiLimiter } = require('../middleware/rateLimitMiddleware');
const { cacheMiddleware, clearCache } = require('../middleware/cacheMiddleware');
const MedicalRecordService = require('../services/MedicalRecordService');
const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const ProfessionalMedicalRecordService = require('../services/ProfessionalMedicalRecordService');
const { body } = require('express-validator');
const { processValidationErrors } = require('../middleware/validationMiddleware');
const asyncHandler = require('../middleware/async');

/**
 * @route   GET /api/medical-records/health
 * @desc    Quick health check for medical records API
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Medical records API is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * @route   GET /api/medical-records/test
 * @desc    Simple test route
 * @access  Public
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Medical records API is working',
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/medical-records/test-auth
 * @desc    Test route with authentication
 * @access  Private
 */
router.get('/test-auth', [auth], (req, res) => {
  res.json({
    success: true,
    message: 'Medical records API authentication is working',
            user: req.user ? { id: req.user._id, role: req.user.role } : null,
    timestamp: new Date().toISOString()
  });
});

/**
 * @route   GET /api/medical-records/test-simple-auth
 * @desc    Test simple authentication without database queries
 * @access  Private (simple)
 */
router.get('/test-simple-auth', (req, res, next) => {
  try {
    // Basic token validation without database lookup
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        timestamp: new Date().toISOString()
      });
    }
    
    // Simple mock response for testing
    res.json({
      success: true,
      message: 'Simple auth test successful (no DB lookup)',
      tokenReceived: !!token,
      tokenLength: token.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Simple auth test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/medical-records/simple-test
 * @desc    Simple test endpoint without population for debugging
 * @access  Public (for debugging)
 */
router.get('/simple-test', asyncHandler(async (req, res) => {
  try {
    const MedicalRecord = require('../models/MedicalRecord');
    
    const records = await MedicalRecord.find({})
      .limit(10)
      .lean();
    
    res.json({
      success: true,
      count: records.length,
      records: records.map(r => ({
        id: r._id,
        patient: r.patient,
        hasChiefComplaint: !!r.chiefComplaint,
        chiefComplaintDesc: r.chiefComplaint?.description || 'N/A',
        hasPlan: !!r.plan,
        plan: r.plan ? r.plan.substring(0, 50) + '...' : 'N/A',
        status: r.status,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching records',
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/medical-records/debug-count
 * @desc    Get simple count of medical records for debugging
 * @access  Public (for debugging)
 */
router.get('/debug-count', asyncHandler(async (req, res) => {
  try {
    const startTime = Date.now();
    console.log(`[DEBUG COUNT] Starting count query at ${new Date().toISOString()}`);
    
    // Simple count with timeout
    const totalCount = await MedicalRecord.countDocuments({}).maxTimeMS(5000);
    const deletedCount = await MedicalRecord.countDocuments({ isDeleted: true }).maxTimeMS(5000);
    const activeCount = totalCount - deletedCount;
    
    const queryTime = Date.now() - startTime;
    console.log(`[DEBUG COUNT] Count completed in ${queryTime}ms - Total: ${totalCount}, Active: ${activeCount}, Deleted: ${deletedCount}`);
    
    res.json({
      success: true,
      counts: {
        total: totalCount,
        active: activeCount,
        deleted: deletedCount
      },
      queryTime: queryTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ERROR COUNT] Error counting medical records:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to count medical records',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * @route   GET /api/medical-records/dashboard-lite
 * @desc    Get medical records for dashboard (no auth, for testing)
 * @access  Public (for testing)
 */
router.get('/dashboard-lite', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log(`[DEBUG DASHBOARD-LITE] Starting dashboard-lite request at ${new Date().toISOString()}`);
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 5, 10);
    const skip = (page - 1) * limit;
    
    // Build simple query - start with minimal filters
    let query = {};
    
    // Exclude finalized records - only show active/draft records
    query.status = { 
      $nin: [
        'Finalized', 'finalized', 'FINALIZED',
        'Completed', 'completed', 'COMPLETED',
        'Closed', 'closed', 'CLOSED',
        'Archived', 'archived', 'ARCHIVED',
        'Not specified', 'not specified', 'NOT SPECIFIED'
      ] 
    };
    
    // Exclude records for patients with status 'completed' (root cause fix: finalized patients
    // can have orphaned draft records from reopening the form; they should not appear in Active & draft list)
    const completedPatientIds = await Patient.find({ status: 'completed' }).distinct('_id');
    if (completedPatientIds.length > 0) {
      query.patient = { $nin: completedPatientIds };
    }
    
    // If patient filter is provided - support both patientId and patient field
    if (req.query.patientId) {
      const pid = String(req.query.patientId);
      const isCompletedPatient = completedPatientIds.some(id => id.toString() === pid);
      if (isCompletedPatient) {
        query.patient = { $in: [] };  // Force no match - completed patients have no active/draft records
      } else {
        const patientFilter = {
          $or: [
            { patient: req.query.patientId },
            { patientId: req.query.patientId }
          ]
        };
        query.$and = query.$and || [];
        query.$and.push({ status: query.status });
        if (completedPatientIds.length > 0) query.$and.push({ patient: { $nin: completedPatientIds } });
        query.$and.push(patientFilter);
        delete query.status;
        query = { $and: query.$and };
      }
      console.log(`[DEBUG DASHBOARD-LITE] Filtering by patient: ${req.query.patientId}`);
    } else if (completedPatientIds.length > 0) {
      // patient exclusion already set above
    }
    
    console.log(`[DEBUG DASHBOARD-LITE] Initial query:`, JSON.stringify(query, null, 2));
    
    // First, let's see how many total records exist
    const totalCount = await MedicalRecord.countDocuments({});
    console.log(`[DEBUG DASHBOARD-LITE] Total medical records in database: ${totalCount}`);
    
    // Then let's see how many match our query
    const queryCount = await MedicalRecord.countDocuments(query);
    console.log(`[DEBUG DASHBOARD-LITE] Records matching query (excluding finalized + completed patients): ${queryCount}`);
    
    const records = await MedicalRecord.find(query)
      .select('patientId doctorId doctorName createdAt visitDate status chiefComplaint diagnosis')
      .populate('patientId', 'firstName lastName')
      .populate('doctorId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .maxTimeMS(3000);
    
    const queryTime = Date.now() - startTime;
    console.log(`[DEBUG DASHBOARD-LITE] Populated query completed in ${queryTime}ms, found ${records.length} records`);
    
    // Format records
    const formattedRecords = records.map(record => ({
      _id: record._id,
      patientId: record.patientId?._id || record.patientId,
      patientName: record.patientId ? `${record.patientId.firstName} ${record.patientId.lastName}` : 'Unknown Patient',
      createdAt: record.createdAt,
      visitDate: record.visitDate,
      status: record.status || 'Draft', // Use actual status from database
      chiefComplaint: record.chiefComplaint?.description || 'Not specified',
      diagnosis: record.diagnosis || 'Not specified',
      doctorName: record.doctorName || (record.doctorId ? `${record.doctorId.firstName} ${record.doctorId.lastName}` : 'Unknown Doctor')
    }));
    
    res.json({
      success: true,
      data: formattedRecords,
      count: records.length,
      totalInDb: totalCount,
      queryTime: queryTime,
      message: `Found ${records.length} records (no auth)`,
      isRecent: !req.query.patientId,
      isPatientSpecific: !!req.query.patientId,
      pagination: {
        page,
        limit,
        hasMore: records.length === limit
      }
    });
  } catch (error) {
    const queryTime = Date.now() - startTime;
    console.error(`[ERROR DASHBOARD-LITE] Error after ${queryTime}ms:`, error.message);
    console.error(`[ERROR DASHBOARD-LITE] Stack:`, error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medical records (lite)',
      error: error.message,
      queryTime: queryTime,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * @route   GET /api/medical-records/dashboard
 * @desc    Get medical records for dashboard (optimized, minimal data)
 * @access  Private (Medical Staff)
 */
router.get('/dashboard', [auth,
  checkPermission('viewReports')
], asyncHandler(async (req, res, next) => {
  const startTime = Date.now();
  let timeoutId;
  
  try {
    console.log(`[DEBUG DASHBOARD] Starting dashboard request for user: ${req.user?.id || 'unknown'} at ${new Date().toISOString()}`);
    
    // Set a hard timeout for the entire request (5 seconds)
    timeoutId = setTimeout(() => {
      const elapsedTime = Date.now() - startTime;
      console.error(`[TIMEOUT DASHBOARD] Request timed out after ${elapsedTime}ms`);
      
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Dashboard request timed out',
          error: 'Request timeout',
          queryTime: elapsedTime,
          isTimeout: true,
          timestamp: new Date().toISOString()
        });
      }
    }, 5000);
    
    // Get pagination parameters with smaller defaults for faster loading
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 5, 10); // Even smaller limit
    const skip = (page - 1) * limit;
    
    // Build query filters
    let query = {};
    
    // Exclude finalized records to save space - only show active/draft records
    // Handle both case variations and exclude "Not specified" status
    query.status = { 
      $nin: [
        'Finalized', 'finalized', 'FINALIZED',
        'Completed', 'completed', 'COMPLETED',
        'Closed', 'closed', 'CLOSED',
        'Archived', 'archived', 'ARCHIVED',
        'Not specified', 'not specified', 'NOT SPECIFIED'
      ] 
    };
    
    // If user is a doctor, only show their records
    if (req.user.role === 'doctor') {
      query.doctorId = req.user._id;
      console.log(`[DEBUG DASHBOARD] Doctor query - doctorId: ${req.user._id}`);
    }
    
    // If patient filter is provided
    if (req.query.patientId) {
      query.patientId = req.query.patientId;
      console.log(`[DEBUG DASHBOARD] Filtering by patient: ${req.query.patientId}`);
    } else {
      // Only get very recent records (last 7 days) for dashboard
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query.createdAt = { $gte: sevenDaysAgo };
      console.log(`[DEBUG DASHBOARD] Recent records filter - last 7 days from: ${sevenDaysAgo.toISOString()}`);
    }
    
    console.log(`[DEBUG DASHBOARD] Final query filters:`, JSON.stringify(query, null, 2));
    
    // Very fast database query with aggressive timeout
    const queryTimeout = 3000; // 3 seconds max
    console.log(`[DEBUG DASHBOARD] Starting database query with ${queryTimeout}ms timeout...`);
    
    const records = await MedicalRecord.find(query)
      .select('patientId doctorId doctorName createdAt visitDate status chiefComplaint diagnosis') // Include status and other fields
      .populate('patientId', 'firstName lastName', null, { maxTimeMS: 1000 }) // 1 second populate timeout
      .populate('doctorId', 'firstName lastName', null, { maxTimeMS: 1000 })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .maxTimeMS(queryTimeout);
    
    // Clear the timeout since we completed successfully
    clearTimeout(timeoutId);
    
    const queryTime = Date.now() - startTime;
    console.log(`[DEBUG DASHBOARD] Database query completed in ${queryTime}ms, found ${records.length} medical records`);
    
    // If no records found, return empty result quickly
    if (!records || records.length === 0) {
      console.log(`[DEBUG DASHBOARD] No records found for query. Returning empty result.`);
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: req.query.patientId ? 'No medical records found for this patient' : 'No recent medical records found (last 7 days)',
        isRecent: !req.query.patientId,
        isPatientSpecific: !!req.query.patientId,
        queryTime: queryTime,
        pagination: {
          page,
          limit,
          hasMore: false
        }
      });
    }
    
    // Minimal formatting for dashboard
    const formattedRecords = records.map(record => ({
      _id: record._id,
      patientId: record.patientId?._id || record.patientId,
      patientName: record.patientId ? `${record.patientId.firstName} ${record.patientId.lastName}` : 'Unknown Patient',
      createdAt: record.createdAt,
      visitDate: record.visitDate,
      status: record.status || 'Draft', // Use actual status from database
      chiefComplaint: record.chiefComplaint?.description || 'Not specified',
      diagnosis: record.diagnosis || 'Not specified',
      doctorName: record.doctorName || (record.doctorId ? `${record.doctorId.firstName} ${record.doctorId.lastName}` : 'Unknown Doctor')
    }));
    
    const totalTime = Date.now() - startTime;
    console.log(`[DEBUG DASHBOARD] Request completed successfully in ${totalTime}ms`);
    
    res.json({
      success: true,
      data: formattedRecords,
      count: records.length,
      queryTime: queryTime,
      totalTime: totalTime,
      isRecent: !req.query.patientId,
      isPatientSpecific: !!req.query.patientId,
      pagination: {
        page,
        limit,
        hasMore: records.length === limit
      }
    });
  } catch (error) {
    // Clear the timeout
    if (timeoutId) clearTimeout(timeoutId);
    
    const totalTime = Date.now() - startTime;
    console.error(`[ERROR DASHBOARD] Error fetching dashboard medical records after ${totalTime}ms:`, error.message);
    console.error(`[ERROR DASHBOARD] Stack trace:`, error.stack);
    
    // Don't send response if headers already sent (timeout already responded)
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch medical records',
        error: error.message,
        queryTime: totalTime,
        isTimeout: error.message.includes('timeout') || error.message.includes('time limit'),
        timestamp: new Date().toISOString()
      });
    }
  }
}));

/**
 * @route   POST /api/medical-records/seed
 * @desc    Create sample medical records for testing (development only)
 * @access  Public (for development)
 */
router.post('/seed', asyncHandler(async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Seeding not allowed in production'
      });
    }
    
    console.log('[SEED] Starting to create sample medical records...');
    
    // Check if records already exist
    const existingCount = await MedicalRecord.countDocuments({});
    if (existingCount > 0) {
      return res.json({
        success: true,
        message: `Database already has ${existingCount} medical records. No seeding needed.`,
        existingCount
      });
    }
    
    // Get some patients and users for the sample records
    const Patient = require('../models/Patient');
    const User = require('../models/User');
    
    const patients = await Patient.find({}).limit(5);
    const doctors = await User.find({ role: 'doctor' }).limit(3);
    
    if (patients.length === 0 || doctors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Need at least 1 patient and 1 doctor to create sample medical records',
        patientsFound: patients.length,
        doctorsFound: doctors.length
      });
    }
    
    console.log(`[SEED] Found ${patients.length} patients and ${doctors.length} doctors`);
    
    // Create sample medical records
    const sampleRecords = [];
    const now = new Date();
    
    for (let i = 0; i < Math.min(10, patients.length * 2); i++) {
      const patient = patients[i % patients.length];
      const doctor = doctors[i % doctors.length];
      
      // Create records from different time periods
      const daysAgo = Math.floor(Math.random() * 30); // Random day in last 30 days
      const recordDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      
      const record = new MedicalRecord({
        patient: patient._id,
        doctor: doctor._id,
        createdBy: doctor._id,
        primaryProvider: doctor._id,
        visitDate: recordDate,
        createdAt: recordDate,
        updatedAt: recordDate,
        status: i % 3 === 0 ? 'Draft' : 'Finalized',
        chiefComplaint: [
          'Routine checkup',
          'Headache and fatigue',
          'Chest pain',
          'Abdominal pain',
          'Back pain',
          'Fever and cough',
          'Skin rash',
          'Joint pain',
          'Dizziness',
          'Follow-up visit'
        ][i % 10],
        diagnoses: [{
          diagnosis: [
            'Hypertension',
            'Type 2 Diabetes',
            'Common Cold',
            'Gastritis',
            'Lower Back Pain',
            'Upper Respiratory Infection',
            'Eczema',
            'Arthritis',
            'Vertigo',
            'Healthy - No Issues'
          ][i % 10],
          code: `ICD-${1000 + i}`,
          type: 'Primary'
        }],
        historyOfPresentIllness: `Patient presents with ${i + 1} day history of symptoms.`,
        physicalExam: 'Normal physical examination findings.',
        treatmentPlan: 'Continue current medications and follow up as needed.',
        isDeleted: false
      });
      
      sampleRecords.push(record);
    }
    
    // Save all records
    const savedRecords = await MedicalRecord.insertMany(sampleRecords);
    
    console.log(`[SEED] Successfully created ${savedRecords.length} sample medical records`);
    
    res.json({
      success: true,
      message: `Successfully created ${savedRecords.length} sample medical records`,
      recordsCreated: savedRecords.length,
      sampleRecord: savedRecords[0]
    });
    
  } catch (error) {
    console.error('[SEED] Error creating sample medical records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sample medical records',
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/medical-records/consultations
 * @desc    Get consultation records (medical records created through consultation form)
 * @access  Private (Medical Staff)
 */
router.get('/consultations', [auth,
  checkPermission('viewReports')
], asyncHandler(async (req, res, next) => {
  console.log(`[DEBUG] Fetching consultation records for user: ${req.user._id}`);
  
  // Get pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const skip = (page - 1) * limit;
  
  // Build query filters - consultation records (with recordType or consultation-specific fields)
  let query = { 
    $or: [
      { recordType: 'consultation' },
      { 
        // Fallback: records that look like consultations (have consultation-specific fields)
        recordType: { $exists: false },
        'chiefComplaint.description': { $exists: true, $ne: '' },
        status: { 
          $in: [
            'Finalized', 'finalized', 'FINALIZED',
            'Completed', 'completed', 'COMPLETED'
          ] 
        }
      }
    ],
    status: { 
      $in: [
        'Finalized', 'finalized', 'FINALIZED',
        'Completed', 'completed', 'COMPLETED'
      ] 
    } 
  };
  
  // If user is a doctor, only show their consultation records
  if (req.user.role === 'doctor') {
    query.createdBy = req.user._id;
  }
  
  try {
    console.log('[DEBUG] Consultation query:', JSON.stringify(query, null, 2));
    
    // Get consultation records directly - simplified approach
    const consultationRecords = await MedicalRecord.find(query)
      .populate('patient', 'firstName lastName patientId')
      .populate('doctor', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    const totalRecords = await MedicalRecord.countDocuments(query);
    
    console.log(`[DEBUG] Found ${consultationRecords.length} consultation records (limit: ${limit})`);
    console.log('[DEBUG] Consultation records:', consultationRecords.map(r => ({
      id: r._id,
      patient: r.patient?.firstName + ' ' + r.patient?.lastName,
      recordType: r.recordType,
      status: r.status,
      createdAt: r.createdAt
    })));
    
    res.json({
      success: true,
      data: consultationRecords,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        hasNextPage: page < Math.ceil(totalRecords / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch consultation records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consultation records',
      error: error.message
    });
  }
}));

/**
 * @route   GET /api/medical-records/finalized
 * @desc    Get finalized medical records (for patient history)
 * @access  Private (Medical Staff)
 */
router.get('/finalized', [auth,
  checkPermission('viewReports')
], asyncHandler(async (req, res, next) => {
  console.log(`[DEBUG] Fetching finalized medical records for user: ${req.user._id}`);
  
  // Get pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Cap at 100, default to 20
  const skip = (page - 1) * limit;
  
  // Build query filters - include all finalized/completed records
  let query = { 
    status: { 
      $in: [
        'Finalized', 'finalized', 'FINALIZED',
        'Completed', 'completed', 'COMPLETED',
        'Closed', 'closed', 'CLOSED',
        'Archived', 'archived', 'ARCHIVED',
        'Not specified', 'not specified', 'NOT SPECIFIED'
      ] 
    } 
  };
  
  // If user is a doctor, only show their records
  if (req.user.role === 'doctor') {
    query.createdBy = req.user._id;
  }
  
  // If patient filter is provided, add it to the query
  if (req.query.patientId) {
    // Add patient filter to the existing conditions
    const patientFilter = {
      $or: [
        { patient: req.query.patientId },
        { patientId: req.query.patientId }
      ]
    };
    
    // Combine with existing conditions using $and
    if (Object.keys(query).length > 0) {
      query = {
        $and: [
          query,
          patientFilter
        ]
      };
    } else {
      query = patientFilter;
    }
  }
  
  console.log(`[DEBUG] Finalized records query filters:`, JSON.stringify(query, null, 2));
  
  // Get complete medical record data for history view
  const records = await MedicalRecord.find(query)
    .select('patient createdBy createdAt updatedAt status chiefComplaint diagnoses prescriptions plan treatmentPlan vitalSigns physicalExamination historyOfPresentIllness assessment followUpPlan notes visitDate')
    .populate('patient', 'firstName lastName dateOfBirth gender patientId')
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 }) // Sort by newest first
    .skip(skip)
    .limit(limit)
    .lean(); // Use lean() for better performance
  
  // Get total count for pagination (only if needed)
  const total = req.query.includeCount === 'true' 
    ? await MedicalRecord.countDocuments(query)
    : records.length;
  
  console.log(`[DEBUG] Found ${records.length} finalized medical records (limit: ${limit})`);
  
  res.json({
    success: true,
    data: records,
    count: records.length,
    total,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * @route   GET /api/medical-records/batch-finalized-check
 * @desc    Check which patients have finalized records and optionally return counts
 * @access  Private
 * @query   patientIds - comma-separated list of patient IDs
 * @query   includeCounts - if "true", returns { patientId: count } instead of { patientId: boolean }
 * @returns { patientId: boolean|number } map
 */
router.get('/batch-finalized-check', auth, asyncHandler(async (req, res) => {
  const { patientIds, includeCounts } = req.query;
  if (!patientIds) return res.json({});

  const ids = patientIds.split(',').filter(Boolean);
  if (ids.length === 0) return res.json({});

  const FINALIZED_STATUSES = ['Finalized', 'finalized', 'FINALIZED', 'Completed', 'completed', 'COMPLETED', 'Closed', 'closed', 'Archived', 'archived'];

  const records = await MedicalRecord.find({
    $or: [
      { patient: { $in: ids } },
      { patientId: { $in: ids } }
    ],
    status: { $in: FINALIZED_STATUSES }
  }).select('patient patientId status').lean();

  const result = {};
  for (const id of ids) result[id] = includeCounts === 'true' ? 0 : false;
  for (const rec of records) {
    const pid = (rec.patient || rec.patientId)?.toString();
    if (pid && result.hasOwnProperty(pid)) {
      if (includeCounts === 'true') {
        result[pid] = (result[pid] || 0) + 1;
      } else {
        result[pid] = true;
      }
    }
  }

  res.json(result);
}));

/**
 * @route   GET /api/medical-records/completed-patient-history
 * @desc    Get finalized medical records for patient history (excludes drafts)
 * @access  Private (Medical Staff)
 */
router.get('/completed-patient-history', [auth,
  checkPermission('viewReports')
], asyncHandler(async (req, res, next) => {
  console.log(`[DEBUG] Fetching completed patient history for user: ${req.user._id}`);
  
  // Get pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Cap at 100, default to 20
  const skip = (page - 1) * limit;
  
  // Build query filters - include only finalized/completed records (exclude drafts)
  let query = { 
    status: { 
      $in: [
        'Finalized', 'finalized', 'FINALIZED',
        'Completed', 'completed', 'COMPLETED',
        'Closed', 'closed', 'CLOSED',
        'Archived', 'archived', 'ARCHIVED',
        'Not specified', 'not specified', 'NOT SPECIFIED'
      ] 
    }
  };
  
  // If user is a doctor, only show their records
  if (req.user.role === 'doctor') {
    query.createdBy = req.user._id;
  }
  
  // If patient filter is provided, add it to the query
  if (req.query.patientId) {
    // Add patient filter to the existing conditions
    const patientFilter = {
      $or: [
        { patient: req.query.patientId },
        { patientId: req.query.patientId }
      ]
    };
    
    // Combine with existing conditions using $and
    query = {
      $and: [
        query,
        patientFilter
      ]
    };
  }
  
  console.log(`[DEBUG] Completed patient history query filters:`, JSON.stringify(query, null, 2));
  console.log(`[DEBUG] User role: ${req.user.role}, User ID: ${req.user._id}`);
  
  // Get complete medical record data for history view
  const records = await MedicalRecord.find(query)
    .select('patient createdBy createdAt updatedAt status chiefComplaint diagnoses prescriptions labRequests plan treatmentPlan vitalSigns physicalExamination historyOfPresentIllness assessment followUpPlan notes visitDate')
    .populate('patient', 'firstName lastName dateOfBirth gender patientId')
    .populate('createdBy', 'firstName lastName')
    .populate('prescriptions', 'medicationName dosage frequency duration route status createdAt')
    .sort({ createdAt: -1 }) // Sort by newest first
    .skip(skip)
    .limit(limit)
    .lean(); // Use lean() for better performance
  
  // Get total count for pagination (only if needed)
  const total = req.query.includeCount === 'true' 
    ? await MedicalRecord.countDocuments(query)
    : records.length;
  
  console.log(`[DEBUG] Found ${records.length} finalized medical records for patient history (limit: ${limit})`);
  
  res.json({
    success: true,
    data: records,
    count: records.length,
    total,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * @route   GET /api/medical-records
 * @desc    Get all medical records (for doctor dashboard) - excludes finalized records
 * @access  Private (Medical Staff)
 */
router.get('/', [auth,
  checkPermission('viewReports')
], asyncHandler(async (req, res, next) => {
  console.log(`[DEBUG] Fetching all medical records for user: ${req.user._id}`);
  
  // Get pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Cap at 100, default to 20
  const skip = (page - 1) * limit;
  
  // Build query filters
  let query = {};
  
  // If user is a doctor, only show their records
  if (req.user.role === 'doctor') {
    query.createdBy = req.user._id;
  }
  
  // Exclude finalized records by default - they should only appear in Completed Patients tab
  // Also exclude records for patients with status 'completed' (prevents finalized patients
  // from appearing via orphaned drafts created when reopening the form)
  const completedPatientIds = await Patient.find({ status: 'completed' }).distinct('_id');
  
  if (!req.query.status) {
    query.status = { 
      $nin: [
        'Finalized', 'finalized', 'FINALIZED',
        'Completed', 'completed', 'COMPLETED',
        'Closed', 'closed', 'CLOSED',
        'Archived', 'archived', 'ARCHIVED'
      ] 
    };
    if (completedPatientIds.length > 0) {
      query.patient = { $nin: completedPatientIds };
    }
  } else {
    query.status = req.query.status;
  }
  
  if (req.query.patientId) {
    const pid = String(req.query.patientId);
    const isCompleted = completedPatientIds.some(id => id.toString() === pid);
    if (isCompleted && !req.query.status) {
      query.patient = { $in: [] };  // Force no match - completed patients have no active/draft records
    } else {
      query.patient = req.query.patientId;
    }
  }
  
  console.log(`[DEBUG] Query filters:`, query);
  
  // Optimized query with minimal population and selected fields only
  const records = await MedicalRecord.find(query)
    .select('patient createdBy createdAt updatedAt status chiefComplaint diagnoses prescriptions')
    .populate('patient', 'firstName lastName dateOfBirth gender patientId')
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 }) // Sort by newest first
    .skip(skip)
    .limit(limit)
    .lean(); // Use lean() for better performance
  
  // Get total count for pagination (only if needed)
  const total = req.query.includeCount === 'true' 
    ? await MedicalRecord.countDocuments(query)
    : records.length;
  
  console.log(`[DEBUG] Found ${records.length} medical records (limit: ${limit})`);
  
  // Format the response with minimal data processing
  const formattedRecords = records.map(record => {
    const patientName = record.patient 
      ? `${record.patient.firstName} ${record.patient.lastName}` 
      : 'Unknown Patient';
    
    const doctorName = record.createdBy 
      ? `${record.createdBy.firstName} ${record.createdBy.lastName}` 
      : 'Unknown Doctor';
    
    return {
      _id: record._id,
      patientId: record.patient?._id || record.patient,
      patientName,
      patient: record.patient,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      status: record.status || 'Draft',
      chiefComplaint: record.chiefComplaint,
      diagnoses: record.diagnoses || [],
      prescriptions: record.prescriptions || [],
      createdBy: record.createdBy,
      doctorName
    };
  });
  
  res.json({
    success: true,
    data: formattedRecords,
    pagination: {
      page,
      limit,
      total: req.query.includeCount === 'true' ? total : undefined,
      pages: req.query.includeCount === 'true' ? Math.ceil(total / limit) : undefined
    }
  });
}));

/**
 * @route   POST /api/medical-records
 * @desc    Create a new medical record
 * @access  Private (Doctors)
 */
router.post('/', [auth,
  checkPermission('managePatients'),
  validate.medicalRecord.create
], asyncHandler(async (req, res, next) => {
  console.log(`[DEBUG MEDREC POST ${new Date().toISOString()}] Route /api/medical-records hit. User authenticated: ${req.user ? req.user._id : 'No user data in req'}.`);
  console.log(`[DEBUG MEDREC POST ${new Date().toISOString()}] Request body:`, req.body);
  
  try {
    // Make sure we have patient ID
    if (!req.body.patient) {
      console.error(`[ERROR MEDREC POST ${new Date().toISOString()}] Missing patient ID in medical record creation`);
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }
    
    // Validate and fix chiefComplaint - handle as object structure
    if (req.body.chiefComplaint) {
      const chiefComplaint = req.body.chiefComplaint;
      
      // If it's a string, convert to object structure
      if (typeof chiefComplaint === 'string') {
        req.body.chiefComplaint = {
          description: chiefComplaint,
          duration: '',
          severity: 'Mild',
          onsetPattern: 'Acute',
          progression: 'Stable',
          location: '',
          aggravatingFactors: [],
          relievingFactors: [],
          associatedSymptoms: [],
          impactOnDailyLife: '',
          previousEpisodes: false,
          previousEpisodesDetails: '',
          recordedBy: req.user._id,
          recordedAt: new Date()
        };
      } else if (typeof chiefComplaint === 'object' && chiefComplaint !== null) {
        // If it's an object, ensure it has the proper structure
        req.body.chiefComplaint = {
          description: chiefComplaint.description || 'Medical consultation',
          duration: chiefComplaint.duration || '',
          severity: chiefComplaint.severity || 'Mild',
          onsetPattern: chiefComplaint.onsetPattern || 'Acute',
          progression: chiefComplaint.progression || 'Stable',
          location: chiefComplaint.location || '',
          aggravatingFactors: chiefComplaint.aggravatingFactors || [],
          relievingFactors: chiefComplaint.relievingFactors || [],
          associatedSymptoms: chiefComplaint.associatedSymptoms || [],
          impactOnDailyLife: chiefComplaint.impactOnDailyLife || '',
          previousEpisodes: chiefComplaint.previousEpisodes || false,
          previousEpisodesDetails: chiefComplaint.previousEpisodesDetails || '',
          recordedBy: req.user._id,
          recordedAt: new Date()
        };
      }
    } else {
      // Create a default chiefComplaint if none provided
      req.body.chiefComplaint = {
        description: 'Medical consultation',
        duration: '',
        severity: 'Mild',
        onsetPattern: 'Acute',
        progression: 'Stable',
        location: '',
        aggravatingFactors: [],
        relievingFactors: [],
        associatedSymptoms: [],
        impactOnDailyLife: '',
        previousEpisodes: false,
        previousEpisodesDetails: '',
        recordedBy: req.user._id,
        recordedAt: new Date()
      };
    }
    
    // If no visit ID is provided, allow creation without linking to a visit
    // Older logic injected a placeholder ObjectId which then failed lookup.
    
    console.log(`[DEBUG MEDREC POST ${new Date().toISOString()}] Attempting Patient.findById for patient ID: ${req.body.patient}`);
    const patient = await Patient.findById(req.body.patient);
    console.log(`[DEBUG MEDREC POST ${new Date().toISOString()}] Patient.findById call completed. Patient found: ${patient ? patient._id : 'null or undefined'}`);
    
    if (!patient) {
      console.error(`[ERROR MEDREC POST ${new Date().toISOString()}] Patient with ID ${req.body.patient} not found after DB query.`);
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    console.log(`[DEBUG MEDREC POST ${new Date().toISOString()}] Found patient: ${patient.firstName} ${patient.lastName}. Forwarding to controller.`);
    
    // Forward to controller for medical record creation
    return medicalRecordController.createMedicalRecord(req, res, next);
  } catch (error) {
    console.error(`[ERROR MEDREC POST ${new Date().toISOString()}] Error in medical records POST handler:`, error);
    next(error);
  }
}));

/**
 * @route   PUT /api/medical-records/:id
 * @desc    Update a medical record
 * @access  Private (Doctors)
 */
router.put('/:id', [auth,
  checkPermission('managePatients'),
  validate.medicalRecord.update
], asyncHandler(async (req, res, next) => {
  try {
    // Clear cache for this patient when updating medical records
    if (req.body.patient) {
      clearCache(`/api/medical-records/patient-public/${req.body.patient}`);
    }
    
    // Forward to controller
    return medicalRecordController.updateMedicalRecord(req, res, next);
  } catch (error) {
    next(error);
  }
}));

/**
 * @route   GET /api/medical-records/:id
 * @desc    Get a medical record by ID
 * @access  Private (Medical Staff)
 */
router.get('/:id', [auth,
  checkPermission('viewReports'),
  validate.medicalRecord.getById
], medicalRecordController.getMedicalRecordById);

/**
 * @route   GET /api/medical-records/patient/:patientId
 * @desc    Get medical records for a patient
 * @access  Private (Medical Staff)
 */
router.get('/patient/:patientId', [auth,
  checkPermission('viewReports'),
  validate.medicalRecord.getByPatient
], medicalRecordController.getMedicalRecordsByPatient);

/**
 * @route   DELETE /api/medical-records/:id
 * @desc    Delete a medical record (soft delete)
 * @access  Private (Doctors, Admins)
 */
router.delete('/:id', [auth,
  checkPermission('managePatients'),
  validate.id
], medicalRecordController.deleteMedicalRecord);

/**
 * @route   POST /api/medical-records/:id/finalize
 * @desc    Finalize a medical record
 * @access  Private (Doctors)
 */
router.post('/:id/finalize', [auth,
  checkPermission('managePatients'),
  validate.id
], asyncHandler(async (req, res, next) => {
  try {
    console.log(`[DEBUG] Finalizing medical record: ${req.params.id}`);
    
    const MedicalRecord = require('../models/MedicalRecord');
    const record = await MedicalRecord.findById(req.params.id);
    
    if (!record) {
      console.error(`[ERROR] Medical record not found for finalize: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    
    console.log(`[DEBUG] Found record to finalize: ${record._id}, current status: ${record.status}`);
    
    const result = await record.finalize(req.user._id, req.user.role);
    
    if (result) {
      console.log(`[DEBUG] Successfully finalized record: ${record._id}`);
      
      // Clear cache for this patient when finalizing a record
      if (record.patient) {
        clearCache(`/api/medical-records/patient-public/${record.patient}`);
      }
      
      // Populate references for the response
      const populatedRecord = await MedicalRecord.findById(record._id)
        .populate('patient', 'firstName lastName status');
      
      return res.json({
        success: true,
        message: 'Medical record finalized and patient status updated to completed',
        data: populatedRecord,
        patientStatusUpdated: true
      });
    } else {
      console.error(`[ERROR] Failed to finalize record: ${record._id}. Already finalized: ${record.status === 'Finalized'}`);
      return res.status(400).json({
        success: false,
        message: 'Record could not be finalized. It may already be finalized or locked.'
      });
    }
  } catch (error) {
    console.error('[ERROR] Error finalizing record:', error);
    next(error);
  }
}));

/**
 * @route   POST /api/medical-records/:id/lock
 * @desc    Lock a medical record to prevent further changes
 * @access  Private (Doctors, Admins)
 */
router.post('/:id/lock', [auth,
  checkPermission('managePatients'),
  validate.id
], asyncHandler(async (req, res, next) => {
  try {
    const MedicalRecord = require('../models/MedicalRecord');
    const record = await MedicalRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    
    const result = await record.lock(req.user._id, req.user.role);
    
    if (result) {
      return res.json({
        success: true,
        message: 'Medical record locked',
        data: record
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Record is already locked'
      });
    }
  } catch (error) {
    next(error);
  }
}));

/**
 * @route   POST /api/medical-records/:id/unlock
 * @desc    Unlock a medical record (admin only)
 * @access  Private (Admins only)
 */
router.post('/:id/unlock', [auth,
  checkPermission('managePatients'),
  validate.id
], asyncHandler(async (req, res, next) => {
  try {
    const MedicalRecord = require('../models/MedicalRecord');
    const record = await MedicalRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    
    const result = await record.unlock(req.user._id, req.user.role);
    
    if (result) {
      return res.json({
        success: true,
        message: 'Medical record unlocked',
        data: record
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Record is not locked or you do not have permission to unlock it'
      });
    }
  } catch (error) {
    next(error);
  }
}));

// Test endpoint that returns a sample medical record for troubleshooting 
router.get('/sample-record', (req, res) => {
  // Disabled - return 404 instead of sample data
  return res.status(404).json({
    success: false,
    message: 'Sample records have been disabled'
  });
});

/**
 * @route   GET /api/medical-records/patient-test/:patientId
 * @desc    Get medical records for a patient (testing endpoint)
 * @access  Public
 */
router.get('/patient-test/:patientId', async (req, res) => {
  try {
    const options = {
      limit: parseInt(req.query.limit) || 10,
      skip: parseInt(req.query.skip) || 0,
      sort: { createdAt: -1 }
    };
    
    console.log(`Fetching medical records for patient: ${req.params.patientId}`, options);
    
    // Check if the patient exists in the database
    let records = [];
    
    try {
      records = await MedicalRecordService.getPatientMedicalRecords(
        req.params.patientId,
        options
      );
    } catch (serviceError) {
      console.error('Service error:', serviceError);
      
      // Try direct query to troubleshoot
      records = await MedicalRecord.find({ patient: req.params.patientId })
        .sort(options.sort || { createdAt: -1 })
        .limit(options.limit)
        .skip(options.skip);
    }
    
    res.json({
      success: true,
      count: records.length,
      data: records,
      message: 'Test endpoint - does not require authentication'
    });
  } catch (error) {
    console.error('Error fetching patient medical records (test route):', error);
    res.status(500).json({
      success: false,
      message: 'Server error in test route',
      error: error.toString(),
      stack: error.stack
    });
  }
});

/**
 * @route   POST /api/medical-records/:id/generate-invoice
 * @desc    Generate an invoice from a medical record
 * @access  Private (Doctors, Admin, Finance)
 */
router.post('/:id/generate-invoice', [auth,
  checkPermission('managePatients')
], asyncHandler(async (req, res) => {
  try {
    // First get the medical record
    const medicalRecord = await MedicalRecordService.getMedicalRecordWithDetails(req.params.id);
    
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    
    // Check if invoice already exists
    if (medicalRecord.invoice) {
      return res.status(400).json({
        success: false,
        message: 'This medical record already has an associated invoice',
        invoiceId: medicalRecord.invoice
      });
    }
    
    // Update the record with generateInvoice flag
    const updatedRecord = await MedicalRecordService.updateMedicalRecord(
      req.params.id,
      { generateInvoice: true },
      req.user
    );
    
    res.json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        medicalRecord: updatedRecord._id,
        invoice: updatedRecord.invoice
      }
    });
  } catch (error) {
    console.error('Error generating invoice:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}));

// Endpoint to create a sample medical record
router.post('/sample/:patientId', auth, asyncHandler(async (req, res) => {
  // Disabled - return 404 instead of creating sample data
  return res.status(404).json({
    success: false,
    message: 'Sample records have been disabled'
  });
}));

/**
 * @route   GET /api/medical-records/sample-test/:patientId
 * @desc    Get medical records for a patient (public test endpoint)
 * @access  Public
 */
router.get('/sample-test/:patientId', async (req, res) => {
  // Disabled - return 404 instead of sample data
  return res.status(404).json({
    success: false,
    message: 'Sample records have been disabled'
  });
});

/**
 * @route   POST /api/medical-records/sample-test/:patientId
 * @desc    Create a sample medical record for testing (public endpoint)
 * @access  Public
 */
router.post('/sample-test/:patientId', async (req, res) => {
  // Disabled - return 404 instead of sample data
  return res.status(404).json({
    success: false,
    message: 'Sample records have been disabled'
  });
});

// Add a new endpoint to handle /api/medical-records/prescriptions for compatibility
/**
 * @route   POST /api/medical-records/prescriptions
 * @desc    Add a prescription to a medical record (compatibility endpoint)
 * @access  Public (for cross-module compatibility)
 */
router.post('/prescriptions', async (req, res) => {
  try {
    console.log('[MEDICAL RECORDS] Receiving prescription on MedicalRecords router, forwarding...');
    
    // This is a fallback endpoint that doesn't require authentication
    // We'll manually pass it to the prescriptions router's public endpoint
    const prescriptionData = req.body;
    
    // Validate minimal requirements
    if (!prescriptionData.patient && !prescriptionData.patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }
    
    if (!prescriptionData.medicationName) {
      return res.status(400).json({
        success: false,
        message: 'Medication name is required'
      });
    }
    
    // Forward request to prescription service
    // Since we can't directly call the other router, we'll use the model directly
    const Prescription = require('../models/Prescription');
    const mongoose = require('mongoose');
    
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Find first doctor if none specified
      const User = require('../models/User');
      const defaultDoctor = await User.findOne({ role: 'doctor' });
      if (!defaultDoctor) {
        await session.abortTransaction();
        session.endSession();
        return res.status(500).json({ message: 'No doctor found in system' });
      }
      
      // Create the prescription
      const doctorId = prescriptionData.doctorId || defaultDoctor._id;
      const newPrescription = new Prescription({
        patient: prescriptionData.patient || prescriptionData.patientId,
        doctor: doctorId,
        doctorId: doctorId, // Ensure both doctor and doctorId fields are set
        visitId: prescriptionData.visitId || "000000000000000000000000",
        medicationName: prescriptionData.medicationName,
        dosage: prescriptionData.dosage || "As directed",
        frequency: prescriptionData.frequency || "As needed",
        route: prescriptionData.route || "Oral",
        duration: prescriptionData.duration || "7 days",
        refills: prescriptionData.refills || 0,
        status: 'Active',
        notes: prescriptionData.notes || prescriptionData.instructions
      });
      
      const prescription = await newPrescription.save({ session });
      
      // Add to medical record if available
      const patientId = prescriptionData.patient || prescriptionData.patientId;
      
      // Find existing medical record or create new one
      let medicalRecord = await MedicalRecord.findOne({ 
        patient: patientId 
      }).sort({ createdAt: -1 }).session(session);
      
      if (medicalRecord) {
        console.log(`[MEDICAL RECORDS] Found medical record ${medicalRecord._id}, adding prescription`);
        
        // Add prescription to record
        const prescriptionEntry = {
          medication: prescriptionData.medicationItem || null,
          alternativeMedication: prescriptionData.medicationName || 'Unnamed Medication',
          dosage: prescriptionData.dosage || "As directed",
          frequency: prescriptionData.frequency || "As needed",
          duration: prescriptionData.duration, // CRITICAL: Always use doctor's prescribed duration, no defaults
          quantity: prescriptionData.quantity || 1,
          refills: prescriptionData.refills || 0,
          route: prescriptionData.route || "Oral",
          instructions: prescriptionData.notes || prescriptionData.instructions,
          prescribedBy: doctorId,
          status: 'Active',
          startDate: new Date()
        };
        
        if (!medicalRecord.prescriptions) {
          medicalRecord.prescriptions = [];
        }
        
        // Add prescription reference (ObjectId) instead of the full object
        if (prescription._id) {
          medicalRecord.prescriptions.push(prescription._id);
        }
        medicalRecord.lastUpdatedBy = doctorId;
        
        await medicalRecord.save({ session });
        
        // Link prescription to medical record
        prescription.medicalRecord = medicalRecord._id;
        await prescription.save({ session });
      } else {
        // Create a minimal medical record with this prescription and all required fields
        console.log(`[MEDICAL RECORDS] No medical record found for patient ${patientId}, creating one`);
        const newMedicalRecord = new MedicalRecord({
          patient: patientId,
          doctor: doctorId,  // This is required
          primaryProvider: doctorId,
          status: 'Draft',
          createdBy: doctorId,
          lastUpdatedBy: doctorId,
          chiefComplaint: 'Prescription created separately',
          prescriptions: [] // Will add prescription reference after saving
        });
        
        await newMedicalRecord.save({ session });
        
        // Add prescription reference to the medical record
        if (prescription._id) {
          newMedicalRecord.prescriptions.push(prescription._id);
          await newMedicalRecord.save({ session });
        }
        
        // Link to prescription
        prescription.medicalRecord = newMedicalRecord._id;
        await prescription.save({ session });
      }
      
      await session.commitTransaction();
      session.endSession();
      
      return res.status(201).json(prescription);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('[MEDICAL RECORDS] Error handling prescription:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/medical-records/patient-public/:patientId
 * @desc    Get medical records for a patient (public fallback endpoint)
 * @access  Public
 */
router.get('/patient-public/:patientId', [
  // Cache this endpoint for 5 minutes to improve performance
  cacheMiddleware(300)
], async (req, res) => {
  try {
    const patientId = req.params.patientId;
    
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }
    
    const options = {
      limit: parseInt(req.query.limit) || 10,
      skip: parseInt(req.query.skip) || 0,
      sort: { createdAt: -1 }
    };
    
    // Prepare patient ID variations for search
    const mongoose = require('mongoose');
    let patientObjectId;
    
    // Check if patientId is a valid ObjectId
    const isValidObjectId = mongoose.Types.ObjectId.isValid(patientId);
    if (isValidObjectId) {
      patientObjectId = new mongoose.Types.ObjectId(patientId);
    }
    
    // Build query with all possible patient ID formats
    const query = {
      $or: [
        { patient: patientId },
        { patientId: patientId }
      ]
    };
    
    // Add ObjectId version if valid
    if (isValidObjectId) {
      query.$or.push({ patient: patientObjectId });
      query.$or.push({ patientId: patientObjectId });
      query.$or.push({ 'patient._id': patientObjectId });
    }
    
    // Execute optimized query with selective population
    const records = await MedicalRecord.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit)
      .skip(options.skip)
      .populate({
        path: 'prescriptions.medication',
        model: 'InventoryItem',
        select: 'name generic type category' // Only select needed fields
      })
      .populate('primaryProvider', 'firstName lastName');
    
    // Process records to filter out mock data
    const processedRecords = records.map(record => {
      // Create a safe copy with correct prescriptions
      const safeRecord = record.toObject();
      
      // Ensure prescriptions array exists
      if (!safeRecord.prescriptions) {
        safeRecord.prescriptions = [];
      }
      
      // Filter out mock data
      if (safeRecord.prescriptions.length > 0) {
        safeRecord.prescriptions = safeRecord.prescriptions.filter(prescription => {
          const medicationName = (prescription.alternativeMedication || '').toLowerCase();
          return !medicationName.includes('paracetamol') && 
                 !medicationName.includes('test') && 
                 !medicationName.includes('mock') && 
                 !medicationName.includes('sample');
        });
      }
      
      return safeRecord;
    });
    
    return res.json({
      success: true,
      count: processedRecords.length,
      data: processedRecords
    });
  } catch (error) {
    console.error('[PUBLIC MR] Error fetching patient medical records:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.toString()
    });
  }
});

/**
 * @route   POST /api/medical-records/sync-prescriptions/:patientId
 * @desc    Force sync prescriptions with medical records for a patient
 * @access  Public
 */
router.post('/sync-prescriptions/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const { prescriptions } = req.body;

    console.log('🔍 Sync Prescriptions Request:', {
      patientId,
      prescriptionCount: prescriptions ? prescriptions.length : 0,
      prescriptionDetails: prescriptions ? prescriptions.map(p => ({
        medicationName: p.medicationName,
        duration: p.duration,
        frequency: p.frequency,
        totalCost: p.totalCost
      })) : 'No prescriptions'
    });

    // Validate input
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }

    const mongoose = require('mongoose');
    const Prescription = require('../models/Prescription');
    const MedicalRecord = require('../models/MedicalRecord');
    const Patient = require('../models/Patient');
    
    // Validate patient ID
    if (!mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID format'
      });
    }
    
    // Check patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // If no prescriptions provided, return success
    if (!prescriptions || prescriptions.length === 0) {
      return res.json({
        success: true,
        message: 'No prescriptions to sync',
        prescriptionCount: 0
      });
    }

    // Prepare prescriptions for saving
    const prescriptionPromises = prescriptions.map(async (prescData) => {
      try {
        // Create or update prescription
        const existingPrescription = await Prescription.findOne({
          patient: patientId,
          medicationName: prescData.medicationName,
          dosage: prescData.dosage,
          frequency: prescData.frequency,
          duration: prescData.duration
        });

        if (existingPrescription) {
          // Update existing prescription
          Object.assign(existingPrescription, prescData);
          return await existingPrescription.save();
        } else {
          // Create new prescription
          const doctorId = prescData.doctorId || (req.user ? req.user.id : null);
          const newPrescription = new Prescription({
            ...prescData,
            patient: patientId,
            doctor: doctorId,
            doctorId: doctorId // Ensure both doctor and doctorId fields are set
          });
          return await newPrescription.save();
            }
          } catch (prescError) {
        console.error('Error processing individual prescription:', prescError);
        // Continue processing other prescriptions
        return null;
      }
    });
        
    // Wait for all prescriptions to be processed
    const savedPrescriptions = await Promise.all(prescriptionPromises);
    const validPrescriptions = savedPrescriptions.filter(p => p !== null);

    // Find or create a medical record for the patient
    let medicalRecord = await MedicalRecord.findOne({ patient: patientId }).sort({ createdAt: -1 });
    
    if (!medicalRecord) {
      // Create a new medical record if none exists
      medicalRecord = new MedicalRecord({
        patient: patientId,
        prescriptions: validPrescriptions.map(p => p._id),
        status: 'Draft'
      });
    } else {
      // Update existing medical record
      const existingPrescIds = new Set(medicalRecord.prescriptions || []);
      validPrescriptions.forEach(p => {
        if (p && p._id && !existingPrescIds.has(p._id)) {
          medicalRecord.prescriptions.push(p._id);
        }
      });
      }
      
    // Save the medical record
    await medicalRecord.save();
          
          return res.json({
            success: true,
      message: 'Prescriptions synced successfully',
      prescriptionCount: validPrescriptions.length,
      medicalRecordId: medicalRecord._id
          });

  } catch (error) {
    console.error('❌ Comprehensive Prescription Sync Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      requestBody: req.body
    });

    res.status(500).json({
      success: false,
      message: 'Failed to sync prescriptions',
      error: {
        name: error.name,
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

/**
 * @route   POST /api/medical-records/remove-mock-data
 * @desc    Remove mock data (paracetamol) from all medical records
 * @access  Public (no authentication for easy access)
 */
router.post('/remove-mock-data', async (req, res) => {
  try {
    // Find all medical records
    const allMedicalRecords = await MedicalRecord.find({});
    
    // Keywords to look for (common mock medication names)
    const mockKeywords = ['paracetamol', 'tylenol', 'acetaminophen', 'mock', 'test', 'sample'];
    
    // Keep track of changes
    let totalRemoved = 0;
    let recordsUpdated = 0;
    let patientsAffected = new Set();
    
    // Process each record
    for (const record of allMedicalRecords) {
      if (record.prescriptions && record.prescriptions.length > 0) {
        const originalCount = record.prescriptions.length;
        
        // Filter out prescriptions with any mock keywords
        record.prescriptions = record.prescriptions.filter(prescription => {
          const medicationName = (prescription.alternativeMedication || '').toLowerCase();
          
          // Check if any mock keyword is in the medication name
          const containsMockKeyword = mockKeywords.some(keyword => 
            medicationName.includes(keyword)
          );
          
          return !containsMockKeyword;
        });
        
        // Calculate how many were removed
        const removed = originalCount - record.prescriptions.length;
        
        if (removed > 0) {
          totalRemoved += removed;
          recordsUpdated++;
          
          // Track unique patients affected
          if (record.patient) {
            patientsAffected.add(record.patient.toString());
          }
          
          // Save the updated record
          await record.save();
        }
      }
    }
    
    // Clear cache for all affected patients
    for (const patientId of patientsAffected) {
      clearCache(`/api/medical-records/patient-public/${patientId}`);
    }
    
    // Return success response
    return res.json({
      success: true,
      message: `Successfully removed ${totalRemoved} mock prescriptions from ${recordsUpdated} medical records`,
      recordsUpdated,
      prescriptionsRemoved: totalRemoved,
      patientsAffected: patientsAffected.size
    });
  } catch (error) {
    console.error('[CLEAN] Error removing mock data:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error removing mock data',
      error: error.toString()
    });
  }
});

// Create professional medical record
router.post('/professional', auth, asyncHandler(async (req, res) => {
  try {
    // Add IP address and user agent for audit trail
    const recordData = {
      ...req.body,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

            const record = await ProfessionalMedicalRecordService.createProfessionalRecord(recordData, req.user._id);
    
    // Generate care gaps assessment
    await ProfessionalMedicalRecordService.assessCareGaps(record._id);
    
    res.status(201).json({
      success: true,
      data: record,
      message: 'Professional medical record created successfully'
    });
  } catch (error) {
    console.error('Error creating professional medical record:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// Update professional medical record
router.put('/professional/:id', auth, asyncHandler(async (req, res) => {
  try {
    const recordId = req.params.id;
    const updateData = {
      ...req.body,
      lastModified: new Date(),
              lastModifiedBy: req.user._id
    };

    const record = await MedicalRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }

    // Check if user has permission to edit
            if (record.doctor.toString() !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this record'
      });
    }

    // Update record with professional enhancements
    Object.assign(record, updateData);
    
    // Recalculate quality score
    const qualityScore = await ProfessionalMedicalRecordService.calculateQualityScore(record);
    record.qualityMetrics = {
      ...record.qualityMetrics,
      documentationScore: qualityScore,
      completenessPercentage: ProfessionalMedicalRecordService.calculateCompleteness(record),
      lastUpdated: new Date()
    };

    // Add audit trail entry
    record.auditTrail.push({
      action: 'update',
              performedBy: req.user._id,
      performedAt: new Date(),
      changes: 'Professional medical record updated',
      userRole: req.user.role,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    await record.save();

    // Regenerate clinical alerts
    await ProfessionalMedicalRecordService.generateClinicalAlerts(record._id);

    res.json({
      success: true,
      data: record,
      message: 'Professional medical record updated successfully'
    });
  } catch (error) {
    console.error('Error updating professional medical record:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// Get clinical alerts for a record
router.get('/:id/alerts', auth, asyncHandler(async (req, res) => {
  try {
    const recordId = req.params.id;
    const alerts = await ProfessionalMedicalRecordService.generateClinicalAlerts(recordId);
    
    res.json({
      success: true,
      data: alerts,
      message: 'Clinical alerts retrieved successfully'
    });
  } catch (error) {
    console.error('Error retrieving clinical alerts:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Get care gaps for a record
router.get('/:id/care-gaps', auth, asyncHandler(async (req, res) => {
  try {
    const recordId = req.params.id;
    const careGaps = await ProfessionalMedicalRecordService.assessCareGaps(recordId);
    
    res.json({
      success: true,
      data: careGaps,
      message: 'Care gaps assessment completed successfully'
    });
  } catch (error) {
    console.error('Error assessing care gaps:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Generate template content
router.post('/template/:templateType', auth, asyncHandler(async (req, res) => {
  try {
    const { templateType } = req.params;
    const { patientData } = req.body;
    
    const templateContent = await ProfessionalMedicalRecordService.generateTemplateContent(templateType, patientData);
    
    res.json({
      success: true,
      data: templateContent,
      message: 'Template content generated successfully'
    });
  } catch (error) {
    console.error('Error generating template content:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Enhanced: Get medical records by patient with search filters
router.get('/patient/:patientId/search', auth, asyncHandler(async (req, res) => {
  try {
    const { patientId } = req.params;
    const { 
      status, 
      category, 
      dateFrom, 
      dateTo, 
      searchTerm, 
      sortBy = 'date-desc',
      page = 1,
      limit = 10 
    } = req.query;

    let query = { patient: patientId };

    // Apply filters
    if (status && status !== 'All') {
      query.status = status;
    }

    if (category && category !== 'All') {
      query['metadata.category'] = category;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    if (searchTerm) {
      query.$or = [
        { 'metadata.searchTerms': { $regex: searchTerm, $options: 'i' } },
        { 'metadata.patientName': { $regex: searchTerm, $options: 'i' } },
        { 'metadata.primaryDiagnosisDescription': { $regex: searchTerm, $options: 'i' } },
        { 'metadata.primaryDiagnosisCode': { $regex: searchTerm, $options: 'i' } },
        { 'chiefComplaint': { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'date-desc': sort = { createdAt: -1 }; break;
      case 'date-asc': sort = { createdAt: 1 }; break;
      case 'quality-desc': sort = { qualityScore: -1 }; break;
      case 'quality-asc': sort = { qualityScore: 1 }; break;
      case 'patient-name': sort = { 'metadata.patientName': 1 }; break;
      default: sort = { createdAt: -1 };
    }

    const records = await MedicalRecord.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('patient', 'firstName lastName patientId')
      .exec();

    const totalRecords = await MedicalRecord.countDocuments(query);

    res.json({
      success: true,
      data: records,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching patient medical records with search:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching medical records',
      error: error.message
    });
  }
}));

// Enhanced: Get medical records by doctor with search filters
router.get('/doctor/:doctorId/search', auth, asyncHandler(async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { 
      patientId,
      status, 
      category, 
      dateFrom, 
      dateTo, 
      searchTerm, 
      sortBy = 'date-desc',
      page = 1,
      limit = 10 
    } = req.query;

    let query = { 'metadata.doctorId': doctorId };

    // Apply filters
    if (patientId) {
      query.patient = patientId;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (category && category !== 'All') {
      query['metadata.category'] = category;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    if (searchTerm) {
      query.$or = [
        { 'metadata.searchTerms': { $regex: searchTerm, $options: 'i' } },
        { 'metadata.patientName': { $regex: searchTerm, $options: 'i' } },
        { 'metadata.primaryDiagnosisDescription': { $regex: searchTerm, $options: 'i' } },
        { 'metadata.primaryDiagnosisCode': { $regex: searchTerm, $options: 'i' } },
        { 'chiefComplaint': { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'date-desc': sort = { createdAt: -1 }; break;
      case 'date-asc': sort = { createdAt: 1 }; break;
      case 'quality-desc': sort = { qualityScore: -1 }; break;
      case 'quality-asc': sort = { qualityScore: 1 }; break;
      case 'patient-name': sort = { 'metadata.patientName': 1 }; break;
      default: sort = { createdAt: -1 };
    }

    const records = await MedicalRecord.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('patient', 'firstName lastName patientId')
      .exec();

    const totalRecords = await MedicalRecord.countDocuments(query);

    res.json({
      success: true,
      data: records,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching doctor medical records with search:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching medical records',
      error: error.message
    });
  }
}));

// New: Advanced search across all records
router.get('/search', auth, asyncHandler(async (req, res) => {
  try {
    const { 
      searchTerm,
      patientId,
      doctorId,
      status, 
      category, 
      dateFrom, 
      dateTo, 
      qualityScoreMin,
      qualityScoreMax,
      tags,
      sortBy = 'date-desc',
      page = 1,
      limit = 10 
    } = req.query;

    let query = {};

    // Apply filters
    if (patientId) query.patient = patientId;
    if (doctorId) query['metadata.doctorId'] = doctorId;
    if (status && status !== 'All') query.status = status;
    if (category && category !== 'All') query['metadata.category'] = category;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    if (qualityScoreMin || qualityScoreMax) {
      query.qualityScore = {};
      if (qualityScoreMin) query.qualityScore.$gte = parseInt(qualityScoreMin);
      if (qualityScoreMax) query.qualityScore.$lte = parseInt(qualityScoreMax);
    }

    if (tags && Array.isArray(tags)) {
      query['metadata.tags'] = { $in: tags };
    }

    if (searchTerm) {
      query.$or = [
        { 'metadata.searchTerms': { $regex: searchTerm, $options: 'i' } },
        { 'metadata.patientName': { $regex: searchTerm, $options: 'i' } },
        { 'metadata.primaryDiagnosisDescription': { $regex: searchTerm, $options: 'i' } },
        { 'metadata.primaryDiagnosisCode': { $regex: searchTerm, $options: 'i' } },
        { 'chiefComplaint': { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
      case 'date-desc': sort = { createdAt: -1 }; break;
      case 'date-asc': sort = { createdAt: 1 }; break;
      case 'quality-desc': sort = { qualityScore: -1 }; break;
      case 'quality-asc': sort = { qualityScore: 1 }; break;
      case 'patient-name': sort = { 'metadata.patientName': 1 }; break;
      default: sort = { createdAt: -1 };
    }

    const records = await MedicalRecord.find(query)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('patient', 'firstName lastName patientId')
      .exec();

    const totalRecords = await MedicalRecord.countDocuments(query);

    res.json({
      success: true,
      data: records,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error searching medical records:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching medical records',
      error: error.message
    });
  }
}));

// New: Get medical record statistics
router.get('/stats', auth, asyncHandler(async (req, res) => {
  try {
    const { doctorId, patientId } = req.query;
    
    let query = {};
    if (doctorId) query['metadata.doctorId'] = doctorId;
    if (patientId) query.patient = patientId;

    // Get basic stats
    const totalRecords = await MedicalRecord.countDocuments(query);
    const draftRecords = await MedicalRecord.countDocuments({ ...query, status: 'Draft' });
    const finalizedRecords = await MedicalRecord.countDocuments({ ...query, status: 'Finalized' });

    // Calculate average quality score
    const qualityStats = await MedicalRecord.aggregate([
      { $match: query },
      { $group: { _id: null, avgQuality: { $avg: '$qualityScore' } } }
    ]);
    
    const averageQualityScore = qualityStats.length > 0 ? Math.round(qualityStats[0].avgQuality) : 0;

    // Records by category
    const categoryStats = await MedicalRecord.aggregate([
      { $match: query },
      { $group: { _id: '$metadata.category', count: { $sum: 1 } } }
    ]);
    
    const recordsByCategory = {};
    categoryStats.forEach(stat => {
      if (stat._id) {
        recordsByCategory[stat._id] = stat.count;
      }
    });

    // Records by month (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    const monthlyStats = await MedicalRecord.aggregate([
      { 
        $match: { 
          ...query, 
          createdAt: { $gte: twelveMonthsAgo } 
        } 
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    const recordsByMonth = {};
    monthlyStats.forEach(stat => {
      const monthKey = `${stat._id.year}-${stat._id.month.toString().padStart(2, '0')}`;
      recordsByMonth[monthKey] = stat.count;
    });

    // Recent records (last 5)
    const recentRecords = await MedicalRecord.find(query)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('patient', 'firstName lastName patientId')
      .exec();

    res.json({
      success: true,
      data: {
        totalRecords,
        draftRecords,
        finalizedRecords,
        averageQualityScore,
        recordsByCategory,
        recordsByMonth,
        recentRecords
      }
    });
  } catch (error) {
    console.error('Error fetching medical record statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
}));



/**
 * @route   GET /api/medical-records/:id/optimized
 * @desc    Get a medical record by ID (optimized version)
 * @access  Private
 */
router.get('/:id/optimized', [auth], medicalRecordController.getMedicalRecordByIdOptimized);

/**
 * @route   GET /api/medical-records/debug/:id
 * @desc    Get a medical record by ID (debugging - no auth)
 * @access  Public (for debugging)
 */
router.get('/debug/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log(`[DEBUG GET] Starting record lookup for ID: ${req.params.id}`);
    
    // Very simple query without any middleware or population
    const record = await MedicalRecord.findById(req.params.id)
      .lean()
      .maxTimeMS(10000);
    
    const queryTime = Date.now() - startTime;
    console.log(`[DEBUG GET] Query completed in ${queryTime}ms`);
    
    if (!record) {
      console.log(`[DEBUG GET] No record found for ID: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Medical record not found',
        recordId: req.params.id,
        queryTime: queryTime,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`[DEBUG GET] Found record:`, {
      id: record._id,
      patient: record.patient,
      status: record.status,
      chiefComplaint: record.chiefComplaint ? 'Present' : 'Missing',
      plan: record.plan ? 'Present' : 'Missing'
    });
    
    res.json({
      success: true,
      message: 'Medical record found',
      data: record,
      queryTime: queryTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const queryTime = Date.now() - startTime;
    console.error(`[DEBUG GET] Error after ${queryTime}ms:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medical record',
      error: error.message,
      recordId: req.params.id,
      queryTime: queryTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/medical-records/:id
 * @desc    Get a medical record by ID
 * @access  Private (Medical Staff)
 */
router.get('/:id', [auth,
  checkPermission('viewReports'),
  validate.medicalRecord.getById
], medicalRecordController.getMedicalRecordById);

/**
 * @route   GET /api/medical-records/load-test/:id
 * @desc    Load a medical record by ID for testing (no auth)
 * @access  Public (for testing)
 */
router.get('/load-test/:id', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log(`[LOAD TEST] Starting record lookup for ID: ${req.params.id}`);
    
    // Very simple query without any middleware or population
    const record = await MedicalRecord.findById(req.params.id)
      .lean()
      .maxTimeMS(10000);
    
    const queryTime = Date.now() - startTime;
    console.log(`[LOAD TEST] Query completed in ${queryTime}ms`);
    
    if (!record) {
      console.log(`[LOAD TEST] No record found for ID: ${req.params.id}`);
      return res.status(404).json({
        success: false,
        message: 'Medical record not found',
        recordId: req.params.id,
        queryTime: queryTime,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`[LOAD TEST] Found record:`, {
      id: record._id,
      patient: record.patient,
      status: record.status,
      chiefComplaint: record.chiefComplaint ? 'Present' : 'Missing',
      plan: record.plan ? 'Present' : 'Missing'
    });
    
    res.json({
      success: true,
      message: 'Medical record found',
      data: record,
      queryTime: queryTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const queryTime = Date.now() - startTime;
    console.error(`[LOAD TEST] Error after ${queryTime}ms:`, error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medical record',
      error: error.message,
      recordId: req.params.id,
      queryTime: queryTime,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/medical-records/test-auth
 * @desc    Test endpoint to verify authentication
 * @access  Private
 */
router.post('/test-auth', [auth], asyncHandler(async (req, res) => {
  console.log('[TEST AUTH] req.user:', req.user);
  console.log('[TEST AUTH] req.body:', req.body);
  res.json({
    success: true,
    message: 'Authentication working',
    user: req.user,
    body: req.body,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @route   POST /api/medical-records/test-create
 * @desc    Test endpoint to create a medical record directly
 * @access  Private
 */
router.post('/test-create', [auth], asyncHandler(async (req, res) => {
  try {
    console.log('[TEST CREATE] Starting medical record creation test');
    console.log('[TEST CREATE] req.user:', req.user);
    console.log('[TEST CREATE] req.body:', req.body);
    const MedicalRecord = require('../models/MedicalRecord');
    // Create a minimal medical record directly
    const recordData = {
      patient: req.body.patient || '6856f507e342696ac839eec7',
      doctor: req.body.doctor || req.user._id,
      // Always flatten chiefComplaint to string for database storage
      chiefComplaint: typeof req.body.chiefComplaint === 'object' && req.body.chiefComplaint !== null
        ? (req.body.chiefComplaint.description || 'Test complaint')
        : (typeof req.body.chiefComplaint === 'string' ? req.body.chiefComplaint : 'Test complaint'),
      createdBy: req.user._id,
      status: 'Draft'
    };
    console.log('[TEST CREATE] Creating medical record with data:', JSON.stringify(recordData, null, 2));
    const medicalRecord = new MedicalRecord(recordData);
    const savedRecord = await medicalRecord.save();
    console.log('[TEST CREATE] Medical record created successfully:', savedRecord._id);
    res.status(201).json({
      success: true,
      message: 'Medical record created successfully (test)',
      data: savedRecord,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[TEST CREATE] Error creating medical record:', error);
    console.error('[TEST CREATE] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create medical record',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * @route   POST /api/medical-records/draft
 * @desc    Create or update a draft medical record with relaxed validation
 * @access  Private (Doctors)
 */
router.post(
  '/draft',
  auth,
  checkPermission('managePatients'),
  body('patient').isMongoId().withMessage('Valid patient ID is required'),
  processValidationErrors,
  asyncHandler(async (req, res, next) => {
            console.log(`[DEBUG DRAFT ${new Date().toISOString()}] Draft medical record route hit. User: ${req.user ? req.user._id : 'No user'}`);
    console.log(`[DEBUG DRAFT ${new Date().toISOString()}] Request body:`, req.body);
    
    try {
      const patientId = req.body.patient;
      const doctorId = req.body.doctor || req.user._id;
      
      // Verify patient exists
      const Patient = require('../models/Patient');
      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found'
        });
      }
      
      // Check if there's already a draft for this patient by this doctor
      const MedicalRecord = require('../models/MedicalRecord');
      let existingDraft = await MedicalRecord.findOne({
        patientId: patientId,
        doctorId: doctorId,
        status: 'Draft'
      });
      
      // Prepare the medical record data with defaults for missing fields
      // Map incoming fields to expected schema fields
      const medicalRecordData = {
        patient: req.body.patient || patientId, // Set the required 'patient' field
        patientId: req.body.patient || patientId, // Also set patientId for compatibility
        doctor: req.body.doctor || doctorId, // Set the 'doctor' field
        doctorId: req.body.doctor || doctorId, // Also set doctorId for compatibility
        doctorName: req.body.doctorName || 'Dr. ' + (req.user.firstName || 'Unknown'),
        createdBy: req.user._id, // Set the required 'createdBy' field
        lastUpdatedBy: req.user._id,
        status: 'Draft',
        visitDate: req.body.visitDate || new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add chiefComplaint with proper object structure
      let chiefComplaintValue = req.body.chiefComplaint;
      if (typeof chiefComplaintValue === 'string') {
        medicalRecordData.chiefComplaint = {
          description: chiefComplaintValue,
          duration: '',
          severity: 'Mild',
          onsetPattern: 'Acute',
          progression: 'Stable',
          location: '',
          aggravatingFactors: [],
          relievingFactors: [],
          associatedSymptoms: [],
          impactOnDailyLife: '',
          previousEpisodes: false,
          previousEpisodesDetails: '',
          recordedBy: req.user._id,
          recordedAt: new Date()
        };
      } else if (typeof chiefComplaintValue === 'object' && chiefComplaintValue !== null) {
        medicalRecordData.chiefComplaint = {
          description: chiefComplaintValue.description || 'Draft in progress',
          duration: chiefComplaintValue.duration || '',
          severity: chiefComplaintValue.severity || 'Mild',
          onsetPattern: chiefComplaintValue.onsetPattern || 'Acute',
          progression: chiefComplaintValue.progression || 'Stable',
          location: chiefComplaintValue.location || '',
          aggravatingFactors: chiefComplaintValue.aggravatingFactors || [],
          relievingFactors: chiefComplaintValue.relievingFactors || [],
          associatedSymptoms: chiefComplaintValue.associatedSymptoms || [],
          impactOnDailyLife: chiefComplaintValue.impactOnDailyLife || '',
          previousEpisodes: chiefComplaintValue.previousEpisodes || false,
          previousEpisodesDetails: chiefComplaintValue.previousEpisodesDetails || '',
          recordedBy: req.user._id,
          recordedAt: new Date()
        };
      } else {
        medicalRecordData.chiefComplaint = {
          description: 'Draft in progress',
          duration: '',
          severity: 'Mild',
          onsetPattern: 'Acute',
          progression: 'Stable',
          location: '',
          aggravatingFactors: [],
          relievingFactors: [],
          associatedSymptoms: [],
          impactOnDailyLife: '',
          previousEpisodes: false,
          previousEpisodesDetails: '',
          recordedBy: req.user._id,
          recordedAt: new Date()
        };
      }
      console.log(`[DEBUG DRAFT] Final chiefComplaint for DB:`, medicalRecordData.chiefComplaint);
      
      // Add other optional fields
      if (req.body.historyOfPresentIllness) {
        medicalRecordData.historyOfPresentIllness = req.body.historyOfPresentIllness;
      }
      
      if (req.body.physicalExamination) {
        medicalRecordData.physicalExamination = req.body.physicalExamination;
      }
      
      if (req.body.vitalSigns) {
        medicalRecordData.vitalSigns = req.body.vitalSigns;
      }
      
      // Handle diagnosis from multiple possible sources
      let diagnosisValue = '';
      
      // Check for diagnosis in assessment object first
      if (req.body.assessment && req.body.assessment.primaryDiagnosis) {
        diagnosisValue = req.body.assessment.primaryDiagnosis;
      } else if (req.body.diagnosis) {
        // Handle diagnosis as string (as per model schema)
        diagnosisValue = typeof req.body.diagnosis === 'string' 
          ? req.body.diagnosis 
          : Array.isArray(req.body.diagnosis) 
            ? req.body.diagnosis.join(', ') 
            : String(req.body.diagnosis);
      }
      
      // Always ensure diagnosis is provided (required field)
      if (diagnosisValue && diagnosisValue.trim() !== '') {
        medicalRecordData.diagnosis = diagnosisValue;
      } else {
        // Add default diagnosis to satisfy required field
        medicalRecordData.diagnosis = 'Diagnosis pending';
      }
      
      // Save enhanced assessment data with ICD-11 support to database
      if (req.body.assessment) {
        medicalRecordData.assessment = {
          primaryDiagnosis: req.body.assessment.primaryDiagnosis || '',
          // Enhanced ICD-11 primary diagnosis
          primaryDiagnosisICD11: {
            code: req.body.assessment.primaryDiagnosisICD11?.code || '',
            description: req.body.assessment.primaryDiagnosisICD11?.description || '',
            chapter: req.body.assessment.primaryDiagnosisICD11?.chapter || '',
            block: req.body.assessment.primaryDiagnosisICD11?.block || '',
            category: req.body.assessment.primaryDiagnosisICD11?.category || '',
            subcategory: req.body.assessment.primaryDiagnosisICD11?.subcategory || ''
          },
          // Secondary diagnoses with ICD-11
          secondaryDiagnoses: req.body.assessment.secondaryDiagnoses || [],
          // Clinical reasoning
          clinicalReasoning: req.body.assessment.clinicalReasoning || '',
          // Differential diagnoses
          differentialDiagnoses: req.body.assessment.differentialDiagnoses || [],
          plan: req.body.assessment.plan || '',
          followUp: req.body.assessment.followUp || '',
          // Enhanced treatment plan
          treatmentPlan: req.body.assessment.treatmentPlan || {
            medications: [],
            procedures: [],
            referrals: [],
            followUpInstructions: {
              timing: '',
              instructions: '',
              appointmentNeeded: false,
              labWork: false,
              imaging: false
            }
          }
        };
      }
      
      // Handle plan from multiple possible sources
      let planValue = '';
      
      // Check for plan in assessment object first
      if (req.body.assessment && req.body.assessment.plan) {
        planValue = req.body.assessment.plan;
      } else if (req.body.plan) {
        planValue = req.body.plan;
      }
      
      if (planValue && planValue.trim() !== '') {
        medicalRecordData.plan = planValue;
        medicalRecordData.treatmentPlan = planValue; // Also set treatmentPlan for consistency
      }
      
      // Handle follow-up from assessment object
      if (req.body.assessment && req.body.assessment.followUp) {
        if (!medicalRecordData.followUpPlan) {
          medicalRecordData.followUpPlan = {};
        }
        medicalRecordData.followUpPlan.instructions = req.body.assessment.followUp;
      }
      
      if (req.body.followUpPlan) {
        medicalRecordData.followUpPlan = req.body.followUpPlan;
      }
      
      if (req.body.notes) {
        medicalRecordData.notes = req.body.notes;
      }
      
      console.log(`[DEBUG DRAFT] Final medicalRecordData before saving:`, JSON.stringify(medicalRecordData, null, 2));
      
      let savedRecord;
      
      if (existingDraft) {
        // Update existing draft
        console.log(`[DEBUG DRAFT ${new Date().toISOString()}] Updating existing draft: ${existingDraft._id}`);
        Object.assign(existingDraft, medicalRecordData);
        savedRecord = await existingDraft.save();
      } else {
        // Create new draft
        console.log(`[DEBUG DRAFT ${new Date().toISOString()}] Creating new draft for patient: ${patientId}`);
        savedRecord = new MedicalRecord(medicalRecordData);
        await savedRecord.save();
      }
      
      // Populate the response
      const populatedRecord = await MedicalRecord.findById(savedRecord._id)
        .populate('patientId', 'firstName lastName patientId')
        .populate('doctorId', 'firstName lastName');
      
      console.log(`[DEBUG DRAFT ${new Date().toISOString()}] Draft saved successfully: ${savedRecord._id}`);
      
      res.status(200).json({
        success: true,
        message: existingDraft ? 'Draft updated successfully' : 'Draft created successfully',
        data: populatedRecord
      });
      
    } catch (error) {
      console.error(`[ERROR DRAFT ${new Date().toISOString()}] Error in draft medical record:`, error);
      next(error);
    }
  })
);

// Debug route to help diagnose sync issues
router.get('/debug-sync/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const mongoose = require('mongoose');
    const Prescription = require('../models/Prescription');
    const MedicalRecord = require('../models/MedicalRecord');
    const Patient = require('../models/Patient');

    console.log(`🔍 Debug Sync Request for Patient: ${patientId}`);

    // Validate patient ID
    if (!patientId || !mongoose.Types.ObjectId.isValid(patientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patient ID format'
      });
    }

    // Check patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Find prescriptions
    const prescriptions = await Prescription.find({
      $or: [
        { patient: patientId },
        { patientId: patientId }
      ]
    }).populate('patient', 'firstName lastName');

    // Find medical records
    const medicalRecords = await MedicalRecord.find({ patient: patientId })
      .populate('patient', 'firstName lastName')
      .populate('prescriptions');

    res.json({
      success: true,
      patient: {
        id: patient._id,
        name: `${patient.firstName} ${patient.lastName}`
      },
      prescriptions: prescriptions.map(p => ({
        id: p._id,
        medicationName: p.medicationName,
        duration: p.duration,
        frequency: p.frequency,
        totalCost: p.totalCost,
        status: p.status,
        paymentStatus: p.paymentStatus
      })),
      medicalRecords: medicalRecords.map(mr => ({
        id: mr._id,
        prescriptionCount: mr.prescriptions ? mr.prescriptions.length : 0,
        status: mr.status,
        createdAt: mr.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ Debug Sync Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to debug sync',
      error: {
        name: error.name,
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

module.exports = router; 
