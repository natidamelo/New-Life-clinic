/**
 * Payment Synchronization Utility
 * 
 * This utility ensures that nurse tasks are automatically updated
 * whenever payments are processed, keeping payment status in sync
 */

const NurseTask = require('../models/NurseTask');

/**
 * Synchronize nurse tasks after payment processing
 * @param {string} prescriptionId - The prescription ID
 * @param {Object} paymentAuthorization - The updated payment authorization data
 * @param {Object} session - MongoDB session (optional)
 */
async function syncNurseTasksAfterPayment(prescriptionId, paymentAuthorization, session = null) {
  try {
    console.log(`🔄 [PAYMENT SYNC] Synchronizing nurse tasks for prescription ${prescriptionId}...`);
    
    // Find all existing nurse tasks for this prescription
    const query = { 'medicationDetails.prescriptionId': prescriptionId };
    const existingTasks = session 
      ? await NurseTask.find(query).session(session)
      : await NurseTask.find(query);

    console.log(`📋 [PAYMENT SYNC] Found ${existingTasks.length} nurse tasks to update`);

    let updatedCount = 0;
    for (const task of existingTasks) {
      try {
        // Update task with new payment authorization
        task.paymentAuthorization = {
          paidDays: paymentAuthorization.paidDays || 0,
          totalDays: paymentAuthorization.totalDays || 0,
          paymentStatus: paymentAuthorization.paymentStatus || 'unpaid',
          canAdminister: (paymentAuthorization.paidDays || 0) > 0,
          restrictionMessage: paymentAuthorization.restrictionMessage || '',
          authorizedDoses: paymentAuthorization.authorizedDoses || 0,
          unauthorizedDoses: paymentAuthorization.unauthorizedDoses || 0,
          outstandingAmount: paymentAuthorization.outstandingAmount || 0,
          lastUpdated: new Date()
        };

        // Save the task
        if (session) {
          await task.save({ session });
        } else {
          await task.save();
        }

        updatedCount++;
        console.log(`✅ [PAYMENT SYNC] Updated nurse task ${task._id} for ${task.medicationDetails?.medicationName}`);
        
      } catch (error) {
        console.error(`❌ [PAYMENT SYNC] Error updating nurse task ${task._id}:`, error.message);
      }
    }

    console.log(`🎉 [PAYMENT SYNC] Successfully updated ${updatedCount} nurse tasks`);
    return updatedCount;

  } catch (error) {
    console.error('❌ [PAYMENT SYNC] Error synchronizing nurse tasks:', error);
    throw error;
  }
}

/**
 * Synchronize nurse tasks for multi-medication payment
 * @param {string} prescriptionId - The prescription ID
 * @param {Array} medicationPaymentPlans - Array of medication payment plans
 * @param {Object} session - MongoDB session (optional)
 */
async function syncNurseTasksForMultiMedication(prescriptionId, medicationPaymentPlans, session = null) {
  try {
    console.log(`🔄 [PAYMENT SYNC] Synchronizing nurse tasks for multi-medication payment...`);
    
    // Find all existing nurse tasks for this prescription
    const query = { 'medicationDetails.prescriptionId': prescriptionId };
    const existingTasks = session 
      ? await NurseTask.find(query).session(session)
      : await NurseTask.find(query);

    console.log(`📋 [PAYMENT SYNC] Found ${existingTasks.length} nurse tasks to update`);

    let updatedCount = 0;
    for (const task of existingTasks) {
      try {
        // Find the corresponding medication plan
        const medicationPlan = medicationPaymentPlans.find(
          plan => plan.medicationName === task.medicationDetails?.medicationName
        );

        if (medicationPlan) {
          // Update task with new payment authorization
          task.paymentAuthorization = {
            paidDays: medicationPlan.paidDays || 0,
            totalDays: medicationPlan.totalDays || 0,
            paymentStatus: medicationPlan.paymentStatus || 'unpaid',
            canAdminister: (medicationPlan.paidDays || 0) > 0,
            restrictionMessage: medicationPlan.paidDays < medicationPlan.totalDays 
              ? `Payment covers only ${medicationPlan.paidDays} of ${medicationPlan.totalDays} days`
              : 'Fully paid - no restrictions',
            authorizedDoses: medicationPlan.paidDoses || 0,
            unauthorizedDoses: medicationPlan.unpaidDoses || 0,
            outstandingAmount: medicationPlan.outstandingAmount || 0,
            lastUpdated: new Date()
          };

          // Save the task
          if (session) {
            await task.save({ session });
          } else {
            await task.save();
          }

          updatedCount++;
          console.log(`✅ [PAYMENT SYNC] Updated nurse task ${task._id} for ${medicationPlan.medicationName}`);
        } else {
          console.log(`⚠️ [PAYMENT SYNC] No payment plan found for ${task.medicationDetails?.medicationName}`);
        }
        
      } catch (error) {
        console.error(`❌ [PAYMENT SYNC] Error updating nurse task ${task._id}:`, error.message);
      }
    }

    console.log(`🎉 [PAYMENT SYNC] Successfully updated ${updatedCount} nurse tasks`);
    return updatedCount;

  } catch (error) {
    console.error('❌ [PAYMENT SYNC] Error synchronizing nurse tasks:', error);
    throw error;
  }
}

module.exports = {
  syncNurseTasksAfterPayment,
  syncNurseTasksForMultiMedication
}; 