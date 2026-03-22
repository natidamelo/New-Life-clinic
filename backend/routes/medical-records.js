const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const MedicalRecord = require('../models/MedicalRecord');

// @desc    Create a new medical record
// @route   POST /api/medical-records
// @access  Private (Doctor)
router.post('/', protect, asyncHandler(async (req, res) => {
  const { patientId, chiefComplaint, diagnosis, treatment, notes } = req.body;
  
  // Get current doctor info
  const doctorId = req.user.id;
  const doctorName = req.user.username || req.user.firstName + ' ' + req.user.lastName;
  
  const medicalRecord = await MedicalRecord.create({
    patientId,
    doctorId,
    doctorName,
    chiefComplaint,
    diagnosis,
    treatment,
    notes,
    visitDate: new Date()
  });

  res.status(201).json({
    success: true,
    data: medicalRecord
  });
}));

// @desc    Create a draft medical record
// @route   POST /api/medical-records/draft
// @access  Private (Doctor)
router.post('/draft', protect, asyncHandler(async (req, res) => {
  try {
    console.log('📝 [DRAFT] Creating draft medical record with data:', req.body);
    
    const {
      patient,
      doctor,
      status = 'Draft',
      chiefComplaint,
      physicalExamination,
      vitalSigns,
      assessment,
      diagnosis,
      plan,
      treatmentPlan,
      followUpPlan,
      historyOfPresentIllness,
      createdBy
    } = req.body;

    // Get current doctor info
    const doctorId = req.user.id;
    const doctorName = req.user.username || req.user.firstName + ' ' + req.user.lastName;

    // Create the medical record with all the provided data
    const medicalRecord = await MedicalRecord.create({
      patient: patient,
      doctor: doctor || doctorId,
      doctorName: doctorName,
      status: status,
      chiefComplaint: chiefComplaint || { description: 'Medical consultation' },
      physicalExamination: physicalExamination || {},
      vitalSigns: vitalSigns || {},
      assessment: assessment || {},
      diagnosis: diagnosis || assessment?.primaryDiagnosis || '',
      plan: plan || treatmentPlan || assessment?.plan || '',
      treatmentPlan: treatmentPlan || assessment?.plan || '',
      followUpPlan: followUpPlan || {},
      historyOfPresentIllness: historyOfPresentIllness || '',
      createdBy: createdBy || doctorId,
      visitDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ [DRAFT] Medical record created successfully:', medicalRecord._id);

    res.status(201).json({
      success: true,
      data: medicalRecord,
      message: 'Draft medical record created successfully'
    });
  } catch (error) {
    console.error('❌ [DRAFT] Error creating draft medical record:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create draft medical record'
    });
  }
}));

// @desc    Get medical records for a patient
// @route   GET /api/medical-records/patient/:patientId
// @access  Private (Doctor)
router.get('/patient/:patientId', protect, asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { limit = 20 } = req.query;
  
  const medicalRecords = await MedicalRecord.find({ patient: patientId })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .lean();

  res.json({
    success: true,
    data: medicalRecords
  });
}));

// @desc    Get a specific medical record by ID
// @route   GET /api/medical-records/:id
// @access  Private (Doctor)
router.get('/:id', protect, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const medicalRecord = await MedicalRecord.findById(id);
  
  if (!medicalRecord) {
    return res.status(404).json({
      success: false,
      message: 'Medical record not found'
    });
  }

  res.json({
    success: true,
    data: medicalRecord
  });
}));

// @desc    Update a medical record
// @route   PUT /api/medical-records/:id
// @access  Private (Doctor)
router.put('/:id', protect, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const medicalRecord = await MedicalRecord.findByIdAndUpdate(
    id,
    { ...updateData, updatedAt: new Date() },
    { new: true, runValidators: true }
  );
  
  if (!medicalRecord) {
    return res.status(404).json({
      success: false,
      message: 'Medical record not found'
    });
  }

  res.json({
    success: true,
    data: medicalRecord
  });
}));

// @desc    Finalize a medical record
// @route   POST /api/medical-records/:id/finalize
// @access  Private (Doctor)
router.post('/:id/finalize', protect, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const medicalRecord = await MedicalRecord.findById(id);
  
  if (!medicalRecord) {
    return res.status(404).json({
      success: false,
      message: 'Medical record not found'
    });
  }

  // Use the finalize method from the model
  await medicalRecord.finalize();
  
  res.json({
    success: true,
    data: medicalRecord,
    message: 'Medical record finalized successfully'
  });
}));

// @desc    Get all medical records (for admin)
// @route   GET /api/medical-records
// @access  Private (Admin)
router.get('/', protect, asyncHandler(async (req, res) => {
  const medicalRecords = await MedicalRecord.find({})
    .populate('patient', 'firstName lastName patientId')
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: medicalRecords
  });
}));

module.exports = router;