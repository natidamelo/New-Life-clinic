const express = require('express');
const router = express.Router();
const axios = require('axios');
const { auth } = require('../middleware/auth');
const VitalSigns = require('../models/VitalSigns');
const Patient = require('../models/Patient');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') return null;
  try {
    const response = await axios.post(GEMINI_URL, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
    }, { timeout: 15000 });
    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.error('Gemini API error:', err.message);
    return null;
  }
}

// @route   GET /api/vital-signs
// @desc    Get all vital signs
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const vitalSigns = await VitalSigns.find({ isActive: true })
      .populate('patientId', 'firstName lastName patientId')
      .populate('measuredBy', 'firstName lastName')
      .sort({ measurementDate: -1 });
    
    res.json({
      success: true,
      data: vitalSigns
    });
  } catch (error) {
    console.error('Error fetching vital signs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/vital-signs/patient/:patientId/latest
// @desc    Get latest vital signs for a specific patient
// @access  Private
router.get('/patient/:patientId/latest', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // First check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Get the latest vital signs for this patient
    const latestVitals = await VitalSigns.findOne({
      patientId: patientId,
      isActive: true
    })
    .sort({ measurementDate: -1 })
    .populate('measuredBy', 'firstName lastName');
    
    if (!latestVitals) {
      return res.json({
        success: true,
        data: null,
        message: 'No vital signs found for this patient'
      });
    }
    
    res.json({
      success: true,
      data: latestVitals
    });
  } catch (error) {
    console.error('Error fetching latest vital signs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/vital-signs/patient/:patientId/history
// @desc    Get vital signs history for a specific patient
// @access  Private
router.get('/patient/:patientId/history', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 10 } = req.query;
    
    // First check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Get vital signs history for this patient
    const vitalSignsHistory = await VitalSigns.find({
      patientId: patientId,
      isActive: true
    })
    .sort({ measurementDate: -1 })
    .limit(parseInt(limit))
    .populate('measuredBy', 'firstName lastName');
    
    res.json({
      success: true,
      data: {
        patient: {
          _id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          patientId: patient.patientId
        },
        vitalSignsHistory: vitalSignsHistory
      }
    });
  } catch (error) {
    console.error('Error fetching vital signs history:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/vital-signs
// @desc    Create new vital signs record
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { patientId, ...vitalSignsData } = req.body;
    
    // Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Create new vital signs record
    const vitalSigns = new VitalSigns({
      ...vitalSignsData,
      patientId: patientId,
      patientName: `${patient.firstName} ${patient.lastName}`,
      measuredBy: req.user.id,
      measuredByName: `${req.user.firstName} ${req.user.lastName}`
    });
    
    await vitalSigns.save();
    
    // If this vital signs recording is associated with a nurse task, mark it as completed
    if (vitalSignsData.taskId) {
      try {
        const NurseTask = require('../models/NurseTask');
        const task = await NurseTask.findById(vitalSignsData.taskId);
        
        if (task && task.status !== 'COMPLETED') {
          console.log(`🎯 [VITAL SIGNS] Marking associated nurse task ${vitalSignsData.taskId} as completed`);
          
          task.status = 'COMPLETED';
          task.completedDate = new Date();
          task.completedBy = req.user.id;
          task.completionNotes = `Vital signs recorded: ${vitalSignsData.measurementType || 'blood_pressure'}`;
          
          await task.save();
          console.log(`✅ [VITAL SIGNS] Nurse task ${vitalSignsData.taskId} marked as completed`);
        }
      } catch (taskError) {
        console.error('❌ [VITAL SIGNS] Error updating associated nurse task:', taskError);
        // Don't fail the vital signs save if task update fails
      }
    }
    
    // Populate the response
    await vitalSigns.populate('patientId', 'firstName lastName patientId');
    await vitalSigns.populate('measuredBy', 'firstName lastName');
    
    res.json({
      success: true,
      data: vitalSigns,
      message: 'Vital signs recorded successfully'
    });
  } catch (error) {
    console.error('Error creating vital signs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/vital-signs/:id
// @desc    Update vital signs record
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const vitalSigns = await VitalSigns.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('patientId', 'firstName lastName patientId')
    .populate('measuredBy', 'firstName lastName');
    
    if (!vitalSigns) {
      return res.status(404).json({
        success: false,
        message: 'Vital signs record not found'
      });
    }
    
    res.json({
      success: true,
      data: vitalSigns,
      message: 'Vital signs updated successfully'
    });
  } catch (error) {
    console.error('Error updating vital signs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/vital-signs/:id
// @desc    Delete vital signs record (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const vitalSigns = await VitalSigns.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!vitalSigns) {
      return res.status(404).json({
        success: false,
        message: 'Vital signs record not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Vital signs record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting vital signs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/vital-signs/pending/:type
// @desc    Get pending vital signs tasks by type
// @access  Private
router.get('/pending/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    
    console.log(`🔍 [Vital Signs Pending] Fetching pending ${type} tasks for user: ${req.user.id}`);
    
    // Import NurseTask model
    const NurseTask = require('../models/NurseTask');
    const Patient = require('../models/Patient');
    
    // Build query for nurse tasks
    let taskQuery = {
      status: 'PENDING',
      taskType: 'VITAL_SIGNS'
    };
    
    // Note: vitalSignsOptions is not a schema field, so we don't filter by it
    // All VITAL_SIGNS tasks are returned regardless of measurement type
    
    console.log(`🔍 [Vital Signs Pending] Query:`, JSON.stringify(taskQuery, null, 2));
    
    // First, let's check if there are any nurse tasks at all
    const allTasks = await NurseTask.find({}).limit(5);
    console.log(`🔍 [Vital Signs Pending] Total nurse tasks in database: ${allTasks.length}`);
    if (allTasks.length > 0) {
      console.log(`🔍 [Vital Signs Pending] Sample task:`, {
        _id: allTasks[0]._id,
        taskType: allTasks[0].taskType,
        status: allTasks[0].status,
        patientName: allTasks[0].patientName
      });
    }
    
    // Find pending nurse tasks
    const pendingTasks = await NurseTask.find(taskQuery)
      .populate('patientId', 'firstName lastName patientId')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    console.log(`✅ [Vital Signs Pending] Found ${pendingTasks.length} pending tasks`);
    
    // Transform tasks to match frontend expectations
    const transformedTasks = pendingTasks.map(task => ({
      _id: task._id,
      id: task._id,
      patientId: task.patientId?._id || task.patientId,
      patientName: task.patientName || 
        (task.patientId ? `${task.patientId.firstName || ''} ${task.patientId.lastName || ''}`.trim() : 'Unknown Patient'),
      taskType: task.taskType,
      status: task.status,
      priority: task.priority,
      description: task.description,
      dueDate: task.dueDate,
      assignedTo: task.assignedTo,
      assignedToName: task.assignedToName,
      notes: task.notes,
      vitalSignsOptions: task.vitalSignsOptions,
      metadata: task.metadata,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      // Add fields expected by frontend
      type: 'VITAL_SIGNS',
      systolic: null,
      diastolic: null,
      measurementDate: null,
      recorded: 'Pending'
    }));
    
    console.log(`✅ [Vital Signs Pending] Transformed ${transformedTasks.length} tasks`);
    
    res.json({
      success: true,
      data: transformedTasks,
      message: `Found ${transformedTasks.length} pending ${type} vital signs tasks`
    });
  } catch (error) {
    console.error(`❌ [Vital Signs Pending] Error fetching pending ${req.params.type} vital signs:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/vital-signs/history/:type
// @desc    Get vital signs history by type
// @access  Private
router.get('/history/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 50, patientId } = req.query;
    
    let query = { isActive: true };
    
    // Add patient filter if provided
    if (patientId) {
      query.patientId = patientId;
    }
    
    // Filter by vital signs type
    if (type === 'blood_pressure') {
      // Get records that have blood pressure measurements
      query.$and = [
        {
          $or: [
            { 'systolic': { $exists: true, $ne: null } },
            { 'diastolic': { $exists: true, $ne: null } }
          ]
        },
        {
          $or: [
            { 'measurementType': 'blood_pressure' },
            { 'measurementType': 'comprehensive' }
          ]
        }
      ];
    } else if (type === 'comprehensive') {
      // Get all vital signs records (comprehensive view)
      // No additional filtering needed
    }
    
    const vitalSignsHistory = await VitalSigns.find(query)
      .populate('patientId', 'firstName lastName patientId')
      .populate('measuredBy', 'firstName lastName')
      .sort({ measurementDate: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: vitalSignsHistory,
      message: `${type} vital signs history retrieved successfully`
    });
  } catch (error) {
    console.error(`Error fetching ${req.params.type} vital signs history:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/vital-signs/patient/:patientId/print
// @desc    Get patient vital signs records for printing with date range
// @access  Private
router.get('/patient/:patientId/print', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { 
      startDate, 
      endDate, 
      measurementType = 'blood_pressure',
      includeNotes = true 
    } = req.query;
    
    console.log('🖨️ [Print Records] Request:', { patientId, startDate, endDate, measurementType });
    
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }
    
    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end date
      dateFilter = { measurementDate: { $gte: start, $lte: end } };
    }
    
    // Build measurement type filter
    let measurementFilter = {};
    if (measurementType !== 'all') {
      switch (measurementType) {
        case 'blood_pressure':
          measurementFilter = {
            $and: [
              {
                $or: [
                  { 'systolic': { $exists: true, $ne: null } },
                  { 'diastolic': { $exists: true, $ne: null } }
                ]
              },
              {
                $or: [
                  { 'measurementType': 'blood_pressure' },
                  { 'measurementType': 'comprehensive' }
                ]
              }
            ]
          };
          break;
        case 'temperature':
          measurementFilter = { 
            'temperature': { $exists: true, $ne: null },
            $or: [
              { 'measurementType': 'temperature' },
              { 'measurementType': 'comprehensive' }
            ]
          };
          break;
        case 'pulse':
          measurementFilter = { 
            'pulse': { $exists: true, $ne: null },
            $or: [
              { 'measurementType': 'pulse' },
              { 'measurementType': 'comprehensive' }
            ]
          };
          break;
        case 'weight':
          measurementFilter = { 
            'weight': { $exists: true, $ne: null },
            $or: [
              { 'measurementType': 'weight' },
              { 'measurementType': 'comprehensive' }
            ]
          };
          break;
        case 'height':
          measurementFilter = { 
            'height': { $exists: true, $ne: null },
            $or: [
              { 'measurementType': 'height' },
              { 'measurementType': 'comprehensive' }
            ]
          };
          break;
      }
    }
    
    // Build query properly combining all filters
    const query = {
      isActive: true,
      patientId: patientId
    };
    
    // Add date filter if exists
    if (Object.keys(dateFilter).length > 0) {
      Object.assign(query, dateFilter);
    }
    
    // Add measurement filter - properly merge $and conditions if they exist
    if (Object.keys(measurementFilter).length > 0) {
      if (measurementFilter.$and) {
        // If measurementFilter has $and, add it to the query
        query.$and = measurementFilter.$and;
      } else {
        // Otherwise just merge the filter fields
        Object.assign(query, measurementFilter);
      }
    }
    
    console.log('🖨️ [Print Records] Query:', JSON.stringify(query, null, 2));
    
    // Find records
    const records = await VitalSigns.find(query)
      .populate('patientId', 'firstName lastName patientId')
      .populate('measuredBy', 'firstName lastName')
      .sort({ measurementDate: -1 });
    
    // Get patient info
    const patient = await Patient.findById(patientId);
    const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
    
    console.log('✅ [Print Records] Found records:', {
      patientName,
      recordCount: records.length,
      dateRange: { startDate, endDate }
    });
    
    res.json({
      success: true,
      data: {
        patient: {
          id: patientId,
          name: patientName,
          firstName: patient?.firstName || '',
          lastName: patient?.lastName || ''
        },
        records: records,
        totalRecords: records.length,
        dateRange: { startDate, endDate },
        measurementType
      }
    });
    
  } catch (error) {
    console.error('❌ [Print Records] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during print data fetch',
      error: error.message
    });
  }
});

// @route   GET /api/vital-signs/search
// @desc    Search vital signs by patient name with filters
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { 
      patientName, 
      timePeriod = 'all', 
      measurementType = 'all', 
      status = 'all' 
    } = req.query;
    
    console.log('🔍 [Vital Signs Search] Request:', { patientName, timePeriod, measurementType, status });
    
    if (!patientName || patientName.trim().length < 1) {
      return res.json({
        success: true,
        data: [],
        totalRecords: 0,
        timePeriod,
        status,
        completedRecords: 0,
        pendingTasks: 0
      });
    }
    
    const searchTerm = patientName.trim();
    
    // Build date filter based on time period
    let dateFilter = {};
    const now = new Date();
    
    switch (timePeriod) {
      case 'today':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        dateFilter = { measurementDate: { $gte: startOfDay, $lt: endOfDay } };
        break;
      case 'week':
      case '1week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { measurementDate: { $gte: weekAgo } };
        break;
      case '2weeks':
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        dateFilter = { measurementDate: { $gte: twoWeeksAgo } };
        break;
      case 'month':
      case '1month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = { measurementDate: { $gte: monthAgo } };
        break;
      case '3months':
        const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateFilter = { measurementDate: { $gte: threeMonthsAgo } };
        break;
      case '6months':
        const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        dateFilter = { measurementDate: { $gte: sixMonthsAgo } };
        break;
      case 'year':
      case '1year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFilter = { measurementDate: { $gte: yearAgo } };
        break;
      default:
        // 'all' - no date filter
        break;
    }
    
    // Build measurement type filter
    let measurementFilter = {};
    if (measurementType !== 'all') {
      switch (measurementType) {
        case 'blood_pressure':
          measurementFilter = {
            $and: [
              {
                $or: [
                  { 'systolic': { $exists: true, $ne: null } },
                  { 'diastolic': { $exists: true, $ne: null } }
                ]
              },
              {
                $or: [
                  { 'measurementType': 'blood_pressure' },
                  { 'measurementType': 'comprehensive' }
                ]
              }
            ]
          };
          break;
        case 'temperature':
          measurementFilter = { 
            'temperature': { $exists: true, $ne: null },
            $or: [
              { 'measurementType': 'temperature' },
              { 'measurementType': 'comprehensive' }
            ]
          };
          break;
        case 'pulse':
          measurementFilter = { 
            'pulse': { $exists: true, $ne: null },
            $or: [
              { 'measurementType': 'pulse' },
              { 'measurementType': 'comprehensive' }
            ]
          };
          break;
        case 'weight':
          measurementFilter = { 
            'weight': { $exists: true, $ne: null },
            $or: [
              { 'measurementType': 'weight' },
              { 'measurementType': 'comprehensive' }
            ]
          };
          break;
        case 'height':
          measurementFilter = { 
            'height': { $exists: true, $ne: null },
            $or: [
              { 'measurementType': 'height' },
              { 'measurementType': 'comprehensive' }
            ]
          };
          break;
      }
    }
    
    // Build the base query with all conditions properly combined
    const query = {
      isActive: true,
      // Patient name search
      $or: [
        { patientName: { $regex: searchTerm, $options: 'i' } },
        { 
          $expr: {
            $regexMatch: {
              input: { $concat: ['$patientName'] },
              regex: searchTerm,
              options: 'i'
            }
          }
        }
      ]
    };
    
    // Add date filter if exists
    if (Object.keys(dateFilter).length > 0) {
      Object.assign(query, dateFilter);
    }
    
    // Add measurement filter - properly merge $and conditions if they exist
    if (Object.keys(measurementFilter).length > 0) {
      if (measurementFilter.$and) {
        // If measurementFilter has $and, combine it with the main query
        query.$and = measurementFilter.$and;
      } else {
        // Otherwise just merge the filter fields
        Object.assign(query, measurementFilter);
      }
    }
    
    console.log('🔍 [Vital Signs Search] Date filter:', dateFilter);
    console.log('🔍 [Vital Signs Search] Measurement filter:', measurementFilter);
    console.log('🔍 [Vital Signs Search] Query:', JSON.stringify(query, null, 2));
    
    // Find vital signs records
    const vitalSignsRecords = await VitalSigns.find(query)
      .populate('patientId', 'firstName lastName patientId')
      .populate('measuredBy', 'firstName lastName')
      .sort({ measurementDate: -1 })
      .limit(100);
    
    // Get pending tasks (this would typically come from a NurseTask model)
    // For now, we'll return empty pending tasks
    const pendingTasks = [];
    
    // Group records by patient
    const patientGroups = new Map();
    
    vitalSignsRecords.forEach(record => {
      const patientId = record.patientId?._id || record.patientId;
      const patientName = record.patientName || 
        (record.patientId ? `${record.patientId.firstName || ''} ${record.patientId.lastName || ''}`.trim() : 'Unknown Patient');
      
      if (!patientGroups.has(patientId)) {
        patientGroups.set(patientId, {
          patientId: patientId,
          patientName: patientName,
          records: [],
          pendingTasks: []
        });
      }
      
      patientGroups.get(patientId).records.push(record);
    });
    
    // Add pending tasks to patient groups
    pendingTasks.forEach(task => {
      const patientId = task.patientId;
      if (patientGroups.has(patientId)) {
        patientGroups.get(patientId).pendingTasks.push(task);
      } else {
        patientGroups.set(patientId, {
          patientId: patientId,
          patientName: task.patientName || 'Unknown Patient',
          records: [],
          pendingTasks: [task]
        });
      }
    });
    
    const groupedResults = Array.from(patientGroups.values());
    
    // Calculate stats
    const completedRecords = vitalSignsRecords.length;
    const totalRecords = completedRecords + pendingTasks.length;
    
    console.log('✅ [Vital Signs Search] Found records:', {
      completedRecords,
      pendingTasks: pendingTasks.length,
      totalRecords,
      patientGroups: patientGroups.size,
      sampleRecord: vitalSignsRecords.length > 0 ? {
        measurementType: vitalSignsRecords[0].measurementType,
        hasSystolic: !!vitalSignsRecords[0].systolic,
        hasDiastolic: !!vitalSignsRecords[0].diastolic,
        patientName: vitalSignsRecords[0].patientName
      } : null
    });
    
    res.json({
      success: true,
      data: groupedResults,
      totalRecords,
      timePeriod,
      status,
      completedRecords,
      pendingTasks: pendingTasks.length
    });
    
  } catch (error) {
    console.error('❌ [Vital Signs Search] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during vital signs search',
      error: error.message
    });
  }
});

// @route   GET /api/vital-signs/debug/tasks
// @desc    Debug endpoint to check all nurse tasks
// @access  Private
router.get('/debug/tasks', auth, async (req, res) => {
  try {
    const NurseTask = require('../models/NurseTask');
    
    // Get all nurse tasks
    const allTasks = await NurseTask.find({})
      .populate('patientId', 'firstName lastName patientId')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    // Get VITAL_SIGNS tasks specifically
    const vitalSignsTasks = await NurseTask.find({ taskType: 'VITAL_SIGNS' })
      .populate('patientId', 'firstName lastName patientId')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    // Get PENDING VITAL_SIGNS tasks
    const pendingVitalSignsTasks = await NurseTask.find({ 
      taskType: 'VITAL_SIGNS', 
      status: 'PENDING' 
    })
      .populate('patientId', 'firstName lastName patientId')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: {
        totalTasks: allTasks.length,
        vitalSignsTasks: vitalSignsTasks.length,
        pendingVitalSignsTasks: pendingVitalSignsTasks.length,
        allTasks: allTasks.map(task => ({
          _id: task._id,
          taskType: task.taskType,
          status: task.status,
          patientName: task.patientName,
          description: task.description
        })),
        vitalSignsTasks: vitalSignsTasks.map(task => ({
          _id: task._id,
          taskType: task.taskType,
          status: task.status,
          patientName: task.patientName,
          description: task.description
        })),
        pendingVitalSignsTasks: pendingVitalSignsTasks.map(task => ({
          _id: task._id,
          taskType: task.taskType,
          status: task.status,
          patientName: task.patientName,
          description: task.description
        }))
      }
    });
  } catch (error) {
    console.error('❌ [Debug] Error fetching nurse tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/vital-signs/ai-analyze/:patientId
// @desc    AI analysis of a patient's blood pressure history
// @access  Private
router.post('/ai-analyze/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.json({
        success: true,
        isAIAvailable: false,
        message: 'AI not configured. Add GEMINI_API_KEY to .env to enable AI features.'
      });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const mongoose = require('mongoose');
    const isValidObjectId = mongoose.Types.ObjectId.isValid(patientId);

    // The patientId stored in VitalSigns is a MongoDB ObjectId ref to Patient.
    // We query directly with the provided patientId (which should be the Patient._id).
    const bpQuery = {
      isActive: true,
      $or: [
        { measurementType: 'blood_pressure' },
        { measurementType: 'comprehensive', systolic: { $exists: true, $ne: null } }
      ],
      measurementDate: { $gte: thirtyDaysAgo }
    };

    // Try querying by patientId as ObjectId first
    let recentVitals = [];
    let latestVitals = null;

    if (isValidObjectId) {
      recentVitals = await VitalSigns.find({
        ...bpQuery,
        patientId: new mongoose.Types.ObjectId(patientId)
      }).sort({ measurementDate: -1 }).limit(20);

      latestVitals = await VitalSigns.findOne({
        patientId: new mongoose.Types.ObjectId(patientId),
        isActive: true
      }).sort({ measurementDate: -1 });
    }

    // Fallback: search by patientName if we got the patientId from a populated record
    // In that case the frontend may have passed record.patientId._id or record.patientId
    if (recentVitals.length === 0) {
      // Try as plain string match
      recentVitals = await VitalSigns.find({
        ...bpQuery,
        patientId: patientId
      }).sort({ measurementDate: -1 }).limit(20);

      if (!latestVitals) {
        latestVitals = await VitalSigns.findOne({
          patientId: patientId,
          isActive: true
        }).sort({ measurementDate: -1 });
      }
    }

    // Last fallback: find any VitalSigns record by _id and use its patientId
    if (recentVitals.length === 0 && isValidObjectId) {
      const sampleRecord = await VitalSigns.findById(patientId);
      if (sampleRecord?.patientId) {
        recentVitals = await VitalSigns.find({
          ...bpQuery,
          patientId: sampleRecord.patientId
        }).sort({ measurementDate: -1 }).limit(20);
        latestVitals = latestVitals || sampleRecord;
      }
    }

    let patient = null;
    try {
      patient = await Patient.findById(patientId).select('firstName lastName age gender');
    } catch (e) { /* patient ID might not be a MongoDB ObjectId */ }

    if (!latestVitals && recentVitals.length === 0) {
      return res.json({
        success: true,
        isAIAvailable: true,
        analysis: {
          summary: 'No recent blood pressure records found for this patient.',
          classification: 'unknown',
          trend: 'insufficient_data',
          riskLevel: 'unknown',
          recommendations: ['Record blood pressure measurements to enable AI analysis'],
          warnings: [],
          lifestyle: []
        }
      });
    }

    const bpReadings = recentVitals
      .filter(v => v.systolic && v.diastolic)
      .map(v => `${new Date(v.measurementDate).toLocaleDateString()}: ${v.systolic}/${v.diastolic} mmHg (${v.position || 'sitting'}, ${v.arm || 'left'} arm)`)
      .join('\n');

    const latestBP = latestVitals?.systolic && latestVitals?.diastolic
      ? `${latestVitals.systolic}/${latestVitals.diastolic} mmHg`
      : 'Not available';

    const avgSystolic = recentVitals.filter(v => v.systolic).reduce((s, v) => s + v.systolic, 0) / (recentVitals.filter(v => v.systolic).length || 1);
    const avgDiastolic = recentVitals.filter(v => v.diastolic).reduce((s, v) => s + v.diastolic, 0) / (recentVitals.filter(v => v.diastolic).length || 1);

    const prompt = `You are an expert clinical cardiologist AI assistant. Analyze this patient's blood pressure data and provide a comprehensive clinical assessment.

Patient: ${patient ? `${patient.firstName} ${patient.lastName}, Age: ${patient.age || 'Unknown'}, Gender: ${patient.gender || 'Unknown'}` : 'Unknown Patient'}
Latest BP: ${latestBP}
Average BP (last 30 days): ${avgSystolic.toFixed(0)}/${avgDiastolic.toFixed(0)} mmHg
Total readings analyzed: ${recentVitals.length}
Additional vitals: Pulse: ${latestVitals?.pulse || 'N/A'} bpm, SpO2: ${latestVitals?.spo2 || 'N/A'}%, Blood Sugar: ${latestVitals?.bloodSugar || 'N/A'} mg/dL, BMI: ${latestVitals?.bmi || 'N/A'}

Recent BP readings (last 30 days):
${bpReadings || 'No readings available'}

Provide a JSON response with these exact fields:
1. "summary": 2-3 sentence clinical summary of the patient's blood pressure status
2. "classification": One of: "Normal", "Elevated", "Stage 1 Hypertension", "Stage 2 Hypertension", "Hypertensive Crisis", "Hypotension", "Unknown"
3. "trend": One of: "improving", "worsening", "stable", "fluctuating", "insufficient_data"
4. "riskLevel": One of: "low", "moderate", "high", "critical"
5. "recommendations": Array of 4-5 specific clinical recommendations
6. "warnings": Array of 1-3 urgent warnings (empty array if none)
7. "lifestyle": Array of 3-4 lifestyle modification suggestions

Respond ONLY with valid JSON, no markdown.`;

    const aiText = await callGemini(prompt);
    let analysis = {
      summary: 'AI analysis unavailable.',
      classification: 'Unknown',
      trend: 'insufficient_data',
      riskLevel: 'unknown',
      recommendations: [],
      warnings: [],
      lifestyle: []
    };

    if (aiText) {
      try {
        const cleaned = aiText.replace(/```json\n?|\n?```/g, '').trim();
        analysis = JSON.parse(cleaned);
      } catch (e) {
        analysis.summary = aiText.substring(0, 400);
      }
    }

    res.json({
      success: true,
      isAIAvailable: true,
      analysis,
      stats: {
        totalReadings: recentVitals.length,
        avgSystolic: Math.round(avgSystolic),
        avgDiastolic: Math.round(avgDiastolic),
        latestBP
      }
    });
  } catch (error) {
    console.error('AI analyze error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/vital-signs/ai-chat
// @desc    AI chat assistant for blood pressure questions
// @access  Private
router.post('/ai-chat', auth, async (req, res) => {
  try {
    const { message, patientContext, chatHistory = [] } = req.body;

    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.json({
        success: true,
        reply: 'AI assistant is not configured. Please add your GEMINI_API_KEY to the backend .env file.',
        isAIAvailable: false
      });
    }

    const patientInfo = patientContext ? `
Current Patient Context:
- Name: ${patientContext.patientName || 'Unknown'}
- Latest BP: ${patientContext.systolic || '?'}/${patientContext.diastolic || '?'} mmHg
- Pulse: ${patientContext.pulse || 'N/A'} bpm
- SpO2: ${patientContext.spo2 || 'N/A'}%
- Blood Sugar: ${patientContext.bloodSugar || 'N/A'} mg/dL
- BMI: ${patientContext.bmi || 'N/A'}
- Position: ${patientContext.position || 'N/A'}
- AI Classification: ${patientContext.classification || 'N/A'}
` : '';

    const historyText = chatHistory.slice(-4).map(h =>
      `${h.role === 'user' ? 'Nurse/Staff' : 'AI Cardiologist'}: ${h.content}`
    ).join('\n');

    const systemPrompt = `You are an expert AI cardiologist assistant at New Life Clinic. You help nursing staff understand and manage patient blood pressure readings.

${patientInfo}
${historyText ? `Recent conversation:\n${historyText}\n` : ''}

Guidelines:
- Provide evidence-based clinical guidance on blood pressure management
- Explain BP classifications (Normal, Elevated, Stage 1/2 Hypertension, Hypertensive Crisis)
- Give practical nursing interventions and monitoring advice
- Recommend when to escalate to a physician
- Be concise but thorough (2-4 sentences per point)
- Always recommend physician consultation for treatment decisions

Question: ${message}

Respond professionally and helpfully.`;

    const reply = await callGemini(systemPrompt);

    res.json({
      success: true,
      reply: reply || 'I could not generate a response. Please try again.',
      isAIAvailable: true
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ success: false, message: 'AI service error', error: error.message });
  }
});

module.exports = router;
