/**
 * Task Duplicate Prevention Utility
 * 
 * This utility prevents duplicate nurse tasks by implementing
 * comprehensive duplicate detection and prevention logic
 */

const mongoose = require('mongoose');
const NurseTask = require('../models/NurseTask');
const Patient = require('../models/Patient');

/**
 * Ensures patient name is properly populated in task data
 * This prevents "Unknown Patient" issues in the Administer Meds interface
 * @param {Object} taskData - Task data to validate
 * @returns {Promise<Object>} - Task data with guaranteed patient name
 */
async function ensurePatientNameInTask(taskData) {
  try {
    // If patientName is already properly set, return as is
    if (taskData.patientName && 
        taskData.patientName !== 'Unknown' && 
        taskData.patientName !== 'Unknown Patient' &&
        taskData.patientName.trim() !== '') {
      return taskData;
    }

    // If we have patientId, fetch the patient to get the name
    if (taskData.patientId) {
      try {
        const patient = await Patient.findById(taskData.patientId);
        if (patient) {
          const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
          if (patientName && patientName !== '') {
            console.log(`✅ [PATIENT NAME] Retrieved patient name: ${patientName} for ID: ${taskData.patientId}`);
            return {
              ...taskData,
              patientName: patientName
            };
          } else {
            console.warn(`⚠️ [PATIENT NAME] Patient ${taskData.patientId} has no valid name fields`);
          }
        } else {
          console.warn(`⚠️ [PATIENT NAME] Patient ${taskData.patientId} not found in database`);
        }
      } catch (error) {
        console.error(`❌ [PATIENT NAME] Error fetching patient ${taskData.patientId}:`, error.message);
      }
    }

    // If we still don't have a valid patient name, log a warning
    console.warn(`⚠️ [PATIENT NAME] Could not determine patient name for task. Patient ID: ${taskData.patientId}, Current patientName: ${taskData.patientName}`);
    
    // Return task data as is - the calling function should handle this case
    return taskData;
  } catch (error) {
    console.error('❌ [PATIENT NAME] Error ensuring patient name:', error);
    return taskData;
  }
}

/**
 * Check if a nurse task already exists for the given criteria
 * @param {Object} criteria - The criteria to check for duplicates
 * @param {string} criteria.patientId - Patient ID
 * @param {string} criteria.medicationName - Medication name
 * @param {string} criteria.taskType - Task type (default: 'MEDICATION')
 * @param {string} criteria.prescriptionId - Prescription ID (optional)
 * @param {string} criteria.serviceId - Service ID (optional)
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise<Object|null>} - Existing task if found, null otherwise
 */
async function checkForDuplicateTask(criteria, session = null) {
  try {
    const {
      patientId,
      medicationName,
      taskType = 'MEDICATION',
      prescriptionId,
      serviceId
    } = criteria;

    // Build comprehensive duplicate detection query
    const duplicateQuery = {
      patientId: patientId,
      taskType: taskType,
      status: { $in: ['PENDING', 'IN_PROGRESS'] } // Only check active tasks
    };

    // FIXED: Use prescription-specific criteria instead of medication name to allow multiple prescriptions
    // This allows multiple prescriptions for the same medication with different schedules
    if (prescriptionId) {
      duplicateQuery['medicationDetails.prescriptionId'] = prescriptionId;
    } else if (medicationName) {
      // Only use medication name if no prescription ID (fallback for older logic)
      duplicateQuery['medicationDetails.medicationName'] = medicationName;
    }

    // Add service-specific criteria if available
    if (serviceId) {
      duplicateQuery.serviceId = serviceId;
    }

    console.log(`🔍 [DUPLICATE CHECK] Checking for duplicates with query:`, duplicateQuery);

    // Execute query with or without session
    const existingTask = session 
      ? await NurseTask.findOne(duplicateQuery).session(session)
      : await NurseTask.findOne(duplicateQuery);

    if (existingTask) {
      console.log(`⚠️ [DUPLICATE CHECK] Found existing task: ${existingTask._id} for ${medicationName}`);
      return existingTask;
    }

    console.log(`✅ [DUPLICATE CHECK] No duplicate found for ${medicationName}`);
    return null;

  } catch (error) {
    console.error('❌ [DUPLICATE CHECK] Error checking for duplicates:', error);
    throw error;
  }
}

/**
 * Create a nurse task only if no duplicate exists
 * @param {Object} taskData - The task data to create
 * @param {Object} duplicateCriteria - Criteria to check for duplicates
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise<Object>} - Created task or existing task if duplicate found
 */
async function createTaskIfNoDuplicate(taskData, duplicateCriteria, session = null) {
  try {
    console.log(`🔄 [TASK CREATION] Attempting to create task for ${duplicateCriteria.medicationName}`);

    // Check for existing task
    const existingTask = await checkForDuplicateTask(duplicateCriteria, session);

    if (existingTask) {
      console.log(`⚠️ [TASK CREATION] Duplicate detected, skipping creation. Existing task: ${existingTask._id}`);
      return {
        task: existingTask,
        created: false,
        reason: 'duplicate_found'
      };
    }

    // Ensure task has payment authorization before creating
    let finalTaskData = { ...taskData };
    
    // Try to get actual payment data from prescription first
    if (!finalTaskData.paymentAuthorization && finalTaskData.medicationDetails) {
      try {
        const AutoPaymentSync = require('./autoPaymentSync');
        const Prescription = require('../models/Prescription');
        
        // Find the corresponding prescription
        const prescription = await Prescription.findOne({
          patient: finalTaskData.patientId,
          medicationName: finalTaskData.medicationDetails.medicationName,
          createdAt: { $lte: new Date() }
        }).sort({ createdAt: -1 });
        
        if (prescription) {
          // Get actual payment data from prescription
          const actualPaymentData = await AutoPaymentSync.getActualPaymentData(prescription);
          
          if (actualPaymentData) {
            finalTaskData.paymentAuthorization = {
              paidDays: actualPaymentData.paidDays,
              totalDays: actualPaymentData.totalDays,
              paymentStatus: actualPaymentData.paymentStatus,
              canAdminister: actualPaymentData.authorizedDoses > 0,
              restrictionMessage: AutoPaymentSync.getRestrictionMessage(actualPaymentData),
              authorizedDoses: actualPaymentData.authorizedDoses,
              unauthorizedDoses: actualPaymentData.unauthorizedDoses,
              outstandingAmount: actualPaymentData.outstandingAmount,
              lastUpdated: new Date()
            };
            console.log(`✅ [TASK CREATION] Added actual payment authorization for ${duplicateCriteria.medicationName} (${actualPaymentData.paymentStatus})`);
          } else {
            // Fallback to default calculation
            const PaymentCalculation = require('./paymentCalculation');
            const costBreakdown = PaymentCalculation.calculateMedicationCost(
              finalTaskData.medicationDetails.frequency,
              finalTaskData.medicationDetails.duration,
              finalTaskData.medicationDetails.medicationName
            );
            
            const paymentAuth = PaymentCalculation.calculatePaymentAuthorization(
              {
                frequency: finalTaskData.medicationDetails.frequency,
                duration: finalTaskData.medicationDetails.duration
              },
              0, // amountPaid - unpaid initially
              costBreakdown.totalCost
            );
            
            finalTaskData.paymentAuthorization = paymentAuth;
            console.log(`✅ [TASK CREATION] Added calculated payment authorization for ${duplicateCriteria.medicationName}`);
          }
        } else {
          // No prescription found, use default calculation
          const PaymentCalculation = require('./paymentCalculation');
          const costBreakdown = PaymentCalculation.calculateMedicationCost(
            finalTaskData.medicationDetails.frequency,
            finalTaskData.medicationDetails.duration,
            finalTaskData.medicationDetails.medicationName
          );
          
          const paymentAuth = PaymentCalculation.calculatePaymentAuthorization(
            {
              frequency: finalTaskData.medicationDetails.frequency,
              duration: finalTaskData.medicationDetails.duration
            },
            0, // amountPaid - unpaid initially
            costBreakdown.totalCost
          );
          
          finalTaskData.paymentAuthorization = paymentAuth;
          console.log(`✅ [TASK CREATION] Added default payment authorization for ${duplicateCriteria.medicationName}`);
        }
      } catch (error) {
        console.warn(`⚠️ [TASK CREATION] Error calculating payment authorization: ${error.message}`);
        // Set default unpaid authorization
        finalTaskData.paymentAuthorization = {
          paidDays: 0,
          totalDays: finalTaskData.medicationDetails?.duration || 7,
          paymentStatus: 'unpaid',
          canAdminister: false,
          restrictionMessage: 'Payment required before administration',
          authorizedDoses: 0,
          unauthorizedDoses: 0,
          outstandingAmount: 0,
          lastUpdated: new Date()
        };
      }
    }

    // Create new task
    const newTask = session 
      ? new NurseTask(finalTaskData)
      : new NurseTask(finalTaskData);

    await newTask.save({ session });
    
    console.log(`✅ [TASK CREATION] Successfully created new task: ${newTask._id}`);
    return {
      task: newTask,
      created: true,
      reason: 'new_task_created'
    };

  } catch (error) {
    console.error('❌ [TASK CREATION] Error creating task:', error);
    throw error;
  }
}

/**
 * Update existing task or create new one if no duplicate exists
 * @param {Object} taskData - The task data
 * @param {Object} duplicateCriteria - Criteria to check for duplicates
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise<Object>} - Task and creation status
 */
async function updateOrCreateTask(taskData, duplicateCriteria, session = null) {
  try {
    console.log(`🔄 [UPDATE/CREATE] Processing task for ${duplicateCriteria.medicationName}`);

    // Check for existing task
    const existingTask = await checkForDuplicateTask(duplicateCriteria, session);

    if (existingTask) {
      // Update existing task with new data and payment authorization
      console.log(`🔄 [UPDATE/CREATE] Updating existing task: ${existingTask._id}`);
      
      // Update task fields
      Object.assign(existingTask, taskData);
      existingTask.updatedAt = new Date();
      
      // If we have payment authorization data, update it for all existing tasks for this medication
      if (taskData.paymentAuthorization && taskData.medicationDetails?.medicationName) {
        await updatePaymentAuthorizationForExistingTasks(
          taskData.patientId,
          taskData.medicationDetails.medicationName,
          taskData.paymentAuthorization,
          session
        );
      }
      
      await existingTask.save({ session });
      
      console.log(`✅ [UPDATE/CREATE] Successfully updated existing task: ${existingTask._id}`);
      return {
        task: existingTask,
        created: false,
        updated: true,
        reason: 'existing_task_updated'
      };
    }

    // Ensure task has payment authorization before creating
    let finalTaskData = { ...taskData };
    
    // Try to get actual payment data from prescription first
    if (!finalTaskData.paymentAuthorization && finalTaskData.medicationDetails) {
      try {
        const AutoPaymentSync = require('./autoPaymentSync');
        const Prescription = require('../models/Prescription');
        
        // Find the corresponding prescription
        const prescription = await Prescription.findOne({
          patient: finalTaskData.patientId,
          medicationName: finalTaskData.medicationDetails.medicationName,
          createdAt: { $lte: new Date() }
        }).sort({ createdAt: -1 });
        
        if (prescription) {
          // Get actual payment data from prescription
          const actualPaymentData = await AutoPaymentSync.getActualPaymentData(prescription);
          
          if (actualPaymentData) {
            finalTaskData.paymentAuthorization = {
              paidDays: actualPaymentData.paidDays,
              totalDays: actualPaymentData.totalDays,
              paymentStatus: actualPaymentData.paymentStatus,
              canAdminister: actualPaymentData.authorizedDoses > 0,
              restrictionMessage: AutoPaymentSync.getRestrictionMessage(actualPaymentData),
              authorizedDoses: actualPaymentData.authorizedDoses,
              unauthorizedDoses: actualPaymentData.unauthorizedDoses,
              outstandingAmount: actualPaymentData.outstandingAmount,
              lastUpdated: new Date()
            };
            console.log(`✅ [UPDATE/CREATE] Added actual payment authorization for ${duplicateCriteria.medicationName} (${actualPaymentData.paymentStatus})`);
          } else {
            // Fallback to default calculation
            const PaymentCalculation = require('./paymentCalculation');
            const costBreakdown = PaymentCalculation.calculateMedicationCost(
              finalTaskData.medicationDetails.frequency,
              finalTaskData.medicationDetails.duration,
              finalTaskData.medicationDetails.medicationName
            );
            
            const paymentAuth = PaymentCalculation.calculatePaymentAuthorization(
              {
                frequency: finalTaskData.medicationDetails.frequency,
                duration: finalTaskData.medicationDetails.duration
              },
              0, // amountPaid - unpaid initially
              costBreakdown.totalCost
            );
            
            finalTaskData.paymentAuthorization = paymentAuth;
            console.log(`✅ [UPDATE/CREATE] Added calculated payment authorization for ${duplicateCriteria.medicationName}`);
          }
        } else {
          // No prescription found, use default calculation
          const PaymentCalculation = require('./paymentCalculation');
          const costBreakdown = PaymentCalculation.calculateMedicationCost(
            finalTaskData.medicationDetails.frequency,
            finalTaskData.medicationDetails.duration,
            finalTaskData.medicationDetails.medicationName
          );
          
          const paymentAuth = PaymentCalculation.calculatePaymentAuthorization(
            {
              frequency: finalTaskData.medicationDetails.frequency,
              duration: finalTaskData.medicationDetails.duration
            },
            0, // amountPaid - unpaid initially
            costBreakdown.totalCost
          );
          
          finalTaskData.paymentAuthorization = paymentAuth;
          console.log(`✅ [UPDATE/CREATE] Added default payment authorization for ${duplicateCriteria.medicationName}`);
        }
      } catch (error) {
        console.warn(`⚠️ [UPDATE/CREATE] Error calculating payment authorization: ${error.message}`);
        // Set default unpaid authorization
        finalTaskData.paymentAuthorization = {
          paidDays: 0,
          totalDays: finalTaskData.medicationDetails?.duration || 7,
          paymentStatus: 'unpaid',
          canAdminister: false,
          restrictionMessage: 'Payment required before administration',
          authorizedDoses: 0,
          unauthorizedDoses: 0,
          outstandingAmount: 0,
          lastUpdated: new Date()
        };
      }
    }

    // Create new task
    const newTask = session 
      ? new NurseTask(finalTaskData)
      : new NurseTask(finalTaskData);

    await newTask.save({ session });
    
    console.log(`✅ [UPDATE/CREATE] Successfully created new task: ${newTask._id}`);
    return {
      task: newTask,
      created: true,
      updated: false,
      reason: 'new_task_created'
    };

  } catch (error) {
    console.error('❌ [UPDATE/CREATE] Error processing task:', error);
    throw error;
  }
}

/**
 * Clean up duplicate tasks for a specific patient and medication
 * @param {string} patientId - Patient ID
 * @param {string} medicationName - Medication name
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise<number>} - Number of duplicates removed
 */
async function cleanupDuplicateTasks(
  patientId,
  medicationName,
  frequency = null,
  dosage = null,
  route = null,
  prescriptionId = null,
  session = null
) {
  try {
    console.log(`🧹 [CLEANUP] Cleaning up duplicates for ${medicationName} (Patient: ${patientId})`);

    // Find all tasks for this patient and medication
    const query = {
      patientId: patientId,
      'medicationDetails.medicationName': medicationName,
      taskType: 'MEDICATION',
      status: { $in: ['PENDING', 'IN_PROGRESS'] }
    };

    // Only dedupe exact same schedule/identity so BID/QD/TID/QID all co-exist
    if (prescriptionId) {
      query['medicationDetails.prescriptionId'] = prescriptionId;
    }
    if (frequency) {
      query['medicationDetails.frequency'] = frequency;
    }
    if (dosage) {
      query['medicationDetails.dosage'] = dosage;
    }
    if (route) {
      query['medicationDetails.route'] = route;
    }

    const allTasks = session 
      ? await NurseTask.find(query).session(session).sort({ createdAt: 1 })
      : await NurseTask.find(query).sort({ createdAt: 1 });

    if (allTasks.length <= 1) {
      console.log(`✅ [CLEANUP] No duplicates found for ${medicationName}`);
      return 0;
    }

    console.log(`🔍 [CLEANUP] Found ${allTasks.length} tasks for ${medicationName}`);

    // SMART DUPLICATE PREVENTION: Always keep the best task based on comprehensive criteria
    const bestTask = allTasks.reduce((best, current) => {
      const bestPayment = best.paymentAuthorization;
      const currentPayment = current.paymentAuthorization;
      
      // Priority order: paid > partially paid > unpaid > no payment
      const getPaymentPriority = (payment) => {
        if (!payment) return 0;
        
        // Check if it's fully paid (no outstanding amount and has authorized doses)
        if (payment.outstandingAmount === 0 && payment.authorizedDoses > 0) {
          return 5; // Highest priority - fully paid
        }
        
        // Check payment status field
        if (payment.paymentStatus === 'fully_paid' || payment.paymentStatus === 'paid') return 4;
        if (payment.paymentStatus === 'partial' || payment.paymentStatus === 'partially_paid') return 3;
        if (payment.paymentStatus === 'unpaid') return 2;
        
        // Check if it has any payment information
        if (payment.authorizedDoses > 0 || payment.outstandingAmount > 0) return 1;
        
        return 0; // No payment info
      };
      
      const bestPriority = getPaymentPriority(bestPayment);
      const currentPriority = getPaymentPriority(currentPayment);
      
      // If payment priority is the same, prefer the one with more authorized doses
      if (bestPriority === currentPriority) {
        const bestDoses = bestPayment?.authorizedDoses || 0;
        const currentDoses = currentPayment?.authorizedDoses || 0;
        
        if (bestDoses === currentDoses) {
          // If doses are the same, prefer the one with more recent payment update
          const bestPaymentUpdate = bestPayment?.lastUpdated ? new Date(bestPayment.lastUpdated) : new Date(0);
          const currentPaymentUpdate = currentPayment?.lastUpdated ? new Date(currentPayment.lastUpdated) : new Date(0);
          
          if (bestPaymentUpdate.getTime() === currentPaymentUpdate.getTime()) {
            // If payment updates are the same, keep the most recently updated task
            const bestUpdated = new Date(best.updatedAt || best.createdAt || 0);
            const currentUpdated = new Date(current.updatedAt || current.createdAt || 0);
            return bestUpdated.getTime() > currentUpdated.getTime() ? best : current;
          }
          
          return bestPaymentUpdate.getTime() > currentPaymentUpdate.getTime() ? best : current;
        }
        
        return bestDoses > currentDoses ? best : current;
      }
      
      return bestPriority > currentPriority ? best : current;
    });
    
    const tasksToRemove = allTasks.filter(task => task._id.toString() !== bestTask._id.toString());
    let removedCount = 0;

    console.log(`✅ [CLEANUP] Keeping best task: ${bestTask._id} (has payment: ${!!bestTask.paymentAuthorization})`);

    for (const task of tasksToRemove) {
      try {
        if (session) {
          await NurseTask.findByIdAndDelete(task._id).session(session);
        } else {
          await NurseTask.findByIdAndDelete(task._id);
        }
        removedCount++;
        console.log(`🗑️ [CLEANUP] Removed duplicate task: ${task._id}`);
      } catch (error) {
        console.error(`❌ [CLEANUP] Error removing task ${task._id}:`, error);
      }
    }

    console.log(`✅ [CLEANUP] Removed ${removedCount} duplicate tasks for ${medicationName}`);
    return removedCount;

  } catch (error) {
    console.error('❌ [CLEANUP] Error cleaning up duplicates:', error);
    throw error;
  }
}

/**
 * Update payment authorization for existing tasks when duplicate medications are prescribed
 * @param {string} patientId - Patient ID
 * @param {string} medicationName - Medication name
 * @param {Object} paymentAuthorization - New payment authorization data
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise<number>} - Number of tasks updated
 */
async function updatePaymentAuthorizationForExistingTasks(patientId, medicationName, paymentAuthorization, session = null) {
  try {
    console.log(`🔄 [PAYMENT UPDATE] Updating payment authorization for ${medicationName} for patient ${patientId}`);

    // Find all existing tasks for this patient and medication
    const existingTasks = session 
      ? await NurseTask.find({
          patientId: patientId,
          'medicationDetails.medicationName': medicationName,
          taskType: 'MEDICATION'
        }).session(session)
      : await NurseTask.find({
          patientId: patientId,
          'medicationDetails.medicationName': medicationName,
          taskType: 'MEDICATION'
        });

    console.log(`📋 [PAYMENT UPDATE] Found ${existingTasks.length} existing tasks for ${medicationName}`);

    let updatedCount = 0;
    for (const task of existingTasks) {
      try {
        // Update payment authorization
        task.paymentAuthorization = {
          ...task.paymentAuthorization, // Keep existing fields
          ...paymentAuthorization, // Override with new payment data
          lastUpdated: new Date()
        };

        // Save the task
        if (session) {
          await task.save({ session });
        } else {
          await task.save();
        }

        updatedCount++;
        console.log(`✅ [PAYMENT UPDATE] Updated task ${task._id} for ${medicationName} with payment status: ${paymentAuthorization.paymentStatus}`);
      } catch (error) {
        console.error(`❌ [PAYMENT UPDATE] Error updating task ${task._id}:`, error.message);
      }
    }

    console.log(`🎉 [PAYMENT UPDATE] Successfully updated ${updatedCount} tasks for ${medicationName}`);
    return updatedCount;

  } catch (error) {
    console.error('❌ [PAYMENT UPDATE] Error updating payment authorization:', error);
    throw error;
  }
}

/**
 * Update existing task with new prescription information
 * @param {Object} existingTask - Existing nurse task
 * @param {Object} newTaskData - New task data
 * @param {string} prescriptionId - New prescription ID
 * @returns {Promise<Object>} - Updated task
 */
async function updateExistingTaskWithNewPrescription(existingTask, newTaskData, prescriptionId) {
  try {
    console.log(`🔄 [TASK UPDATE] Updating existing task ${existingTask._id} with new prescription ${prescriptionId}`);
    
    // Add the new prescription ID to the task if not already present
    if (prescriptionId && existingTask.prescriptionIds) {
      if (!existingTask.prescriptionIds.includes(prescriptionId)) {
        existingTask.prescriptionIds.push(prescriptionId);
      }
    } else if (prescriptionId) {
      existingTask.prescriptionIds = [existingTask.prescriptionId, prescriptionId].filter(Boolean);
    }
    
    // Update the task description to reflect multiple prescriptions
    if (existingTask.prescriptionIds && existingTask.prescriptionIds.length > 1) {
      existingTask.description = `${existingTask.medicationDetails?.medicationName || 'Medication'} - Multiple prescriptions (${existingTask.prescriptionIds.length})`;
    }
    
    // Update the notes to include new prescription information
    const newNote = `Additional prescription ${prescriptionId} added on ${new Date().toLocaleDateString()}`;
    existingTask.notes = existingTask.notes ? `${existingTask.notes}\n${newNote}` : newNote;
    
    // Save the updated task
    await existingTask.save();
    
    console.log(`✅ [TASK UPDATE] Successfully updated task ${existingTask._id} with new prescription`);
    return existingTask;
    
  } catch (error) {
    console.error(`❌ [TASK UPDATE] Error updating existing task:`, error);
    throw error;
  }
}

/**
 * Comprehensive duplicate prevention for medication tasks
 * @param {Object} taskData - Task data to create
 * @param {string} patientId - Patient ID
 * @param {string} medicationName - Medication name
 * @param {string} prescriptionId - Prescription ID (optional)
 * @param {string} serviceId - Service ID (optional)
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise<Object>} - Task and operation result
 */
async function createMedicationTaskWithDuplicatePrevention(
  taskData, 
  patientId, 
  medicationName, 
  prescriptionId = null, 
  serviceId = null, 
  session = null
) {
  try {
    console.log(`🛡️ [DUPLICATE PREVENTION] Creating medication task for ${medicationName}`);

    // CRITICAL FIX: Ensure patient name is properly populated
    const validatedTaskData = await ensurePatientNameInTask(taskData);
    
    // Log the patient name validation result
    if (validatedTaskData.patientName && 
        validatedTaskData.patientName !== 'Unknown' && 
        validatedTaskData.patientName !== 'Unknown Patient') {
      console.log(`✅ [PATIENT NAME] Task will be created with patient name: ${validatedTaskData.patientName}`);
    } else {
      console.warn(`⚠️ [PATIENT NAME] Task will be created with patient name: ${validatedTaskData.patientName || 'undefined'}`);
    }

    // CRITICAL FIX: Allow multiple tasks for the same medication in the same prescription
    // Each medication entry should create a separate task, even if medication name is the same
    // Only prevent true duplicates (exact same task already exists)
    const prescriptionIdToCheck = prescriptionId || validatedTaskData.medicationDetails?.prescriptionId || null;
    
    // Don't prevent creation based on medication name alone - allow multiple tasks for same medication
    // The calling code should handle counting and preventing duplicates if needed
    // This function will only prevent if there's an exact duplicate (same prescription + medication + exact same details)
    console.log(`ℹ️ [DUPLICATE PREVENTION] Allowing task creation for ${medicationName} in prescription ${prescriptionIdToCheck || 'no-prescription'}`);

    // Don't clean up duplicates here - allow multiple tasks for same medication
    // The calling code handles preventing duplicates within the same prescription
    
    // Create the new task directly without strict duplicate checking
    // We allow multiple tasks for the same medication in the same prescription
    try {
      const newTask = session 
        ? new NurseTask(validatedTaskData)
        : new NurseTask(validatedTaskData);

      await newTask.save({ session });
      
      console.log(`✅ [DUPLICATE PREVENTION] Successfully created new task: ${newTask._id} for ${medicationName}`);
      return {
        task: newTask,
        created: true,
        reason: 'new_task_created'
      };
    } catch (error) {
      console.error('❌ [DUPLICATE PREVENTION] Error creating task:', error);
      throw error;
    }

  } catch (error) {
    console.error('❌ [DUPLICATE PREVENTION] Error in duplicate prevention:', error);
    throw error;
  }
}

module.exports = {
  checkForDuplicateTask,
  createTaskIfNoDuplicate,
  updateOrCreateTask,
  cleanupDuplicateTasks,
  createMedicationTaskWithDuplicatePrevention,
  updatePaymentAuthorizationForExistingTasks,
  ensurePatientNameInTask,
  updateExistingTaskWithNewPrescription
}; 

 
