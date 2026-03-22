/**
 * Prescription Validation and Prevention Utilities
 * 
 * This utility prevents common prescription issues like duplicates,
 * missing nurse tasks, and improper status assignments.
 */

const Prescription = require('../models/Prescription');
const NurseTask = require('../models/NurseTask');
const User = require('../models/User');
const InventoryItem = require('../models/InventoryItem');

/**
 * Check for existing active prescriptions for the same medication
 * @param {string} patientId - Patient ID
 * @param {string} medicationName - Medication name
 * @returns {Promise<Object>} - Result with existing prescription info
 */
async function checkExistingPrescription(patientId, medicationName) {
  try {
    const existingPrescription = await Prescription.findOne({
      patient: patientId,
      medicationName: { $regex: new RegExp(medicationName, 'i') },
      status: { $in: ['Active', 'Pending'] }
    }).populate('doctor', 'firstName lastName');

    return {
      exists: !!existingPrescription,
      prescription: existingPrescription,
      message: existingPrescription 
        ? `Active prescription for ${medicationName} already exists` 
        : null
    };
  } catch (error) {
    console.error('Error checking existing prescription:', error);
    return { exists: false, prescription: null, error: error.message };
  }
}

/**
 * Ensure proper nurse task creation for prescription
 * @param {Object} prescription - The prescription object
 * @param {string} assignedNurseId - Nurse ID to assign
 * @returns {Promise<Object>} - Result with task creation info
 */
async function ensureNurseTaskCreation(prescription, assignedNurseId = null) {
  try {
    // Check if nurse task creation should be skipped
    const hasInventoryItem = !!(
      prescription.medicationItem ||
      (Array.isArray(prescription.medications) && prescription.medications[0] && (prescription.medications[0].inventoryItem || prescription.medications[0].inventoryItemId))
    );
    
    // Check if sendToNurse is explicitly false
    const sendToNurse = prescription.sendToNurse !== false;
    
    // Allow bypassing inventory requirement for nurse tasks
    const bypassInventoryFilter = process.env.BYPASS_INVENTORY_FILTER === 'true' || 
                                  process.env.ALLOW_NON_INVENTORY_NURSE_TASKS === 'true' ||
                                  true; // TEMPORARY: Always allow nurse task creation for paid medications
    
    console.log(`🔍 [NURSE TASK] Task creation check for ${prescription.medicationName}:`);
    console.log(`   - HasInventoryItem: ${hasInventoryItem}`);
    console.log(`   - SendToNurse: ${sendToNurse}`);
    console.log(`   - BypassInventoryFilter: ${bypassInventoryFilter}`);
    
    // Skip nurse task creation only if explicitly disabled
    if (!sendToNurse) {
      console.log(`⏭️ [NURSE TASK] Skipping nurse task - sendToNurse is false`);
      return {
        created: false,
        updated: false,
        task: null,
        message: 'Skipped nurse task - sendToNurse disabled'
      };
    }
    
    // For medications without inventory items, create nurse task anyway (for administration tracking)
    if (!hasInventoryItem && !bypassInventoryFilter) {
      console.log(`⚠️ [NURSE TASK] Creating nurse task for non-inventory medication: ${prescription.medicationName}`);
      console.log(`ℹ️ [NURSE TASK] Note: This task will not deduct from inventory but will track administration`);
    }

    // Check if nurse task already exists
    const existingTask = await NurseTask.findOne({
      patientId: prescription.patient,
      'medicationDetails.medicationName': { $regex: new RegExp(prescription.medicationName, 'i') },
      taskType: 'MEDICATION'
    });

    if (existingTask) {
      // Update existing task if needed
      let updated = false;
      
      if (!existingTask.assignedNurse && assignedNurseId) {
        existingTask.assignedNurse = assignedNurseId;
        updated = true;
      }
      
      if (existingTask.status !== 'PENDING') {
        existingTask.status = 'PENDING';
        updated = true;
      }
      
      if (!existingTask.dueDate) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 1);
        existingTask.dueDate = dueDate;
        updated = true;
      }
      
      if (updated) {
        await existingTask.save();
      }
      
      return {
        created: false,
        updated: updated,
        task: existingTask,
        message: updated ? 'Updated existing nurse task' : 'Nurse task already exists'
      };
    }

    // Find a nurse if not assigned
    let nurseId = assignedNurseId;
    if (!nurseId) {
      const nurse = await User.findOne({ role: 'nurse', isActive: true });
      nurseId = nurse?._id;
    }

    // Create new nurse task
    const duration = parseInt(prescription.duration.match(/(\d+)/)?.[1] || '1');
    
    // Generate proper dose records based on frequency
    const doseRecords = [];
    const frequency = prescription.frequency?.toLowerCase() || 'once daily';
    let dosesPerDay = 1;
    
    // Determine doses per day based on frequency
    if (frequency.includes('bid') || frequency.includes('twice')) {
      dosesPerDay = 2;
    } else if (frequency.includes('tid') || frequency.includes('three')) {
      dosesPerDay = 3;
    } else if (frequency.includes('qid') || frequency.includes('four')) {
      dosesPerDay = 4;
    }
    
    // Use simplified flexible time slots for easier administration
    const { getFlexibleTimeSlots } = require('./frequencyDetection');
    const timeSlots = getFlexibleTimeSlots(prescription.frequency || 'once daily');
    
    // Create dose records for each day and time slot
    for (let day = 1; day <= duration; day++) {
      for (let doseIndex = 0; doseIndex < dosesPerDay; doseIndex++) {
        doseRecords.push({
          day: day,
          timeSlot: timeSlots[doseIndex],
          administered: false,
          administeredAt: null,
          administeredBy: null,
          notes: ''
        });
      }
    }

    // CRITICAL FIX: Ensure doctor ID is available for nurse task creation
    let doctorId = prescription.doctor;

    // If prescription.doctor is not available, try to get it from prescription data
    if (!doctorId && prescription.doctorId) {
      doctorId = prescription.doctorId;
      console.log(`🔧 [NURSE TASK] Using doctorId field instead of doctor field: ${doctorId}`);
    }

    // If still no doctor ID, this is a critical error
    if (!doctorId) {
      console.error(`❌ [CRITICAL] Doctor ID is missing for prescription ${prescription._id}`);
      console.error(`❌ [CRITICAL] Prescription data:`, {
        id: prescription._id,
        patient: prescription.patient,
        doctor: prescription.doctor,
        doctorId: prescription.doctorId,
        medicationName: prescription.medicationName
      });
      return {
        created: false,
        updated: false,
        task: null,
        message: 'Doctor ID is missing - cannot create nurse task'
      };
    }

    const newNurseTask = new NurseTask({
      patientId: prescription.patient,
      patientName: prescription.patientName || 'Unknown Patient',
      taskType: 'MEDICATION',
      status: 'PENDING',
      priority: 'MEDIUM',
      assignedNurse: nurseId,
      assignedBy: doctorId,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      medicationDetails: {
        medicationName: prescription.medicationName,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: duration,
        route: prescription.route || 'Oral',
        instructions: prescription.instructions,
        doseRecords: doseRecords
      },
      description: `Administer ${prescription.medicationName} ${prescription.dosage} ${prescription.frequency} for ${prescription.duration}`,
      notes: `Prescription created by doctor on ${prescription.datePrescribed || new Date()}`
    });

    await newNurseTask.save();

    return {
      created: true,
      updated: false,
      task: newNurseTask,
      message: 'Created new nurse task successfully'
    };
  } catch (error) {
    console.error('Error ensuring nurse task creation:', error);
    return { created: false, updated: false, error: error.message };
  }
}

/**
 * Validate prescription data before creation
 * @param {Object} prescriptionData - Prescription data to validate
 * @returns {Object} - Validation result
 */
function validatePrescriptionData(prescriptionData) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!prescriptionData.patient) errors.push('Patient is required');
  if (!prescriptionData.medicationName) errors.push('Medication name is required');
  if (!prescriptionData.dosage) errors.push('Dosage is required');
  if (!prescriptionData.frequency) errors.push('Frequency is required');
  if (!prescriptionData.doctor) errors.push('Doctor is required');

  // Helper function to validate duration (reusable for both main duration and medications array)
  const validateDuration = (duration, context = '') => {
    if (!duration) return; // Duration is optional, skip if not provided
    
    const durationStr = String(duration).trim();
    
    // List of special duration values that don't require numeric validation
    const specialDurations = [
      'As directed by physician',
      'As directed',
      'Per protocol',
      'According to guidelines',
      'Based on response',
      'Until symptoms resolve',
      'Until pain free',
      'Until fever resolves',
      'Until infection clears',
      'Until lab values normalize',
      'Until blood pressure controlled',
      'Until blood sugar controlled',
      'Until follow-up visit',
      'Until next appointment',
      'Until specialist consultation',
      'Until follow-up',
      'Until re-evaluation',
      'Until next visit',
      'Until specialist review',
      'Until treatment response',
      'Until side effects resolve',
      'Single dose',
      'One-time use',
      'Loading dose only',
      'Maintenance dose',
      'Tapering schedule',
      'Cyclical therapy',
      'Pulse therapy',
      'Continuous therapy',
      'Lifelong therapy',
      'Long-term maintenance',
      'Chronic management',
      'Ongoing treatment',
      'Indefinite duration',
      'Emergency use only',
      'As needed for symptoms',
      'PRN (as needed)',
      'Breakthrough pain only',
      'Rescue medication',
      'Custom duration'
    ];
    
    // Check if it's a special duration that doesn't need numeric validation
    const isSpecialDuration = specialDurations.some(special => 
      durationStr.toLowerCase().includes(special.toLowerCase())
    );
    
    if (!isSpecialDuration) {
      // For regular durations, check if they contain a number
      const durationMatch = durationStr.match(/(\d+)/);
      if (!durationMatch) {
        errors.push(`${context}Duration must contain a number (e.g., "5 days") or be a special duration like "As directed by physician"`);
      } else {
        const days = parseInt(durationMatch[1]);
        if (days < 1 || days > 365) {
          warnings.push(`${context}Duration should be between 1 and 365 days`);
        }
      }
    }
    // Special durations are valid, no further validation needed
  };

  // Duration validation - Use helper function
  validateDuration(prescriptionData.duration);
  
  // Validate durations in medications array if present
  if (prescriptionData.medications && Array.isArray(prescriptionData.medications)) {
    prescriptionData.medications.forEach((med, index) => {
      if (med.duration) {
        validateDuration(med.duration, `Medication ${index + 1}: `);
      }
    });
  }

  // Status validation
  if (prescriptionData.status && !['Active', 'Pending', 'Completed', 'Cancelled', 'Payment Required', 'Extended'].includes(prescriptionData.status)) {
    errors.push('Invalid prescription status');
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    warnings: warnings
  };
}

/**
 * Complete prescription creation process with validation and nurse task creation
 * @param {Object} prescriptionData - Prescription data
 * @param {string} assignedNurseId - Optional nurse ID to assign
 * @returns {Promise<Object>} - Result of the creation process
 */
async function createPrescriptionWithValidation(prescriptionData, assignedNurseId = null) {
  try {
    // ROOT CAUSE FIX: Comprehensive frequency validation and logging
    console.log(`🔍 [PrescriptionValidation] Frequency validation:`);
    console.log(`  Primary frequency: "${prescriptionData.frequency}"`);
    console.log(`  Medications array frequencies: ${prescriptionData.medications?.map(m => m.frequency).join(', ') || 'N/A'}`);
    
    // Validate that frequency is present and valid
    if (!prescriptionData.frequency) {
      console.error(`❌ [PrescriptionValidation] CRITICAL: Primary frequency is missing!`);
      console.error(`❌ [PrescriptionValidation] This indicates a bug in the prescription creation process`);
      
      // Try to recover frequency from medications array
      if (prescriptionData.medications && prescriptionData.medications.length > 0) {
        const recoveredFrequency = prescriptionData.medications[0].frequency;
        if (recoveredFrequency) {
          console.log(`🔧 [PrescriptionValidation] Recovered frequency from medications array: "${recoveredFrequency}"`);
          prescriptionData.frequency = recoveredFrequency;
        } else {
          console.error(`❌ [PrescriptionValidation] CRITICAL: No frequency found in medications array either!`);
          return {
            success: false,
            errors: ['Frequency is required for prescription creation']
          };
        }
      } else {
        return {
          success: false,
          errors: ['Frequency is required for prescription creation']
        };
      }
    }
    
    // Validate frequency format
    const validFrequencies = [
      'Once daily (QD)', 'Twice daily (BID)', 'Three times daily (TID)', 'Four times daily (QID)',
      'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours',
      'With meals (AC)', 'After meals (PC)', 'Before meals', 'At bedtime (HS)',
      'In the morning (AM)', 'In the evening (PM)', 'As needed (PRN)',
      'Weekly', 'Twice weekly', 'Every other day', 'Monthly'
    ];
    
    if (!validFrequencies.includes(prescriptionData.frequency)) {
      console.warn(`⚠️ [PrescriptionValidation] Frequency "${prescriptionData.frequency}" is not in standard format`);
      console.warn(`⚠️ [PrescriptionValidation] This may cause issues in downstream processing`);
    }
    
    console.log(`✅ [PrescriptionValidation] Frequency validation passed: "${prescriptionData.frequency}"`);
    
    // Step 1: Validate prescription data
    const validation = validatePrescriptionData(prescriptionData);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    // Step 2: Allow multiple prescriptions for the same medication (simplified system)
    // Duplicate prescription check disabled - doctors can prescribe medications multiple times
    console.log(`✅ [PrescriptionValidation] Allowing prescription creation for ${prescriptionData.medicationName} (multiple prescriptions enabled)`);

    // Step 3: Set default status if not provided
    if (!prescriptionData.status) {
      prescriptionData.status = 'Active';
    }

    // Step 3.5: Ensure doctor ID is set
    // This is critical for nurse task creation
    if (!prescriptionData.doctor && !prescriptionData.doctorId) {
      console.error(`❌ [CRITICAL] Doctor ID is missing in prescription data`);
      console.error(`❌ [CRITICAL] Prescription data keys:`, Object.keys(prescriptionData));
      return {
        success: false,
        errors: ['Doctor ID is required for prescription creation']
      };
    }

    // Ensure both doctor and doctorId fields are set
    if (prescriptionData.doctor && !prescriptionData.doctorId) {
      prescriptionData.doctorId = prescriptionData.doctor;
    } else if (prescriptionData.doctorId && !prescriptionData.doctor) {
      prescriptionData.doctor = prescriptionData.doctorId;
    }

    // Step 3.6: Block prescription if any medication is out of stock
    const stockErrors = [];
    const medsToCheck = prescriptionData.medications && prescriptionData.medications.length > 0
      ? prescriptionData.medications
      : [{ name: prescriptionData.medicationName, inventoryItem: prescriptionData.medicationItem, inventoryItemId: prescriptionData.medicationItem }];
    for (const med of medsToCheck) {
      const inventoryId = med.inventoryItem || med.inventoryItemId;
      if (!inventoryId) continue;
      try {
        const item = await InventoryItem.findById(inventoryId).select('name quantity').lean();
        if (item && (item.quantity == null || Number(item.quantity) <= 0)) {
          stockErrors.push(`${item.name || med.name || 'This medication'} is out of stock. Cannot prescribe.`);
        }
      } catch (e) {
        console.warn(`[PrescriptionValidation] Could not check stock for inventory ${inventoryId}:`, e.message);
      }
    }
    if (stockErrors.length > 0) {
      return { success: false, errors: stockErrors };
    }

    // Step 4: Create prescription
    console.log(`🔧 [CRITICAL DEBUG] About to create prescription with medications:`, prescriptionData.medications.map(med => ({ 
        name: med.name, 
        duration: med.duration 
    })));
    
    const prescription = new Prescription(prescriptionData);
    
    console.log(`🔧 [CRITICAL DEBUG] Prescription object before save:`, prescription.medications.map(med => ({ 
        name: med.name, 
        duration: med.duration 
    })));
    
    await prescription.save();
    
    console.log(`🔧 [CRITICAL DEBUG] Prescription object after save:`, prescription.medications.map(med => ({ 
        name: med.name, 
        duration: med.duration 
    })));

    // Step 5: Create nurse tasks for all medications
    const taskResults = [];
    
    if (prescription.medications && Array.isArray(prescription.medications) && prescription.medications.length > 0) {
      console.log(`💊 [PrescriptionValidation] Creating nurse tasks for ${prescription.medications.length} medications`);
      
      for (const med of prescription.medications) {
        // Create a temporary prescription object for each medication to use with existing function
        const tempPrescription = {
          ...prescription.toObject(),
          medicationName: med.name || med.medication,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration || prescription.duration,
          route: med.route || 'Oral',
          medicationItem: med.inventoryItem || med.inventoryItemId
        };
        
        const taskResult = await ensureNurseTaskCreation(tempPrescription, assignedNurseId);
        taskResults.push({
          medication: med.name || med.medication,
          ...taskResult
        });
        
        console.log(`✅ [PrescriptionValidation] Nurse task for ${med.name || med.medication}: ${taskResult.created ? 'Created' : 'Updated'}`);
      }
    } else {
      // Handle single medication (backward compatibility)
      const taskResult = await ensureNurseTaskCreation(prescription, assignedNurseId);
      taskResults.push(taskResult);
    }

    // Step 6: Ensure invoice is created for ALL medications
    let invoiceResult = null;
    try {
      const PrescriptionInvoiceService = require('../services/prescriptionInvoiceService');
      
      // Get patient and doctor info for invoice creation
      const Patient = require('../models/Patient');
      const User = require('../models/User');
      
      const patient = await Patient.findById(prescriptionData.patient);
      const doctor = await User.findById(prescriptionData.doctor);
      
      if (patient && doctor) {
        // Create medication data for ALL medications in the invoice
        let medicationData = [];
        
        if (prescription.medications && Array.isArray(prescription.medications) && prescription.medications.length > 0) {
          medicationData = prescription.medications.map(med => ({
            name: med.name || med.medication,
            dosage: med.dosage || 'Standard',
            frequency: med.frequency || 'Once daily (QD)',
            duration: med.duration || prescriptionData.duration || '',
            totalPrice: med.totalPrice || 0,
            inventoryItem: med.inventoryItem || med.inventoryItemId,
            prescriptionId: prescription._id
          }));
          
          console.log(`💰 [PrescriptionValidation] Creating invoice for ${medicationData.length} medications`);
        } else {
          // Single medication (backward compatibility)
          medicationData = [{
            name: prescriptionData.medicationName,
            dosage: prescriptionData.dosage || 'Standard',
            frequency: prescriptionData.frequency || 'Once daily (QD)',
            duration: prescriptionData.duration || '',
            totalPrice: prescriptionData.totalCost || 0,
            inventoryItem: prescriptionData.medicationItem,
            prescriptionId: prescription._id
          }];
        }
        
        console.log(`🔧 [PrescriptionValidation] Invoice medications:`, medicationData.map(m => `${m.name} (${m.frequency})`));
        
        invoiceResult = await PrescriptionInvoiceService.createInvoiceForPrescription(
          prescription,
          medicationData,
          patient,
          doctor
        );
        
        console.log(`✅ [PrescriptionValidation] Invoice created automatically: ${invoiceResult._id}`);
      }
    } catch (invoiceError) {
      console.error('❌ [PrescriptionValidation] Error creating invoice automatically:', invoiceError);
      // Don't fail prescription creation if invoice creation fails
      invoiceResult = { error: invoiceError.message };
    }

    return {
      success: true,
      prescription: prescription,
      nurseTasks: taskResults,
      taskCreated: taskResults.some(tr => tr.created),
      taskUpdated: taskResults.some(tr => tr.updated),
      invoice: invoiceResult,
      warnings: validation.warnings,
      message: `Prescription created successfully. Created ${taskResults.filter(tr => tr.created).length} new nurse tasks, updated ${taskResults.filter(tr => tr.updated).length} existing tasks.`
    };

  } catch (error) {
    console.error('Error in prescription creation process:', error);
    return {
      success: false,
      errors: [error.message]
    };
  }
}

/**
 * Clean up duplicate prescriptions for a patient
 * @param {string} patientId - Patient ID
 * @param {string} medicationName - Medication name (optional)
 * @returns {Promise<Object>} - Cleanup result
 */
async function cleanupDuplicatePrescriptions(patientId, medicationName = null) {
  try {
    const query = { patient: patientId };
    if (medicationName) {
      query.medicationName = { $regex: new RegExp(medicationName, 'i') };
    }

    const prescriptions = await Prescription.find(query)
      .populate('doctor', 'firstName lastName')
      .sort({ createdAt: 1 });
    const duplicates = prescriptions.slice(1); // Keep first, remove rest

    if (duplicates.length === 0) {
      return {
        success: true,
        removed: 0,
        message: 'No duplicates found'
      };
    }

    // Remove duplicates
    for (const duplicate of duplicates) {
      await Prescription.findByIdAndDelete(duplicate._id);
    }

    return {
      success: true,
      removed: duplicates.length,
      message: `Removed ${duplicates.length} duplicate prescription(s)`
    };

  } catch (error) {
    console.error('Error cleaning up duplicate prescriptions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  checkExistingPrescription,
  ensureNurseTaskCreation,
  validatePrescriptionData,
  createPrescriptionWithValidation,
  cleanupDuplicatePrescriptions
};
