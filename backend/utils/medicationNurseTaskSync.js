/**
 * Enhanced Medication to Nurse Task Synchronization Utility
 * 
 * This utility ensures that ALL paid medications automatically create nurse tasks
 * with proper validation for required fields (dueDate, assignedBy)
 */

const mongoose = require('mongoose');
const NurseTask = require('../models/NurseTask');
const Prescription = require('../models/Prescription');
const MedicalInvoice = require('../models/MedicalInvoice');
const Patient = require('../models/Patient');
const { processPaymentAndCreateNurseTasks } = require('./nurseTaskCreation');

/**
 * Check if a prescription has an associated nurse task
 * @param {string} prescriptionId - Prescription ID
 * @param {string} medicationName - Medication name (optional, for multiple medications)
 * @returns {Promise<Object>} - Task existence result
 */
async function checkNurseTaskExists(prescriptionId, medicationName = null) {
  try {
    const query = {
      prescriptionId: prescriptionId,
      taskType: 'MEDICATION',
      status: { $in: ['PENDING', 'IN_PROGRESS'] }
    };
    
    // If medication name is provided, check for specific medication
    if (medicationName) {
      query['medicationDetails.medicationName'] = medicationName;
    }
    
    const existingTask = await NurseTask.findOne(query);
    
    return {
      exists: !!existingTask,
      task: existingTask
    };
  } catch (error) {
    console.error(`❌ [TASK CHECK] Error checking task for prescription ${prescriptionId}:`, error);
    return { exists: false, task: null };
  }
}

/**
 * Extract medications from prescription (handles both single and multiple medications)
 * @param {Object} prescription - Prescription object
 * @returns {Array} - Array of medication objects
 */
function extractMedicationsFromPrescription(prescription) {
  const medications = [];
  
  // Check for multiple medications in medications array
  if (prescription.medications && Array.isArray(prescription.medications) && prescription.medications.length > 0) {
    prescription.medications.forEach(med => {
      medications.push({
        name: med.name || med.medicationName,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        route: med.route || 'Oral',
        inventoryItem: med.inventoryItem || med.medicationItem,
        instructions: med.instructions,
        prescriptionId: prescription._id,
        isMultipleMedication: true
      });
    });
  }
  
  // Check for single medication (backwards compatibility)
  if (prescription.medicationName && medications.length === 0) {
    medications.push({
      name: prescription.medicationName,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      duration: prescription.duration,
      route: prescription.route || 'Oral',
      inventoryItem: prescription.medicationItem,
      instructions: prescription.instructions,
      prescriptionId: prescription._id,
      isMultipleMedication: false
    });
  }
  
  return medications;
}

/**
 * Create nurse task for a paid medication with proper validation
 * @param {Object} prescription - Prescription object
 * @param {Object} medicationData - Specific medication data (for multiple medications)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Creation result
 */
async function createNurseTaskForPaidMedication(prescription, medicationData = null, options = {}) {
  try {
    console.log(`🏥 [PAID MED SYNC] Processing synchronization for: ${prescription._id}`);
    
    // If specific medicationData is provided, create a temporary prescription-like object
    if (medicationData) {
      const medicationPrescription = {
        ...prescription.toObject ? prescription.toObject() : prescription,
        medicationName: medicationData.name || medicationData.medicationName,
        dosage: medicationData.dosage,
        frequency: medicationData.frequency,
        duration: medicationData.duration,
        route: medicationData.route,
        medications: undefined
      };
      return await processPaymentAndCreateNurseTasks(medicationPrescription);
    }

    // Default: Process the whole prescription
    const results = await processPaymentAndCreateNurseTasks(prescription);
    console.log(`📊 [PAID MED SYNC] Sync completed: ${results.tasksCreated} created, ${results.tasksSkipped} updated/skipped`);
    
    return results;
  } catch (error) {
    console.error(`💥 [PAID MED SYNC] Fatal error in createNurseTaskForPaidMedication:`, error);
    return {
      success: false,
      tasksCreated: 0,
      tasksSkipped: 0,
      tasks: [],
      errors: [error.message]
    };
  }
}

/**
 * Sync all paid medications with nurse tasks (enhanced for multiple medications)
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} - Sync results
 */
async function syncPaidMedicationsWithNurseTasks(options = {}) {
  const results = {
    totalPaidPrescriptions: 0,
    totalMedications: 0,
    tasksCreated: 0,
    tasksSkipped: 0,
    errors: 0,
    details: []
  };
  
  try {
    console.log(`🔄 [MEDICATION SYNC] Starting synchronization of paid and partially paid medications...`);
    
    // Find all paid and partially paid prescriptions
    const paidPrescriptions = await Prescription.find({
      $or: [
        { paymentStatus: { $in: ['paid', 'fully_paid', 'partially_paid'] } },
        { status: { $in: ['Active', 'ACTIVE'] } } // Include active prescriptions (might be paid via invoice)
      ]
    }).populate('patient').populate('doctor').sort({ createdAt: -1 });
    
    results.totalPaidPrescriptions = paidPrescriptions.length;
    console.log(`📊 [MEDICATION SYNC] Found ${paidPrescriptions.length} paid/active prescriptions`);
    
    for (const prescription of paidPrescriptions) {
      try {
        // Extract all medications from prescription
        const medications = extractMedicationsFromPrescription(prescription);
        results.totalMedications += medications.length;
        
        console.log(`💊 [MEDICATION SYNC] Processing ${medications.length} medications for prescription ${prescription._id}`);
        
        const syncResult = await createNurseTaskForPaidMedication(prescription);
        
        results.tasksCreated += syncResult.tasksCreated;
        results.tasksSkipped += syncResult.tasksSkipped;
        
        if (syncResult.errors && syncResult.errors.length > 0) {
          results.errors += syncResult.errors.length;
        }
        
        // Add details for each medication
        medications.forEach(medication => {
          const medicationResult = syncResult.tasksCreated > 0 ? 'created' : 
                                  syncResult.tasksSkipped > 0 ? 'skipped' : 'failed';
          
          results.details.push({
            prescriptionId: prescription._id.toString(),
            medicationName: medication.name,
            patientName: prescription.patient ? 
              `${prescription.patient.firstName || ''} ${prescription.patient.lastName || ''}`.trim() : 
              prescription.patientName || 'Unknown',
            result: medicationResult,
            reason: syncResult.errors.length > 0 ? syncResult.errors.join(', ') : 'Success'
          });
        });
        
      } catch (prescriptionError) {
        results.errors++;
        console.error(`💥 [MEDICATION SYNC] Error processing prescription ${prescription._id}:`, prescriptionError);
        
        results.details.push({
          prescriptionId: prescription._id.toString(),
          medicationName: prescription.medicationName || 'Unknown',
          result: 'error',
          reason: prescriptionError.message
        });
      }
    }
    
    console.log(`📊 [MEDICATION SYNC] Synchronization completed:`);
    console.log(`   📋 Total prescriptions: ${results.totalPaidPrescriptions}`);
    console.log(`   💊 Total medications: ${results.totalMedications}`);
    console.log(`   ✅ Tasks created: ${results.tasksCreated}`);
    console.log(`   ⏭️ Tasks skipped: ${results.tasksSkipped}`);
    console.log(`   ❌ Errors: ${results.errors}`);
    
    return results;
    
  } catch (error) {
    console.error(`💥 [MEDICATION SYNC] Fatal synchronization error:`, error);
    results.error = error.message;
    return results;
  }
}

/**
 * Process medication payment and ensure nurse task creation (enhanced for partial payments)
 * @param {string} prescriptionId - Prescription ID
 * @param {Object} paymentDetails - Payment details
 * @returns {Promise<Object>} - Processing result
 */
async function processMedicationPaymentWithNurseTaskGuarantee(prescriptionId, paymentDetails = {}) {
  try {
    console.log(`💰 [PAYMENT GUARANTEE] Processing payment for prescription: ${prescriptionId}`);
    
    // Find the prescription with populated doctor information
    const prescription = await Prescription.findById(prescriptionId).populate('patient').populate('doctor');
    
    if (!prescription) {
      throw new Error(`Prescription ${prescriptionId} not found`);
    }
    
    // Check if prescription has any payment (including partial)
    const hasPayment = ['paid', 'fully_paid', 'partially_paid', 'partial'].includes(prescription.paymentStatus) ||
                      ['Active', 'ACTIVE'].includes(prescription.status);
    
    if (!hasPayment) {
      console.log(`⚠️ [PAYMENT GUARANTEE] Prescription ${prescriptionId} has no payment (${prescription.paymentStatus}/${prescription.status})`);
      
      // Check invoice payments as backup
      const invoices = await MedicalInvoice.find({
        'items.prescriptionId': prescriptionId
      });
      
      const hasInvoicePayment = invoices.some(invoice => 
        invoice.status === 'paid' || 
        invoice.status === 'partially_paid' || 
        (invoice.amountPaid && invoice.amountPaid > 0)
      );
      
      if (!hasInvoicePayment) {
        return {
          success: false,
          reason: `Prescription not paid (status: ${prescription.paymentStatus}, invoices: ${invoices.length})`
        };
      }
      
      console.log(`💡 [PAYMENT GUARANTEE] Found invoice payment for prescription ${prescriptionId}`);
    }
    
    // Create nurse tasks immediately (even for partial payments)
    const result = await createNurseTaskForPaidMedication(prescription);
    
    if (result.success) {
      console.log(`🎉 [PAYMENT GUARANTEE] Success: ${result.tasksCreated} nurse tasks created, ${result.tasksSkipped} skipped for prescription ${prescriptionId}`);
    } else {
      console.error(`❌ [PAYMENT GUARANTEE] Failed to create nurse tasks for prescription ${prescriptionId}`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`💥 [PAYMENT GUARANTEE] Error processing payment guarantee:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Find and fix paid medications without nurse tasks
 * @param {Object} options - Search options
 * @returns {Promise<Object>} - Fix results
 */
async function findAndFixOrphanedPaidMedications(options = {}) {
  try {
    console.log(`🔍 [ORPHANED MEDS] Searching for paid medications without nurse tasks...`);
    
    const results = {
      orphanedMedications: 0,
      totalMedications: 0,
      fixed: 0,
      errors: 0,
      details: []
    };
    
    // Get all paid and partially paid prescriptions with populated data
    const paidPrescriptions = await Prescription.find({
      $or: [
        { paymentStatus: { $in: ['paid', 'fully_paid', 'partially_paid'] } },
        { status: { $in: ['Active', 'ACTIVE'] } }
      ]
    }).populate('patient').populate('doctor');
    
    for (const prescription of paidPrescriptions) {
      const medications = extractMedicationsFromPrescription(prescription);
      results.totalMedications += medications.length;
      
      for (const medication of medications) {
        // Check if nurse task exists for this specific medication
        const taskCheck = await checkNurseTaskExists(prescription._id, medication.name);
        
        if (!taskCheck.exists) {
          results.orphanedMedications++;
          
          const patientName = prescription.patient ? 
            `${prescription.patient.firstName || ''} ${prescription.patient.lastName || ''}`.trim() : 
            prescription.patientName || 'Unknown';
          
          console.log(`🚨 [ORPHANED MEDS] Found orphaned medication: ${medication.name} - Patient: ${patientName}`);
          
          // Attempt to fix by creating nurse task
          const fixResult = await createNurseTaskForPaidMedication(prescription, medication);
          
          if (fixResult.success && fixResult.tasksCreated > 0) {
            results.fixed++;
            console.log(`✅ [ORPHANED MEDS] Fixed: Created nurse task for ${medication.name}`);
          } else {
            results.errors++;
            console.error(`❌ [ORPHANED MEDS] Failed to fix: ${medication.name}`);
          }
          
          results.details.push({
            prescriptionId: prescription._id.toString(),
            medicationName: medication.name,
            patientName: patientName,
            fixed: fixResult.success && fixResult.tasksCreated > 0,
            error: fixResult.errors?.join(', ')
          });
        }
      }
    }
    
    console.log(`📊 [ORPHANED MEDS] Results:`);
    console.log(`   💊 Total medications checked: ${results.totalMedications}`);
    console.log(`   🔍 Orphaned medications found: ${results.orphanedMedications}`);
    console.log(`   ✅ Fixed: ${results.fixed}`);
    console.log(`   ❌ Errors: ${results.errors}`);
    
    return results;
    
  } catch (error) {
    console.error(`💥 [ORPHANED MEDS] Error finding orphaned medications:`, error);
    return {
      orphanedMedications: 0,
      totalMedications: 0,
      fixed: 0,
      errors: 1,
      error: error.message
    };
  }
}

module.exports = {
  checkNurseTaskExists,
  extractMedicationsFromPrescription,
  createNurseTaskForPaidMedication,
  syncPaidMedicationsWithNurseTasks,
  processMedicationPaymentWithNurseTaskGuarantee,
  findAndFixOrphanedPaidMedications
};
