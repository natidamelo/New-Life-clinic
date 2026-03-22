const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const LabTest = require('../models/LabTest');
const LabOrder = require('../models/LabOrder');
const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const { body, validationResult } = require('express-validator');

// Get all lab tests with optional filtering
router.get('/', auth, async (req, res) => {
  try {
    const { patientId, doctorId, status, testName, from, to } = req.query;
    
    // Build filter object based on query parameters
    const filter = {};
    
    if (patientId) filter.patient = patientId;
    if (doctorId) filter.doctor = doctorId;
    if (status) filter.status = status;
    if (testName) filter.testName = { $regex: testName, $options: 'i' };
    
    // Date range filtering
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    
    const labTests = await LabTest.find(filter)
      .populate('patient', 'firstName lastName')
      .populate('doctor', 'firstName lastName')
      .populate('labOrderId')
      .sort({ createdAt: -1 });
    
    res.json(labTests);
  } catch (error) {
    console.error('Error fetching lab tests:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get lab tests for a specific patient - place this route before /:id to avoid conflict
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const labTests = await LabTest.find({ patient: patientId })
      .populate('doctor', 'firstName lastName')
      .populate('labOrderId')
      .sort({ requestedDate: -1 });
    
    res.json(labTests);
  } catch (error) {
    console.error('Error fetching patient lab tests:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get lab tests ordered by a specific doctor
router.get('/doctor/:doctorId', auth, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status, from, to } = req.query;
    
    // Build filter object
    const filter = { doctor: doctorId };
    
    // Add status filter if provided
    if (status) {
      filter.status = status;
    }
    
    // Add date range filter if provided
    if (from || to) {
      filter.requestedDate = {};
      if (from) filter.requestedDate.$gte = new Date(from);
      if (to) filter.requestedDate.$lte = new Date(to);
    }
    
    const labTests = await LabTest.find(filter)
      .populate('patient', 'firstName lastName dateOfBirth')
      .populate('labOrderId')
      .sort({ requestedDate: -1 });
    
    res.json(labTests);
  } catch (error) {
    console.error('Error fetching doctor lab tests:', error);
    res.status(500).json({ message: error.message });
  }
});

  // Create a lab test result from an existing lab order
  router.post('/from-order/:orderId', [auth,
    checkRole('labtech', 'doctor', 'admin'),
  body('results', 'Test results are required').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { orderId } = req.params;
    
    // Find the lab order
    const labOrder = await LabOrder.findById(orderId)
      .populate('patientId', 'firstName lastName')
      .populate('orderingDoctorId', 'firstName lastName');
    
    if (!labOrder) {
      return res.status(404).json({ message: 'Lab order not found' });
    }
    
    // Check if a lab test already exists for this order
    const existingTest = await LabTest.findOne({ labOrderId: orderId });
    
    if (existingTest) {
      return res.status(400).json({ 
        message: 'A lab test result already exists for this order',
        labTestId: existingTest._id
      });
    }
    
    // Create new lab test with the lab order information
    const newLabTest = new LabTest({
      patient: labOrder.patientId._id,
      doctor: labOrder.orderingDoctorId._id,
      labOrderId: labOrder._id,
      testName: labOrder.testName,
      testType: req.body.testType || mapTestTypeFromName(labOrder.testName),
      status: 'Completed',
      results: req.body.results,
      notes: req.body.notes || labOrder.notes,
      requestedDate: labOrder.orderDateTime,
      completedDate: new Date(),
      priority: labOrder.priority
    });
    
    const savedLabTest = await newLabTest.save();
    
    // Update the lab order status
    labOrder.status = 'Results Available';
    labOrder.resultDateTime = new Date();
    await labOrder.save();
    
    // Deduct inventory for the completed lab test
    // ✅ FIX: Use atomic locking in the service - no manual checks needed
    try {
      const labInventoryService = require('../services/labInventoryService');
      const inventoryTransaction = await labInventoryService.consumeInventoryForLabOrder(labOrder, req.user._id);
      
      if (inventoryTransaction && inventoryTransaction.success) {
        console.log(`✅ Inventory deducted for lab test: ${labOrder.testName}`);
        console.log(`   Item: ${inventoryTransaction.itemName}`);
        console.log(`   Quantity consumed: ${inventoryTransaction.quantityConsumed}`);
        // Note: inventoryDeducted flag is set atomically in the service
      } else if (inventoryTransaction && inventoryTransaction.skipped) {
        console.log(`⏭️ Inventory deduction skipped: ${inventoryTransaction.reason}`);
      } else {
        console.log(`ℹ️ No inventory mapping found for lab test: ${labOrder.testName}`);
      }
    } catch (inventoryError) {
      console.error('Error deducting inventory for lab test:', inventoryError);
      // Don't fail the lab test completion if inventory deduction fails
      // The lab test is still valid, just log the error
    }
    
    // Add entry to patient's medical record
    const historyEntry = new MedicalRecord({
      patient: labOrder.patient,
      primaryProvider: labOrder.doctor,
      chiefComplaint: 'Lab test results',
      labResults: [{
        test: labOrder.labTest,
        performedBy: req.user.id,
        orderedBy: labOrder.doctor,
        performedAt: new Date(),
        results: req.body.results,
        interpretation: req.body.interpretation || '',
        notes: req.body.notes || '',
        status: 'Completed'
      }],
      status: 'Draft',
      createdBy: req.user.id,
      lastUpdatedBy: req.user.id
    });
    
    await historyEntry.save();
    
    return res.status(201).json({
      success: true,
      message: 'Lab test result created successfully',
      labTest: savedLabTest
    });
  } catch (error) {
    console.error('Error creating lab test from order:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

  // Bulk update lab tests
  router.post('/bulk-update', [auth,
    checkRole('labtech', 'doctor', 'admin'),
  body('testIds', 'Test IDs are required').isArray().notEmpty(),
  body('update', 'Update data is required').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { testIds, update } = req.body;
    
    // Don't allow changing critical fields in bulk update
    delete update.patient;
    delete update.doctor;
    delete update.labOrderId;
    
    // If updating to completed status, set completedDate if not provided
    if (update.status === 'Completed' && !update.completedDate) {
      update.completedDate = new Date();
    }
    
    // Update all tests
    const result = await LabTest.updateMany(
      { _id: { $in: testIds } },
      { $set: update }
    );
    
    // If status is being updated to Completed, deduct inventory for each test
    if (update.status === 'Completed') {
      try {
        const inventoryDeductionService = require('../services/inventoryDeductionService');
        const LabOrder = require('../models/LabOrder');
        
        // Get all the updated lab tests to find their lab orders
        const updatedTests = await LabTest.find({ _id: { $in: testIds } });
        
        for (const labTest of updatedTests) {
          if (labTest.labOrderId) {
            const labOrder = await LabOrder.findById(labTest.labOrderId);
            if (labOrder) {
              console.log(`🔬 Processing inventory deduction for lab test: ${labOrder.testName}`);
              
              const inventoryResult = await inventoryDeductionService.deductLabInventory(labOrder, req.user._id);
              
              if (inventoryResult && inventoryResult.success) {
                console.log(`✅ Inventory deducted successfully for ${labOrder.testName}:`);
                console.log(`   Item: ${inventoryResult.itemName}`);
                console.log(`   Quantity consumed: ${inventoryResult.quantityConsumed}`);
                console.log(`   New quantity: ${inventoryResult.newQuantity}`);
              } else {
                console.log(`⚠️ No inventory deduction for ${labOrder.testName} - no mapping found or insufficient stock`);
              }
            }
          }
        }
      } catch (inventoryError) {
        console.error('❌ Error deducting inventory for bulk lab test completion:', inventoryError);
        // Don't fail the bulk update if inventory deduction fails
      }
    }
    
    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} of ${testIds.length} lab tests`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error during bulk update of lab tests:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Get a single lab test by ID - place this after more specific routes
router.get('/:id', auth, async (req, res) => {
  try {
    const labTest = await LabTest.findById(req.params.id)
      .populate('patient', 'firstName lastName dateOfBirth')
      .populate('doctor', 'firstName lastName')
      .populate('labOrderId');
    
    if (!labTest) {
      return res.status(404).json({ message: 'Lab test not found' });
    }
    
    res.json(labTest);
  } catch (error) {
    console.error('Error fetching lab test:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Lab test not found' });
    }
    res.status(500).json({ message: error.message });
  }
});

  // Create a new lab test
  router.post('/', [auth,
    checkRole('doctor', 'nurse', 'labtech', 'admin'),
  body('patient', 'Patient ID is required').not().isEmpty().isMongoId(),
  body('testName', 'Test name is required').not().isEmpty(),
  body('testType', 'Test type is required').not().isEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    // Verify patient exists
    const patient = await Patient.findById(req.body.patient);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    const newLabTest = new LabTest({
      patient: req.body.patient,
      doctor: req.body.doctor || req.user.id, // Use provided doctor or requester
      labOrderId: req.body.labOrderId,
      testName: req.body.testName,
      testType: req.body.testType,
      status: req.body.status || 'Pending',
      results: req.body.results || {},
      notes: req.body.notes,
      requestedDate: req.body.requestedDate || new Date(),
      completedDate: req.body.completedDate,
      priority: req.body.priority || 'Routine'
    });
    
    const labTest = await newLabTest.save();
    
    res.status(201).json(labTest);
  } catch (error) {
    console.error('Error creating lab test:', error);
    res.status(400).json({ message: error.message });
  }
});

  // Update a lab test
  router.put('/:id', [auth,
    checkRole('doctor', 'nurse', 'labtech', 'admin'),
  body('status').optional().isIn(['Pending', 'In Progress', 'Completed', 'Cancelled']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const updateData = { ...req.body };
    
    // If status is being updated to completed and no completedDate is provided, set it
    if (updateData.status === 'Completed' && !updateData.completedDate) {
      updateData.completedDate = new Date();
    }
    
    const labTest = await LabTest.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('patient', 'firstName lastName')
     .populate('doctor', 'firstName lastName');
    
    if (!labTest) {
      return res.status(404).json({ message: 'Lab test not found' });
    }
    
    // If results are being added/updated and status isn't already Completed, set to Completed
    if (updateData.results && labTest.status !== 'Completed') {
      labTest.status = 'Completed';
      labTest.completedDate = new Date();
      await labTest.save();
      
      // Deduct inventory for the newly completed lab test
      try {
        const inventoryDeductionService = require('../services/inventoryDeductionService');
        const LabOrder = require('../models/LabOrder');
        
        if (labTest.labOrderId) {
          const labOrder = await LabOrder.findById(labTest.labOrderId);
          if (labOrder) {
            // ✅ FIX: Use atomic locking in the service - no manual checks needed
            console.log(`🔬 Processing inventory deduction for lab test: ${labOrder.testName}`);
            
            const inventoryResult = await inventoryDeductionService.deductLabInventory(labOrder, req.user._id);
            
            if (inventoryResult && inventoryResult.success) {
              console.log(`✅ Inventory deducted successfully for ${labOrder.testName}:`);
              console.log(`   Item: ${inventoryResult.itemName}`);
              console.log(`   Quantity consumed: ${inventoryResult.quantityConsumed}`);
              console.log(`   New quantity: ${inventoryResult.newQuantity}`);
              // Note: inventoryDeducted flag is set atomically in the service
            } else if (inventoryResult && inventoryResult.skipped) {
              console.log(`⏭️ Inventory deduction skipped: ${inventoryResult.reason}`);
            } else {
              console.log(`⚠️ No inventory deduction for ${labOrder.testName} - no mapping found or insufficient stock`);
            }
          }
        }
      } catch (inventoryError) {
        console.error('❌ Error deducting inventory for lab test completion:', inventoryError);
        // Don't fail the lab test completion if inventory deduction fails
      }
    }
    
    res.json(labTest);
  } catch (error) {
    console.error('Error updating lab test:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Lab test not found' });
    }
    res.status(400).json({ message: error.message });
  }
});

  // Delete a lab test
  router.delete('/:id', [auth, 
    checkRole('admin')
], async (req, res) => {
  try {
    const labTest = await LabTest.findById(req.params.id);
    
    if (!labTest) {
      return res.status(404).json({ message: 'Lab test not found' });
    }
    
    // Instead of actually deleting, you can flag it as cancelled if needed
    // Otherwise, perform actual deletion:
    await LabTest.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Lab test removed successfully' });
  } catch (error) {
    console.error('Error deleting lab test:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Lab test not found' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Helper function to map test name to test type
function mapTestTypeFromName(testName) {
  const testNameLower = testName.toLowerCase();
  
  if (/blood|cbc|hemoglobin|hematocrit|wbc|rbc/.test(testNameLower)) {
    return 'Hematology';
  } else if (/glucose|cholesterol|lipid|liver|kidney|bmp|cmp/.test(testNameLower)) {
    return 'Chemistry';
  } else if (/urine|urinalysis/.test(testNameLower)) {
    return 'Urinalysis';
  } else if (/culture|bacteria|viral|pcr/.test(testNameLower)) {
    return 'Microbiology';
  } else if (/x-ray|ct|mri|ultrasound|imaging/.test(testNameLower)) {
    return 'Imaging';
  } else {
    return 'Other';
  }
}

module.exports = router; 
