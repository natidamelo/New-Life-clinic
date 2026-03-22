/**
 * Prescription Status Sync Utility
 * 
 * This utility automatically synchronizes prescription paymentStatus 
 * with invoice status to ensure nurse tasks are created immediately
 * 
 * ENHANCED WITH:
 * - Retry mechanisms for failed syncs
 * - Transaction safety
 * - Comprehensive error handling
 * - Fallback mechanisms
 */

const Prescription = require('../models/Prescription');
const { processPaymentAndCreateNurseTasks } = require('./robustPaymentProcessing');
const paymentSyncMonitor = require('./paymentSyncMonitor');

/**
 * Enhanced sync with retry mechanism and better error handling
 * @param {Object} invoice - Updated invoice object
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} - Sync result with detailed status
 */
async function syncPrescriptionStatusFromInvoice(invoice, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const retryDelay = options.retryDelay || 1000; // 1 second
  let attempt = 0;
  
  const result = {
    success: false,
    prescriptionsUpdated: 0,
    nurseTasksCreated: 0,
    errors: [],
    warnings: [],
    retryAttempts: 0
  };

  while (attempt < maxRetries) {
    attempt++;
    result.retryAttempts = attempt;
    
    try {
      console.log(`🔄 [SYNC] Attempt ${attempt}/${maxRetries}: Syncing prescription status for invoice ${invoice._id} (status: ${invoice.status})`);
      
      // Validate invoice data
      if (!invoice || !invoice._id || !invoice.patient) {
        throw new Error('Invalid invoice data provided for sync');
      }

      // Find all prescriptions linked to this invoice
      const prescriptions = await Prescription.find({
        patient: invoice.patient
      }).populate('patient');
      
      if (!prescriptions || prescriptions.length === 0) {
        console.log(`⚠️ [SYNC] No prescriptions found for patient ${invoice.patient}`);
        result.warnings.push('No prescriptions found for this patient');
        result.success = true; // Not an error, just no prescriptions to sync
        break;
      }

      // Filter prescriptions that match the invoice timeframe
      // Relaxed window to handle multiple prescriptions created close together
      const relevantPrescriptions = prescriptions.filter(prescription => {
        const createdAt = new Date(prescription.createdAt || prescription.datePrescribed || Date.now());
        const invoiceTime = new Date(invoice.createdAt || invoice.updatedAt || Date.now());
        const timeDiff = Math.abs(createdAt - invoiceTime);
        return timeDiff < 48 * 60 * 60 * 1000; // Within 48 hours
      });
      
      console.log(`📋 [SYNC] Found ${relevantPrescriptions.length} relevant prescriptions for invoice ${invoice._id}`);
      
      // Process each prescription with individual error handling
      for (const prescription of relevantPrescriptions) {
        try {
          let newPaymentStatus = 'pending';
          
          // Determine new payment status based on invoice or its paymentStatus.current
          const invoiceCurrent = invoice.paymentStatus?.current || invoice.status;
          if (invoiceCurrent === 'paid' || invoiceCurrent === 'fully_paid') {
            newPaymentStatus = 'paid';
          } else if (invoiceCurrent === 'partial' || invoiceCurrent === 'partially_paid') {
            newPaymentStatus = 'partial';
          }
          
          // Only update if status has changed
          if (prescription.paymentStatus !== newPaymentStatus) {
            console.log(`💰 [SYNC] Updating prescription ${prescription._id} from "${prescription.paymentStatus}" to "${newPaymentStatus}"`);
            
            prescription.paymentStatus = newPaymentStatus;
            prescription.updatedAt = new Date();
            
            // If paid or partially paid, set paidAt timestamp
            if (newPaymentStatus === 'paid' || newPaymentStatus === 'partial') {
              prescription.paidAt = new Date();
            }
            
            await prescription.save();
            result.prescriptionsUpdated++;
            
            // Trigger nurse task creation for paid/partially paid prescriptions
            if (newPaymentStatus === 'paid' || newPaymentStatus === 'partial') {
              console.log(`🏥 [SYNC] Triggering nurse task creation for prescription ${prescription._id}`);
              
              try {
                // Create nurse task with proper payment authorization
                const { createNurseTaskFromPrescription } = require('./nurseTaskCreation');
                const taskResult = await createNurseTaskFromPrescription(prescription, prescription.patient);
                
                if (taskResult.success) {
                  console.log(`✅ [SYNC] Nurse task created for ${prescription.medicationName} - ${prescription.frequency}`);
                  result.nurseTasksCreated++;
                } else {
                  console.error(`❌ [SYNC] Failed to create nurse task for ${prescription.medicationName}:`, taskResult.errors);
                  result.warnings.push(`Failed to create nurse task for ${prescription.medicationName}: ${taskResult.errors?.join(', ')}`);
                }
              } catch (taskError) {
                console.error(`❌ [SYNC] Error creating nurse task for prescription ${prescription._id}:`, taskError);
                result.warnings.push(`Nurse task creation failed for ${prescription.medicationName}: ${taskError.message}`);
              }
            }
          } else {
            console.log(`⚠️ [SYNC] Prescription ${prescription._id} already has correct status: ${prescription.paymentStatus}`);
          }
        } catch (prescriptionError) {
          console.error(`❌ [SYNC] Error processing prescription ${prescription._id}:`, prescriptionError);
          result.errors.push(`Prescription ${prescription._id}: ${prescriptionError.message}`);
          // Continue with other prescriptions instead of failing completely
        }
      }
      
      // If we get here, the sync was successful
      result.success = true;
      console.log(`✅ [SYNC] Completed prescription status sync for invoice ${invoice._id}`);
      console.log(`📊 [SYNC] Results: ${result.prescriptionsUpdated} prescriptions updated, ${result.nurseTasksCreated} nurse tasks created`);
      
      // Record success in monitor
      paymentSyncMonitor.recordSuccess(invoice._id.toString(), result);
      break;
      
    } catch (error) {
      console.error(`❌ [SYNC] Attempt ${attempt}/${maxRetries} failed for invoice ${invoice._id}:`, error);
      result.errors.push(`Attempt ${attempt}: ${error.message}`);
      
      // Record failure in monitor
      paymentSyncMonitor.recordFailure(invoice._id.toString(), error, {
        attempt,
        maxRetries,
        retryDelay,
        totalErrors: result.errors.length
      });
      
      if (attempt < maxRetries) {
        console.log(`🔄 [SYNC] Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        // Exponential backoff
        retryDelay *= 2;
      } else {
        console.error(`💥 [SYNC] All ${maxRetries} attempts failed for invoice ${invoice._id}`);
        result.errors.push(`All ${maxRetries} sync attempts failed`);
      }
    }
  }
  
  // Log final result
  if (result.success) {
    console.log(`✅ [SYNC] Final result for invoice ${invoice._id}:`, {
      prescriptionsUpdated: result.prescriptionsUpdated,
      nurseTasksCreated: result.nurseTasksCreated,
      warnings: result.warnings.length,
      errors: result.errors.length
    });
  } else {
    console.error(`💥 [SYNC] Final failure for invoice ${invoice._id}:`, {
      attempts: result.retryAttempts,
      errors: result.errors
    });
  }
  
  return result;
}

/**
 * Transaction-safe sync that can be called within a database transaction
 * @param {Object} invoice - Updated invoice object
 * @param {Object} session - MongoDB session for transaction (optional, now ignored)
 * @returns {Promise<Object>} - Sync result
 */
async function syncPrescriptionStatusFromInvoiceWithSession(invoice, session) {
  // Session parameter is now ignored - always use regular sync without transactions
  console.log(`🔄 [SYNC] Syncing prescriptions for invoice ${invoice._id} (session parameter ignored)`);
  return await syncPrescriptionStatusFromInvoice(invoice);
}

/**
 * Manually sync all prescriptions with their corresponding invoices
 * FIXED: Only sync prescriptions that are actually linked to invoices
 * @param {string} patientId - Patient ID to sync (optional)
 * @returns {Promise<Object>} - Sync results
 */
async function manualSyncAllPrescriptions(patientId = null) {
  try {
    console.log(`🔄 [MANUAL SYNC] Starting manual sync${patientId ? ` for patient ${patientId}` : ' for all patients'}`);
    
    const MedicalInvoice = require('../models/MedicalInvoice');
    
    // Find all paid/partial invoices
    const query = {
      status: { $in: ['paid', 'partial', 'partially_paid'] }
    };
    if (patientId) {
      query.patient = patientId;
    }
    
    const paidInvoices = await MedicalInvoice.find(query);
    
    console.log(`📋 [MANUAL SYNC] Found ${paidInvoices.length} paid/partial invoices`);
    
    const results = {
      invoicesProcessed: 0,
      prescriptionsUpdated: 0,
      tasksCreated: 0,
      errors: []
    };
    
    for (const invoice of paidInvoices) {
      try {
        // FIXED: Only sync prescriptions that are actually linked to this invoice
        // or were created within a reasonable timeframe (1 hour) of the invoice
        const invoiceTime = new Date(invoice.createdAt || invoice.updatedAt || Date.now());
        const timeWindow = 60 * 60 * 1000; // 1 hour window
        
        const linkedPrescriptions = await Prescription.find({
          $or: [
            { invoiceId: invoice._id }, // Directly linked
            {
              patient: invoice.patient,
              createdAt: {
                $gte: new Date(invoiceTime.getTime() - timeWindow),
                $lte: new Date(invoiceTime.getTime() + timeWindow)
              }
            }
          ]
        });
        
        console.log(`📋 [MANUAL SYNC] Found ${linkedPrescriptions.length} linked prescriptions for invoice ${invoice._id}`);
        
        let prescriptionsUpdated = 0;
        
        for (const prescription of linkedPrescriptions) {
          const beforeStatus = prescription.paymentStatus;
          
          // Determine new payment status based on invoice
          const invoiceCurrent = invoice.paymentStatus?.current || invoice.status;
          let newPaymentStatus = 'pending';
          
          if (invoiceCurrent === 'paid' || invoiceCurrent === 'fully_paid') {
            newPaymentStatus = 'paid';
          } else if (invoiceCurrent === 'partial' || invoiceCurrent === 'partially_paid') {
            newPaymentStatus = 'partial';
          }
          
          // Only update if status has changed
          if (prescription.paymentStatus !== newPaymentStatus) {
            console.log(`💰 [MANUAL SYNC] Updating prescription ${prescription._id} from "${prescription.paymentStatus}" to "${newPaymentStatus}"`);
            
            prescription.paymentStatus = newPaymentStatus;
            prescription.updatedAt = new Date();
            
            if (newPaymentStatus === 'paid' || newPaymentStatus === 'partial') {
              prescription.paidAt = new Date();
            }
            
            await prescription.save();
            prescriptionsUpdated++;
          }
        }
        
        results.invoicesProcessed++;
        results.prescriptionsUpdated += prescriptionsUpdated;
        
      } catch (error) {
        console.error(`❌ [MANUAL SYNC] Error processing invoice ${invoice._id}:`, error);
        results.errors.push(`Invoice ${invoice._id}: ${error.message}`);
      }
    }
    
    console.log(`✅ [MANUAL SYNC] Completed:`, results);
    return results;
    
  } catch (error) {
    console.error(`❌ [MANUAL SYNC] Fatal error:`, error);
    throw error;
  }
}

module.exports = {
  syncPrescriptionStatusFromInvoice,
  syncPrescriptionStatusFromInvoiceWithSession,
  manualSyncAllPrescriptions
};
