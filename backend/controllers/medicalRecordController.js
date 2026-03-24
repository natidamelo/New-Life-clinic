const medicalRecord = require('../models/MedicalRecord');

// @desc    Get all medicalRecord
// @route   GET /api/medicalrecord
// @access  Private
const getmedicalRecords = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'medicalRecord endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching medicalRecords:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get medicalRecord by ID
// @route   GET /api/medicalrecord/:id
// @access  Private
const getmedicalRecordById = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'medicalRecord by ID endpoint working',
      data: null
    });
  } catch (error) {
    console.error('Error fetching medicalRecord:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new medicalRecord
// @route   POST /api/medicalrecord
// @access  Private
const createmedicalRecord = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'medicalRecord created successfully'
    });
  } catch (error) {
    console.error('Error creating medicalRecord:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update medicalRecord
// @route   PUT /api/medicalrecord/:id
// @access  Private
const updatemedicalRecord = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'medicalRecord updated successfully'
    });
  } catch (error) {
    console.error('Error updating medicalRecord:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete medicalRecord
// @route   DELETE /api/medicalrecord/:id
// @access  Private
const deletemedicalRecord = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'medicalRecord deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting medicalRecord:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Additional functions needed by the routes
const getMedicalRecordByIdOptimized = async (req, res) => {
  try {
    const MedicalRecord = require('../models/MedicalRecord');
    const recordId = req.params.id;
    
    console.log(`[OPTIMIZED] Fetching medical record: ${recordId}`);
    
    // Fetch the record with minimal population for performance
    const record = await MedicalRecord.findById(recordId)
      .populate('patient', 'firstName lastName patientId')
      .populate('doctor', 'firstName lastName')
      .lean()
      .maxTimeMS(10000);
    
    if (!record) {
      console.log(`[OPTIMIZED] No record found for ID: ${recordId}`);
      return res.status(404).json({
        success: false,
        message: 'Medical record not found',
        recordId: recordId
      });
    }
    
    console.log(`[OPTIMIZED] Found record:`, {
      id: record._id,
      patient: record.patient,
      status: record.status,
      hasChiefComplaint: !!record.chiefComplaint,
      hasPlan: !!record.plan
    });
    
    res.json({
      success: true,
      message: 'Medical record retrieved successfully',
      data: record
    });
  } catch (error) {
    console.error('Error fetching medical record by ID optimized:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const getMedicalRecords = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Get medical records endpoint working',
      data: []
    });
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const getMedicalRecordById = async (req, res) => {
  try {
    const MedicalRecord = require('../models/MedicalRecord');
    const recordId = req.params.id;
    
    console.log(`[GET BY ID] Fetching medical record: ${recordId}`);
    
    // Fetch the record with full population
    const record = await MedicalRecord.findById(recordId)
      .populate('patient', 'firstName lastName patientId dateOfBirth gender phone email')
      .populate('doctor', 'firstName lastName specialization')
      .populate('nurse', 'firstName lastName')
      .lean()
      .maxTimeMS(10000);
    
    if (!record) {
      console.log(`[GET BY ID] No record found for ID: ${recordId}`);
      return res.status(404).json({
        success: false,
        message: 'Medical record not found',
        recordId: recordId
      });
    }
    
    console.log(`[GET BY ID] Found record:`, {
      id: record._id,
      patient: record.patient,
      status: record.status,
      hasChiefComplaint: !!record.chiefComplaint,
      hasPlan: !!record.plan
    });
    
    res.json({
      success: true,
      message: 'Medical record retrieved successfully',
      data: record
    });
  } catch (error) {
    console.error('Error fetching medical record by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const createMedicalRecord = async (req, res) => {
  try {
    console.log('[CREATE MEDICAL RECORD] Starting medical record creation');
    console.log('[CREATE MEDICAL RECORD] Request body:', req.body);
    console.log('[CREATE MEDICAL RECORD] User data:', req.user);
    
    const MedicalRecord = require('../models/MedicalRecord');
    
    // Check if the record is being created with Finalized status
    const isFinalized = req.body.status === 'Finalized';
    
    // Prepare the medical record data with required fields
    const recordData = {
      ...req.body,
      // If creating as finalized, start as Draft to use proper finalization flow
      status: isFinalized ? 'Draft' : req.body.status,
      createdBy: req.user._id || req.user.userId,
      doctorId: req.user._id || req.user.userId,
      doctorName: req.user.firstName && req.user.lastName 
        ? `${req.user.firstName} ${req.user.lastName}` 
        : req.user.email || 'Unknown Doctor'
    };
    
    console.log('[CREATE MEDICAL RECORD] Record data with required fields:', recordData);
    console.log('[CREATE MEDICAL RECORD] Will finalize after creation:', isFinalized);
    
    // Create the medical record
    const medicalRecord = new MedicalRecord(recordData);
    await medicalRecord.save();
    
    console.log('[CREATE MEDICAL RECORD] Medical record created successfully with ID:', medicalRecord._id);
    
    // If the record should be finalized, use the proper finalize method
    if (isFinalized) {
      console.log('[CREATE MEDICAL RECORD] Finalizing record and updating patient status...');
      const finalizeResult = await medicalRecord.finalize(req.user._id, req.user.role);
      
      if (!finalizeResult) {
        console.error('[CREATE MEDICAL RECORD] Failed to finalize record');
        return res.status(500).json({
          success: false,
          message: 'Medical record created but finalization failed'
        });
      }
      
      console.log('[CREATE MEDICAL RECORD] Record finalized and patient status updated successfully');
    }
    
    // Populate the patient reference for the response
    const populatedRecord = await MedicalRecord.findById(medicalRecord._id)
      .populate('patient', 'firstName lastName patientId status');
    
    res.status(201).json({
      success: true,
      message: isFinalized ? 'Medical record created and finalized successfully' : 'Medical record created successfully',
      data: populatedRecord,
      patientStatusUpdated: isFinalized
    });
  } catch (error) {
    console.error('[CREATE MEDICAL RECORD] Error creating medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const updateMedicalRecord = async (req, res) => {
  try {
    console.log('[UPDATE MEDICAL RECORD] Starting medical record update');
    console.log('[UPDATE MEDICAL RECORD] Record ID:', req.params.id);
    console.log('[UPDATE MEDICAL RECORD] Request body:', req.body);
    console.log('[UPDATE MEDICAL RECORD] User data:', req.user);
    
    const MedicalRecord = require('../models/MedicalRecord');
    
    // Get the existing record to check current status
    const existingRecord = await MedicalRecord.findById(req.params.id);
    
    if (!existingRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    
    // Check if trying to change status to Finalized
    const isBeingFinalized = req.body.status === 'Finalized' && existingRecord.status !== 'Finalized';
    
    // Prepare the update data with required fields if they're missing
    const updateData = {
      ...req.body,
      // If being finalized through update, keep current status and use proper finalize method
      status: isBeingFinalized ? existingRecord.status : req.body.status,
      lastUpdatedBy: req.user._id || req.user.userId
    };
    
    // Ensure required fields are present
    if (!updateData.doctorId) {
      updateData.doctorId = req.user._id || req.user.userId;
    }
    if (!updateData.doctorName) {
      updateData.doctorName = req.user.firstName && req.user.lastName 
        ? `${req.user.firstName} ${req.user.lastName}` 
        : req.user.email || 'Unknown Doctor';
    }
    
    console.log('[UPDATE MEDICAL RECORD] Update data with required fields:', updateData);
    console.log('[UPDATE MEDICAL RECORD] Will finalize after update:', isBeingFinalized);
    
    // Update the medical record
    const updatedRecord = await MedicalRecord.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedRecord) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found after update'
      });
    }
    
    console.log('[UPDATE MEDICAL RECORD] Medical record updated successfully with ID:', updatedRecord._id);
    
    // If the record should be finalized, use the proper finalize method
    if (isBeingFinalized) {
      console.log('[UPDATE MEDICAL RECORD] Finalizing record and updating patient status...');
      const finalizeResult = await updatedRecord.finalize(req.user._id, req.user.role);
      
      if (!finalizeResult) {
        console.error('[UPDATE MEDICAL RECORD] Failed to finalize record');
        return res.status(500).json({
          success: false,
          message: 'Medical record updated but finalization failed'
        });
      }
      
      console.log('[UPDATE MEDICAL RECORD] Record finalized and patient status updated successfully');
    }
    
    // Populate the patient reference for the response
    const populatedRecord = await MedicalRecord.findById(updatedRecord._id)
      .populate('patient', 'firstName lastName patientId status');
    
    res.json({
      success: true,
      message: isBeingFinalized ? 'Medical record updated and finalized successfully' : 'Medical record updated successfully',
      data: populatedRecord,
      patientStatusUpdated: isBeingFinalized
    });
  } catch (error) {
    console.error('[UPDATE MEDICAL RECORD] Error updating medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const deleteMedicalRecord = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Medical record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting medical record:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const getMedicalRecordsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { patient: patientId },
        { patientId: patientId }
      ]
    };

    const records = await medicalRecord.find(query)
      .populate('patient', 'firstName lastName dateOfBirth gender patientId')
      .populate('patientId', 'firstName lastName dateOfBirth gender patientId')
      .populate('doctor', 'firstName lastName')
      .populate('doctorId', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: records,
      count: records.length,
      pagination: { page, limit }
    });
  } catch (error) {
    console.error('Error fetching medical records by patient:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getmedicalRecords,
  getmedicalRecordById,
  createmedicalRecord,
  updatemedicalRecord,
  deletemedicalRecord,
  getMedicalRecordByIdOptimized,
  getMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  getMedicalRecordsByPatient
};
