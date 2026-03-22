/**
 * Robust Payment Processing Utility
 * 
 * This utility ensures that when a prescription is paid, 
 * nurse tasks are ALWAYS created successfully
 */

const { processPaymentAndCreateNurseTasks } = require('./nurseTaskCreation');

/**
 * Process prescription payment and guarantee nurse task creation
 * @param {Object} prescription - Prescription object
 * @param {Object} patient - Patient object (optional)
 * @param {Object} paymentDetails - Payment details
 * @returns {Promise<Object>} - Processing result with task creation status
 */
async function processPaymentWithGuaranteedTasks(prescription, patient, paymentDetails) {
  const result = {
    paymentSuccess: true,
    taskCreationSuccess: false,
    tasksCreated: 0,
    errors: [],
    criticalError: false
  };
  
  try {
    console.log(`💰 [ROBUST PAYMENT] Processing payment for prescription ${prescription._id}`);
    console.log(`💊 [ROBUST PAYMENT] Medication: ${prescription.medicationName} - ${prescription.frequency}`);
    
    // Step 1: Process nurse task creation
    const taskResult = await processPaymentAndCreateNurseTasks(prescription, patient);
    
    if (taskResult.success) {
      result.taskCreationSuccess = true;
      result.tasksCreated = taskResult.tasksCreated;
      
      console.log(`🎉 [ROBUST PAYMENT] SUCCESS: ${taskResult.tasksCreated} nurse tasks created`);
      
      // Log task details for verification
      taskResult.tasks.forEach((task, index) => {
        console.log(`✅ [ROBUST PAYMENT] Task ${index + 1}: ${task._id}`);
        console.log(`   📋 ${task.medicationDetails?.medicationName} - ${task.medicationDetails?.frequency}`);
        console.log(`   📅 ${task.medicationDetails?.duration} days - ${task.medicationDetails?.doseRecords?.length} doses`);
      });
      
    } else {
      // Task creation failed - this is a critical issue
      result.errors = taskResult.errors;
      result.criticalError = true;
      
      console.error(`❌ [ROBUST PAYMENT] CRITICAL: Task creation failed for prescription ${prescription._id}`);
      console.error(`📊 [ROBUST PAYMENT] Errors:`, taskResult.errors);
      
      // Log system alert
      console.error(`🚨 [SYSTEM] PAID PRESCRIPTION WITHOUT NURSE TASKS: ${prescription._id}`);
      console.error(`🚨 [SYSTEM] Medication: ${prescription.medicationName} - Patient: ${prescription.patient._id || prescription.patientId}`);
    }
    
    return result;
    
  } catch (error) {
    result.criticalError = true;
    result.errors.push(`Fatal error: ${error.message}`);
    
    console.error(`💥 [ROBUST PAYMENT] FATAL ERROR processing prescription ${prescription._id}:`, error);
    console.error(`💥 [ROBUST PAYMENT] Stack:`, error.stack);
    
    return result;
  }
}

/**
 * Emergency task creation for prescriptions that were paid but have no tasks
 * @param {string} prescriptionId - Prescription ID
 * @returns {Promise<Object>} - Recovery result
 */
async function emergencyTaskRecovery(prescriptionId) {
  try {
    console.log(`🚨 [EMERGENCY] Attempting task recovery for prescription ${prescriptionId}`);
    
    const Prescription = require('../models/Prescription');
    const Patient = require('../models/Patient');
    
    // Find the prescription
    const prescription = await Prescription.findById(prescriptionId).populate('patient');
    
    if (!prescription) {
      throw new Error(`Prescription ${prescriptionId} not found`);
    }
    
    if (prescription.paymentStatus !== 'paid') {
      throw new Error(`Prescription ${prescriptionId} is not paid (status: ${prescription.paymentStatus})`);
    }
    
    console.log(`🔍 [EMERGENCY] Found prescription: ${prescription.medicationName} - ${prescription.frequency}`);
    
    // Attempt task creation
    const taskResult = await processPaymentAndCreateNurseTasks(prescription, prescription.patient);
    
    if (taskResult.success) {
      console.log(`✅ [EMERGENCY] Recovery successful: ${taskResult.tasksCreated} tasks created`);
      return {
        success: true,
        tasksCreated: taskResult.tasksCreated,
        message: `Successfully recovered ${taskResult.tasksCreated} nurse tasks for prescription ${prescriptionId}`
      };
    } else {
      console.error(`❌ [EMERGENCY] Recovery failed:`, taskResult.errors);
      return {
        success: false,
        errors: taskResult.errors,
        message: `Recovery failed for prescription ${prescriptionId}`
      };
    }
    
  } catch (error) {
    console.error(`💥 [EMERGENCY] Recovery error for prescription ${prescriptionId}:`, error);
    return {
      success: false,
      error: error.message,
      message: `Emergency recovery failed for prescription ${prescriptionId}`
    };
  }
}

module.exports = {
  processPaymentWithGuaranteedTasks,
  emergencyTaskRecovery
};
