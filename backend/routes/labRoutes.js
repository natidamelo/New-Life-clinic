const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');

// Import necessary models used within the routes
const LabOrder = require('../models/LabOrder');
const LabServiceResult = require('../models/LabServiceResult');
const Notification = require('../models/Notification');
const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const LabTest = require('../models/LabTest');
const MedicalRecordService = require('../services/MedicalRecordService');

// Import patient ID utilities
const { safeFindPatient, findPatientsByIds } = require('../utils/patientIdUtils');

// Helper function to categorize lab tests
function getCategoryFromTestName(testName) {
  if (!testName) return "General";
  
  const testNameLower = testName.toLowerCase();
  
  if (/blood|cbc|hematology|hemoglobin|wbc|rbc|platelet/.test(testNameLower)) {
    return "Hematology";
  } else if (/glucose|cholesterol|lipid|liver|kidney|bmp|cmp|creatinine|urea|sodium|potassium/.test(testNameLower)) {
    return "Chemistry";
  } else if (/urine|urinalysis/.test(testNameLower)) {
    return "Urinalysis";
  } else if (/culture|bacteria|viral|pcr|covid|malaria/.test(testNameLower)) {
    return "Microbiology";
  } else if (/stool|fecal|parasite|ova/.test(testNameLower)) {
    return "Parasitology";
  } else if (/hcg|pregnancy|beta.*hcg|human chorionic gonadotropin/.test(testNameLower)) {
    return "Hormone/Pregnancy";
  } else if (/thyroid|tsh|t3|t4|hormone|testosterone|estrogen|prolactin|cortisol|insulin/.test(testNameLower)) {
    return "Endocrinology";
  } else if (/hepatitis|hiv|aids|vdrl|syphilis|antibody|antigen/.test(testNameLower)) {
    return "Serology/Immunology";
  } else {
    return "General";
  }
}

function convertToStandardFormat(input) {
  // Implement a basic conversion logic
  if (!input) return null;
  
  // If input is already an object with standard properties, return it
  if (typeof input === 'object' && input.testName) return input;
  
  // If input is a string, convert to a standard object
  return {
    testName: String(input),
    price: 0, // Default price
    metadata: {} // Empty metadata
  };
}

// Route Definitions Start Here

// Add a new route for sending lab results to doctors

/**
 * @route POST /api/send-to-doctor
 * @desc Send lab results to doctor and update database to reflect this
 * @access Private (Lab staff)
 */
router.post('/send-to-doctor', auth, async (req, res) => {
  try {
    const { testIds, patientId, doctorId } = req.body;
    
    if (!testIds || !Array.isArray(testIds) || testIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Test IDs are required and must be an array' 
      });
    }
    
    if (!patientId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Patient ID is required' 
      });
    }
    
    console.log(`Sending ${testIds.length} test results to doctor for patient ${patientId}`);
    
    // 1. Find the lab orders to send - check both LabTest and LabOrder collections
    const labOrders = await LabOrder.find({ 
      _id: { $in: testIds },
      patientId: patientId 
    }).populate('orderingDoctorId');
    
    // Also check LabTest collection for any test IDs that weren't found in LabOrder
    const labTests = await LabTest.find({
      _id: { $in: testIds },
      patient: patientId
    }).populate('doctor');
    
    // Combine both results
    const allTests = [...labOrders, ...labTests];
    
    if (allTests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matching lab orders or tests found'
      });
    }
    
    console.log(`Found ${labOrders.length} LabOrders and ${labTests.length} LabTests`);
    
    // 2. Determine which doctor to send to
    let targetDoctorId = doctorId;
    
    if (!targetDoctorId) {
      // Try to get doctor from LabOrder
      if (labOrders.length > 0 && labOrders[0].orderingDoctorId) {
        targetDoctorId = labOrders[0].orderingDoctorId._id || labOrders[0].orderingDoctorId;
      }
      // If no LabOrder, try to get doctor from LabTest
      else if (labTests.length > 0 && labTests[0].doctor) {
        targetDoctorId = labTests[0].doctor._id || labTests[0].doctor;
      }
    }
    
    console.log(`Send to doctor debug: doctorId=${doctorId}, targetDoctorId=${targetDoctorId}`);
    
    if (!targetDoctorId) {
      return res.status(400).json({
        success: false,
        message: 'No doctor ID provided and no ordering doctor found in lab order/test'
      });
    }
    
    // 3. Update each lab order and lab test to mark them as sent
    const sentAt = new Date();
    
    // Update LabOrders
    const labOrderUpdatePromises = labOrders.map(order => {
      return LabOrder.findByIdAndUpdate(
        order._id,
        { 
          $set: { 
            sentToDoctor: true,
            sentToDoctorAt: sentAt,
            sentToDoctorBy: req.user._id,
            sentToDoctorId: targetDoctorId,
            status: 'Results Available' // Update status to make it clear results are available
          } 
        },
        { new: true }
      );
    });
    
    // Update LabTests
    const labTestUpdatePromises = labTests.map(test => {
      return LabTest.findByIdAndUpdate(
        test._id,
        {
          $set: {
            sentToDoctor: true,
            sentToDoctorAt: sentAt,
            sentToDoctorBy: req.user._id,
            sentToDoctorId: targetDoctorId,
            status: 'Completed'
          }
        },
        { new: true }
      );
    });
    
    const updatedOrders = await Promise.all([...labOrderUpdatePromises, ...labTestUpdatePromises]);
    console.log(`Successfully updated ${labOrders.length} LabOrders and ${labTests.length} LabTests with sentToDoctor=true`);
    
    // 3.5. Deduct inventory for each completed lab test
    try {
      const inventoryDeductionService = require('../services/inventoryDeductionService');
      
      for (const test of updatedOrders) {
        if (!test) continue;
        
        const testName = test.testName || test.test;
        if (testName) {
          console.log(`🔬 Processing test ${test._id} for inventory deduction...`);
          
          // ✅ CRITICAL FIX: Properly handle LabTest vs LabOrder
          // If this is a LabTest, we need to get the associated LabOrder for inventory deduction
          let labOrderForInventory = null;
          
          // Check if this is a LabTest (has labOrderId field) or LabOrder (has inventoryDeducted field)
          if (test.labOrderId) {
            // This is a LabTest - get the associated LabOrder
            console.log(`🔬 Test ${test._id} is a LabTest, fetching associated LabOrder ${test.labOrderId}`);
            labOrderForInventory = await LabOrder.findById(test.labOrderId);
            
            if (!labOrderForInventory) {
              console.log(`⚠️ No LabOrder found with ID ${test.labOrderId} for LabTest ${test._id}`);
              continue;
            }
          } else if (test.inventoryDeducted !== undefined) {
            // This is a LabOrder - use it directly
            console.log(`🔬 Test ${test._id} is a LabOrder, using it directly`);
            labOrderForInventory = test;
          } else {
            console.log(`⚠️ Test ${test._id} is neither LabTest nor LabOrder, skipping inventory deduction`);
            continue;
          }
          
          // ✅ FIX: Use atomic locking in the service - no manual checks needed
          console.log(`🔬 [ENABLED] Lab inventory deduction for test: ${testName}`);
          
          // ✅ ENABLED: Lab inventory deduction with proper double-deduction prevention (atomic locking)
          const inventoryResult = await inventoryDeductionService.deductLabInventory(labOrderForInventory, req.user._id);
          
          if (inventoryResult && inventoryResult.success) {
            console.log(`✅ Inventory deducted successfully for ${testName}:`);
            console.log(`   Item: ${inventoryResult.itemName}`);
            console.log(`   Quantity consumed: ${inventoryResult.quantityConsumed}`);
            console.log(`   New quantity: ${inventoryResult.newQuantity}`);
            
            // Note: inventoryDeducted flag is now set atomically in the service
            console.log(`✅ Inventory deduction completed for lab order ${labOrderForInventory._id}`);
          } else {
            console.log(`⚠️ No inventory deduction for ${testName} - no mapping found or insufficient stock`);
          }
        }
      }
    } catch (inventoryError) {
      console.error('❌ Error deducting inventory for lab tests:', inventoryError);
      // Don't fail the send-to-doctor process if inventory deduction fails
    }
    
    // 4. Create notification for the doctor
    // Ensure we have a valid senderId from the authenticated user
          if (!req.user || !req.user._id) {
      console.warn('Missing user ID in request. Using a placeholder ID for notification.');
    }
    
    const notification = new Notification({
      title: `Lab results available for patient`,
      message: `${allTests.length} lab test results are available for patient ${patientId}`,
      type: 'lab_result_ready',
              senderId: req.user?._id || new mongoose.Types.ObjectId(), // Use req.user._id or generate a placeholder
      senderRole: 'lab',
      recipientId: targetDoctorId,
      recipientRole: 'doctor',
      data: {
        patientId,
        labOrders: testIds,
        sentAt
      },
      read: false
    });
    
    await notification.save();
    console.log(`Created notification ${notification._id} for doctor ${targetDoctorId}`);
    
    // 5. Add entry to patient's medical history
    try {
      const patient = await Patient.findById(patientId);
      if (patient) {
        // Create a simpler medical record entry that avoids validation issues
    const medicalHistoryEntry = new MedicalRecord({
          patient: patientId,
          doctor: targetDoctorId,
          visitDate: new Date(),
      chiefComplaint: 'Lab test results received',
          historyOfPresentIllness: 'Lab results received and reviewed',
          diagnosis: 'Pending review of lab results',
          plan: 'Lab results sent to doctor for review',
          createdBy: req.user?.id || new mongoose.Types.ObjectId(), // Ensure createdBy is set
          status: 'Draft',
          // Skip adding to labResults array since it requires specific LabTest references
          // We'll just note it in the medical record text fields
    });
    
    await medicalHistoryEntry.save();
        console.log(`Added medical history entry for lab results: ${medicalHistoryEntry._id}`);
      } else {
        console.warn(`Patient ${patientId} not found for medical history entry`);
      }
    } catch (medicalRecordError) {
      console.error('Error creating medical record for lab results:', medicalRecordError);
      // Continue with the response even if medical record creation fails
    }
    
    // 6. Create or update entries in the LabTest collection for better tracking
    try {
      for (const order of labOrders) {
        // Check if a LabTest already exists for this order
        let labTest = await LabTest.findOne({ labOrderId: order._id });
        
        if (!labTest && order.results) {
          // Create a new LabTest if it doesn't exist but we have results
          labTest = new LabTest({
            patient: patientId,
            doctor: targetDoctorId,
            labOrderId: order._id,
            testName: order.testName,
            testType: order.specimenType === 'Blood' ? 'Blood Test' : 
                     order.specimenType === 'Urine' ? 'Urine Test' :
                     order.specimenType === 'Stool' ? 'Stool Test' : 'Other',
            status: 'Completed',
            results: order.results,
            notes: order.notes,
            requestedDate: order.orderDateTime,
            completedDate: order.resultDateTime || sentAt,
            priority: order.priority
          });
          
          await labTest.save();
          console.log(`Created new LabTest entry for order ${order._id}`);
        } else if (labTest) {
          // Update existing LabTest with sentToDoctor status
          labTest.status = 'Completed';
          
          // Add a note about being sent to doctor if not already there
          if (labTest.notes) {
            if (!labTest.notes.includes('Sent to doctor')) {
              labTest.notes += ` | Sent to doctor on ${sentAt.toISOString().split('T')[0]}.`;
            }
          } else {
            labTest.notes = `Sent to doctor on ${sentAt.toISOString().split('T')[0]}.`;
          }
          
          await labTest.save();
          console.log(`Updated existing LabTest ${labTest._id} for order ${order._id}`);
        }
      }
    } catch (labTestError) {
      console.error('Error updating LabTest records:', labTestError);
      // Continue with the response even if LabTest updates fail
    }
    
    return res.status(200).json({
      success: true,
      message: `Lab results successfully sent to doctor`,
      sentAt: sentAt,
      tests: updatedOrders.map(order => ({
        id: order._id,
        status: 'sent'
      }))
    });
    
  } catch (error) {
    console.error('Error sending lab results to doctor:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error sending lab results',
      error: error.message
    });
  }
});

/**
 * @route GET /api/patient/:patientId
 * @desc Get all lab results for a specific patient
 * @access Private (Doctor, Lab)
 */
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }
    
    console.log(`Fetching lab tests for patient ${patientId}`);
    
    // Get completed lab tests for this patient from the LabTest collection
    const labTests = await LabTest.find({
      patient: patientId,
      // Optionally filter by status if needed, e.g., status: 'Completed'
    })
    .populate('patient', 'firstName lastName') // Populate patient details
    .populate('doctor', 'firstName lastName') // Populate ordering doctor details
    .populate('labOrderId', 'orderDateTime') // Populate lab order details if needed (e.g., order date)
    .sort({ completedDate: -1 }); // Sort by completion date
    
    // If no tests found, try to find lab orders that might have results
    if (!labTests || labTests.length === 0) {
      console.log(`No lab tests found for patient ${patientId}. Checking for lab orders with results...`);
      
      // Try to find lab orders for this patient that might have results
      const labOrders = await LabOrder.find({ 
        patientId: patientId,
        status: { $in: ['Completed', 'Results Available'] }
      }).populate('orderingDoctorId', 'firstName lastName');
      
      if (labOrders && labOrders.length > 0) {
        console.log(`Found ${labOrders.length} completed lab orders for patient ${patientId}`);
        
        // Format lab orders as results
        const orderResults = labOrders.map(order => ({
          id: order._id,
          _id: order._id,
          testName: order.testName,
          category: getCategoryFromTestName(order.testName),
          patientId: patientId,
          patientName: order.patientName || 'Unknown Patient',
          orderedBy: order.orderingDoctorId ? `Dr. ${order.orderingDoctorId.firstName} ${order.orderingDoctorId.lastName}` : 'Unknown Doctor',
          orderDate: order.orderDateTime,
          resultDate: order.resultDateTime || order.orderDateTime,
          results: order.results || {},
          notes: order.notes || '',
          status: order.status,
          priority: order.priority,
          isFromLabOrder: true
        }));
        
        return res.status(200).json(orderResults);
      }
      
      // If still no results, return empty array instead of mock data
      console.log(`No lab tests or completed lab orders found for patient ${patientId}. Returning empty array.`);
      return res.status(200).json([]);
    }
    
    // Additional check: if patient doesn't exist, return empty array
    const patientExists = await Patient.findById(patientId);
    if (!patientExists) {
      console.log(`Patient ${patientId} does not exist in database. Returning empty array.`);
      return res.status(200).json([]);
    }
    
    console.log(`Found ${labTests.length} lab tests for patient ${patientId}`);
    
    // Format the results based on LabTest schema for the frontend
    const formattedResults = labTests.map(test => ({
      id: test._id, // Use LabTest ID
      _id: test._id, // Include _id for standardization function
      testName: test.testName,
      category: getCategoryFromTestName(test.testName), // Use helper function
      patientId: test.patient?.patientId || test.patient?._id,
      patientName: test.patient ? `${test.patient.firstName} ${test.patient.lastName}` : 'Unknown Patient',
      orderedBy: test.doctor ? `Dr. ${test.doctor.firstName} ${test.doctor.lastName}` : 'Unknown Doctor',
      orderDate: test.labOrderId?.orderDateTime || test.requestedDate, // Use order date from LabOrder if available, else requestedDate
      resultDate: test.completedDate,
      results: test.results, // The actual results Map
      notes: test.notes,
      status: test.status,
      priority: test.priority,
    }));
    
    return res.status(200).json(formattedResults);
  } catch (error) {
    console.error('Error fetching patient lab results:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching lab results',
      error: error.message
    });
  }
});

// Validation function for detailed lab results
function validateLabResultsStructure(results, testCategory) {
  // Specific validation for different test types
  switch(testCategory) {
    case 'Stool':
      return results && 
             results.consistency && 
             results.color && 
             results.occultBlood !== undefined && 
             results.helicobacterPyloriAntigen !== undefined;
    
    case 'Urine':
      return results && 
             results.color && 
             results.appearance && 
             results.pH && 
             results.protein && 
             results.leukocytes !== undefined;
    
    case 'Blood':
      return results && 
             results.hemoglobin && 
             results.whiteBloodCells && 
             results.redBloodCells && 
             results.platelets;
    
    default:
      // For other test types, allow more flexible validation
      return results && Object.keys(results).length > 0;
  }
}

// Enhanced lab result submission route
router.post('/submit-results', async (req, res) => {
  try {
    const { 
      labOrderId, 
      results, 
      normalRange, 
      interpretation, 
      notes, 
      testCategory 
    } = req.body;

    // Validate input
    if (!labOrderId || !results) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Lab Order ID and Results are required' 
      });
    }

    // Validate results structure based on test category
    if (!validateLabResultsStructure(results, testCategory)) {
      return res.status(400).json({ 
        status: 'error', 
        message: `Invalid results structure for ${testCategory} test` 
      });
    }

    // Find the lab order
    const labOrder = await LabOrder.findById(labOrderId);
    if (!labOrder) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Lab Order not found' 
      });
    }

    // Prepare detailed lab result
    const labResult = {
      test: labOrder.test,
      orderedBy: labOrder.orderedBy,
      performedBy: req.user._id, // Current logged-in user
      orderedAt: labOrder.createdAt,
      performedAt: new Date(),
      results: results,
      normalRange: normalRange || 'Not specified',
      interpretation: interpretation || 'Inconclusive',
      notes: notes || '',
      status: 'Completed',
      testTypeDetails: {
        category: testCategory,
        // Any additional metadata about the test
        performedLocation: req.body.performedLocation || 'Lab',
        equipmentUsed: req.body.equipmentUsed
      }
    };

    // Save the lab result to the LabTest collection and update LabOrder
    const patient = await Patient.findById(labOrder.patient);
    if (!patient) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'Patient not found' 
      });
    }

    // Update lab order with results
    labOrder.results = results;
    labOrder.normalRange = normalRange;
    labOrder.notes = notes || labOrder.notes;
    labOrder.status = 'Results Available';
    labOrder.resultDateTime = new Date();
    await labOrder.save();

    // Create or update LabTest entry
    let labTest = await LabTest.findOne({ labOrderId: labOrder._id });
    if (!labTest) {
      // Create new LabTest entry
      labTest = new LabTest({
        patient: patient._id,
        doctor: labOrder.orderingDoctorId,
        labOrderId: labOrder._id,
        testName: labOrder.testName,
        testType: labOrder.specimenType === 'Blood' ? 'Blood Test' : 
                 labOrder.specimenType === 'Urine' ? 'Urine Test' :
                 labOrder.specimenType === 'Stool' ? 'Stool Test' : 'Other',
        status: 'Completed',
        results: results,
        notes: notes,
        requestedDate: labOrder.orderDateTime,
        completedDate: new Date(),
        priority: labOrder.priority
      });
    } else {
      // Update existing LabTest entry
      labTest.results = results;
      labTest.notes = notes || labTest.notes;
      labTest.status = 'Completed';
      labTest.completedDate = new Date();
    }
    
    await labTest.save();

    // Deduct inventory for the completed lab test
    // ✅ FIX: Use atomic locking in the service - no manual checks needed
    try {
      const inventoryDeductionService = require('../services/inventoryDeductionService');
      
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
    } catch (inventoryError) {
      console.error('❌ Error deducting inventory for lab test:', inventoryError);
      // Don't fail the lab test completion if inventory deduction fails
    }

    // Notify the ordering doctor
    await createNotification({
      recipient: labOrder.orderedBy,
      type: 'LAB_RESULT_COMPLETED',
      message: `Lab result for ${patient.firstName} ${patient.lastName} is now available`,
      relatedDocument: {
        type: 'LabOrder',
        id: labOrderId
      }
    });

    res.status(201).json({ 
      status: 'success', 
      message: 'Lab results submitted successfully',
      labResult: labResult 
    });

  } catch (error) {
    console.error('Error submitting lab results:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to submit lab results',
      error: error.message 
    });
  }
});

/**
 * @route GET /api/lab-results/test/:patientId
 * @desc Get test lab results for demo purposes
 * @access Public
 */
router.get('/test/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Create sample lab test results
    const sampleTests = [
      {
        _id: "test_cbc_" + Date.now(),
        testName: "Complete Blood Count (CBC)",
        category: "Hematology",
        patientId: patientId,
        patientName: "Test Patient",
        orderedBy: "Dr. Sample Doctor",
        orderDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        resultDate: new Date().toISOString(),
        results: {
          "WBC": { value: "7.2", unit: "x10^9/L", normalRange: "4.0 - 11.0" },
          "RBC": { value: "4.8", unit: "x10^12/L", normalRange: "4.5 - 5.5" },
          "Hemoglobin": { value: "14.2", unit: "g/dL", normalRange: "13.5 - 17.5" },
          "Hematocrit": { value: "42", unit: "%", normalRange: "41 - 50" },
          "Platelets": { value: "250", unit: "x10^9/L", normalRange: "150 - 450" }
        },
        notes: "Patient displays normal blood count values.",
        status: "Completed",
        priority: "Routine"
      },
      {
        _id: "test_cmp_" + Date.now(),
        testName: "Comprehensive Metabolic Panel",
        category: "Chemistry",
        patientId: patientId,
        patientName: "Test Patient",
        orderedBy: "Dr. Sample Doctor",
        orderDate: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
        resultDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        results: {
          "Glucose": { value: "92", unit: "mg/dL", normalRange: "70-99" },
          "BUN": { value: "15", unit: "mg/dL", normalRange: "7-20" },
          "Creatinine": { value: "0.9", unit: "mg/dL", normalRange: "0.6-1.2" },
          "Sodium": { value: "140", unit: "mmol/L", normalRange: "135-145" },
          "Potassium": { value: "4.0", unit: "mmol/L", normalRange: "3.5-5.0" },
          "Chloride": { value: "101", unit: "mmol/L", normalRange: "98-107" },
          "CO2": { value: "24", unit: "mmol/L", normalRange: "22-29" },
          "Calcium": { value: "9.5", unit: "mg/dL", normalRange: "8.5-10.5" }
        },
        notes: "Patient's metabolic panel is within normal limits.",
        status: "Completed",
        priority: "Routine"
      },
      {
        _id: "test_lipid_" + Date.now(),
        testName: "Lipid Panel",
        category: "Chemistry",
        patientId: patientId,
        patientName: "Test Patient",
        orderedBy: "Dr. Sample Doctor",
        orderDate: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
        resultDate: new Date(Date.now() - 86400000 * 6).toISOString(), // 6 days ago
        results: {
          "Total Cholesterol": { value: "195", unit: "mg/dL", normalRange: "Less than 200" },
          "HDL": { value: "55", unit: "mg/dL", normalRange: "Greater than 40" },
          "LDL": { value: "110", unit: "mg/dL", normalRange: "Less than 100" },
          "Triglycerides": { value: "150", unit: "mg/dL", normalRange: "Less than 150" }
        },
        notes: "Borderline high LDL. Recommend lifestyle modifications.",
        status: "Completed",
        priority: "Routine"
      }
    ];
    
    return res.status(200).json(sampleTests);
  } catch (error) {
    console.error('Error generating test lab results:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error generating test lab results',
      error: error.message
    });
  }
});

/**
 * @route GET /api/lab-results/doctor/:doctorId
 * @desc Get all lab results sent to a specific doctor OR ordered by the doctor
 * @access Private (Doctor only)
 */
router.get('/doctor/:doctorId', auth, async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID is required'
      });
    }
    
    console.log(`Getting lab results for doctor: ${doctorId}`);
    
    // Convert doctorId to ObjectId for proper comparison
    let doctorObjectId;
    try {
      doctorObjectId = new mongoose.Types.ObjectId(doctorId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID format'
      });
    }
    
    // Legacy compatibility:
    // Older lab orders may not have sentToDoctor fields set even though they belong to this doctor's patients.
    const assignedPatients = await Patient.find({ assignedDoctorId: doctorObjectId })
      .select('_id')
      .lean();
    const assignedPatientIds = assignedPatients.map((p) => p._id);

    const doctorLabQuery = {
      $or: [
        { sentToDoctorId: doctorObjectId, sentToDoctor: true },
        { orderingDoctorId: doctorObjectId }
      ]
    };

    if (assignedPatientIds.length > 0) {
      doctorLabQuery.$or.push({ patientId: { $in: assignedPatientIds } });
    }

    // Find all lab orders that are sent to/ordered by this doctor, with fallback to assigned patients
    const labOrders = await LabOrder.find(doctorLabQuery)
    .populate('orderingDoctorId', 'firstName lastName')
    .sort({ orderDateTime: -1 });
    
    // Batch-fetch all patients in a single query instead of one per order (N+1 fix)
    const patientIds = [...new Set(labOrders.map(o => o.patientId?.toString()).filter(Boolean))];
    const patientMap = await findPatientsByIds(patientIds);

    const labOrdersWithPatients = labOrders.map(order => {
      const pid = order.patientId?.toString();
      const patient = pid ? (patientMap.get(pid) || null) : null;
      return {
        ...order.toObject(),
        patientId: patient || { _id: order.patientId, firstName: 'Unknown', lastName: 'Patient' }
      };
    });

    console.log(`Found ${labOrdersWithPatients.length} lab orders for doctor ${doctorId} (sent to or ordered by)`);
    
    if (!labOrdersWithPatients || labOrdersWithPatients.length === 0) {
      return res.status(200).json([]);
    }
    
    // Format the results for the frontend
    const formattedResults = labOrdersWithPatients.map(order => ({
      _id: order._id,
      testName: order.testName,
      category: getCategoryFromTestName(order.testName),
      patientId: order.patientId?.patientId || order.patientId?._id || order.patientId,
      patientName: order.patientId ? `${order.patientId.firstName} ${order.patientId.lastName}`.trim() : 'Unknown Patient',
      gender: order.patientId?.gender,
      age: order.patientId?.age,
      dob: order.patientId?.dateOfBirth || order.patientId?.dob,
      phone: order.patientId?.contactNumber || order.patientId?.phone,
      orderedBy: order.orderingDoctorId ? `Dr. ${order.orderingDoctorId.firstName} ${order.orderingDoctorId.lastName}` : 'Unknown Doctor',
      orderDate: order.orderDateTime,
      resultDate: order.resultDateTime,
      results: order.results || {},
      normalRange: order.normalRange,
      notes: order.notes,
      status: order.status,
      priority: order.priority,
      sentToDoctor: order.sentToDoctor,
      sentDate: order.sentToDoctorAt
    }));
    
    return res.status(200).json(formattedResults);
  } catch (error) {
    console.error('Error fetching doctor lab results:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching doctor lab results',
      error: error.message
    });
  }
});

/**
 * @route POST /api/lab-results/create-service-result
 * @desc Create lab service result for reception-ordered tests
 * @access Private (Lab staff)
 */
router.post('/create-service-result', auth, async (req, res) => {
  try {
    console.log('🔍 Creating lab service result...');
    console.log('Request body:', req.body);
    console.log('Request user:', req.user);
    
    const { 
      patientId, 
      testName, 
      results, 
      normalRange, 
      notes, 
      priority = 'Routine'
    } = req.body;

    // Validate input
    if (!patientId || !testName || !results) {
      console.log('❌ Missing required fields:', { patientId: !!patientId, testName: !!testName, results: !!results });
      return res.status(400).json({ 
        success: false, 
        message: 'Patient ID, test name, and results are required' 
      });
    }

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      console.log('❌ Patient not found:', patientId);
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Check if req.user exists and has _id
    if (!req.user || !req.user._id) {
      console.log('❌ No authenticated user found');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    console.log('✅ Creating service result with createdBy:', req.user._id);

    // Create a new lab service result
    const serviceResult = new LabServiceResult({
      patientId,
      testName,
      results,
      normalRange,
      notes,
      priority,
      createdBy: req.user._id,
      status: 'completed'
    });

    await serviceResult.save();

    // Update the original LabOrder to mark it as saved to service results
    try {
      // Find the corresponding LabOrder by patient and test name that hasn't been processed yet
      console.log(`🔍 Searching for LabOrder with criteria:`);
      console.log(`   patientId: ${patientId} (type: ${typeof patientId})`);
      console.log(`   testName: ${testName}`);
      console.log(`   source: reception`);
      console.log(`   sentToDoctor: { $ne: true }`);
      
      // Convert patientId to ObjectId for proper database search
      const patientObjectId = new mongoose.Types.ObjectId(patientId);
      console.log(`   Converted patientId to ObjectId: ${patientObjectId}`);
      
      const labOrder = await LabOrder.findOne({
        patientId: patientObjectId, // Use ObjectId instead of string
        testName: testName,
        source: 'reception',
        sentToDoctor: { $ne: true } // Only get orders that haven't been processed
      }).sort({ orderDateTime: -1 }); // Get the most recent unprocessed order
      
      console.log(`🔍 LabOrder search result:`, labOrder ? `Found ${labOrder._id}` : 'Not found');

      if (labOrder) {
        labOrder.sentToDoctor = true; // Mark as processed (saved to service)
        labOrder.sentToDoctorAt = new Date();
        labOrder.sentToDoctorBy = req.user._id;
        await labOrder.save();
        console.log(`✅ Updated LabOrder ${labOrder._id} to mark as saved to service results`);
        console.log(`   Patient: ${patientId}, Test: ${testName}, Order ID: ${labOrder._id}`);
      } else {
        console.log(`⚠️ No unprocessed LabOrder found for patient ${patientId} and test ${testName}`);
        console.log(`   Looking for: patientId=${patientId}, testName=${testName}, source=reception, sentToDoctor!=true`);
        
        // Let's check what LabOrders exist for this patient and test
        const allOrders = await LabOrder.find({
          patientId: patientObjectId, // Use ObjectId for search
          testName: testName,
          source: 'reception'
        });
        console.log(`   Found ${allOrders.length} total orders for this patient/test combination:`);
        allOrders.forEach((order, index) => {
          console.log(`   Order ${index + 1}: ID=${order._id}, sentToDoctor=${order.sentToDoctor} (type: ${typeof order.sentToDoctor}), orderDateTime=${order.orderDateTime}`);
        });
        
        // Also check if there are any orders with different criteria
        const allOrdersForPatient = await LabOrder.find({ patientId: patientObjectId }); // Use ObjectId for search
        console.log(`   Found ${allOrdersForPatient.length} total orders for this patient (any test):`);
        allOrdersForPatient.forEach((order, index) => {
          console.log(`   Order ${index + 1}: ID=${order._id}, testName=${order.testName}, source=${order.source}, sentToDoctor=${order.sentToDoctor}`);
        });
      }
    } catch (updateError) {
      console.error('Error updating LabOrder:', updateError);
      // Continue with the response even if LabOrder update fails
    }

    // Deduct inventory for the completed lab test
    try {
      const labInventoryService = require('../services/labInventoryService');
      const inventoryTransaction = await labInventoryService.consumeInventoryForLabOrder({
        testName: testName,
        _id: serviceResult._id
      }, req.user._id);
      
      if (inventoryTransaction) {
        console.log(`✅ Inventory deducted for lab test: ${testName}`);
      } else {
        console.log(`ℹ️ No inventory mapping found for lab test: ${testName}`);
      }
    } catch (inventoryError) {
      console.error('Error deducting inventory for lab test:', inventoryError);
      // Don't fail the lab test completion if inventory deduction fails
    }

    // Populate the result with patient and user information
    await serviceResult.populate([
      { path: 'patientId', select: 'firstName lastName patientId' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Lab service result created successfully',
      data: {
        id: serviceResult._id,
        patientId: serviceResult.patientId,
        testName: serviceResult.testName,
        results: serviceResult.results,
        normalRange: serviceResult.normalRange,
        notes: serviceResult.notes,
        priority: serviceResult.priority,
        status: serviceResult.status,
        resultCreatedDate: serviceResult.resultCreatedDate,
        patient: serviceResult.patientId,
        createdBy: serviceResult.createdBy
      }
    });

  } catch (error) {
    console.error('❌ Error creating lab service result:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error creating lab service result',
      error: error.message
    });
  }
});

/**
 * @route GET /api/lab-results/service-results
 * @desc Get all lab service results
 * @access Private (Lab staff)
 */
router.get('/service-results', auth, async (req, res) => {
  try {
    const { status, patientId, page = 1, limit = 50 } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (patientId) query.patientId = patientId;

    // Get service results with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const serviceResults = await LabServiceResult.find(query)
      .populate('patientId', 'firstName lastName patientId')
      .populate('createdBy', 'firstName lastName')
      .sort({ resultCreatedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LabServiceResult.countDocuments(query);

    res.json({
      success: true,
      data: serviceResults,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });

  } catch (error) {
    console.error('Error fetching service results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service results',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/lab-results/service-results/:id/print
 * @desc Mark service result as printed
 * @access Private (Lab staff)
 */
router.put('/service-results/:id/print', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const serviceResult = await LabServiceResult.findByIdAndUpdate(
      id,
      {
        status: 'printed',
        printedAt: new Date(),
        printedBy: req.user.userId
      },
      { new: true }
    ).populate([
      { path: 'patientId', select: 'firstName lastName patientId' },
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'printedBy', select: 'firstName lastName' }
    ]);

    if (!serviceResult) {
      return res.status(404).json({
        success: false,
        message: 'Service result not found'
      });
    }

    res.json({
      success: true,
      message: 'Service result marked as printed',
      data: serviceResult
    });

  } catch (error) {
    console.error('Error updating service result:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating service result',
      error: error.message
    });
  }
});

/**
 * @route GET /api/lab-results/service-results/:id/print
 * @desc Get service result for printing
 * @access Private (Lab staff)
 */
router.get('/service-results/:id/print', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const serviceResult = await LabServiceResult.findById(id)
      .populate('patientId', 'firstName lastName patientId phone email')
      .populate('createdBy', 'firstName lastName');

    if (!serviceResult) {
      return res.status(404).json({
        success: false,
        message: 'Service result not found'
      });
    }

    res.json({
      success: true,
      data: serviceResult
    });

  } catch (error) {
    console.error('Error fetching service result for print:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching service result',
      error: error.message
    });
  }
});

// Export the router and helper functions
module.exports = router;
module.exports.validateLabResultsStructure = validateLabResultsStructure;
module.exports.convertToStandardFormat = convertToStandardFormat; 
