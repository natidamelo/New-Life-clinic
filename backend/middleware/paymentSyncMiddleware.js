/**
 * Payment Synchronization Middleware
 * Ensures that all payment-related data is properly synchronized
 * This prevents the "invoice paid but nurse task unpaid" issue
 */

const PaymentSynchronizationService = require('../services/paymentSynchronizationService');
const AutoPaymentSync = require('../utils/autoPaymentSync');

/**
 * Middleware to sync payment data after payment processing
 */
const syncPaymentData = async (req, res, next) => {
  try {
    // Only run for payment-related routes
    if (!req.body || !req.body.invoiceId) {
      return next();
    }

    const { invoiceId, prescriptionId, patientId } = req.body;
    
    // 1. Use the PaymentSynchronizationService to sync invoice and prescription
    const paymentSyncService = new PaymentSynchronizationService();
    const syncResult = await paymentSyncService.syncPaymentStatus(invoiceId, req.body.amountPaid || 0, req.body.paymentMethod || 'Cash');
    
    if (syncResult.success) {
      // console.log('✅ [PAYMENT SYNC] Payment synchronization successful');
    } else {
      // console.warn('⚠️ [PAYMENT SYNC] Payment synchronization warning:', syncResult.message);
    }

    // 2. Use AutoPaymentSync to sync nurse tasks
    if (prescriptionId && patientId) {
      const taskSyncResult = await AutoPaymentSync.triggerSyncOnPayment(prescriptionId, patientId);
      // console.log(`✅ [PAYMENT SYNC] Nurse task synchronization: ${taskSyncResult} tasks updated`);
    }

    // 3. Ensure nurse tasks are properly linked to invoices
    await ensureNurseTaskInvoiceLinks(invoiceId, prescriptionId, patientId);
    
    next();
  } catch (error) {
    // console.error('❌ [PAYMENT SYNC] Error in payment synchronization middleware:', error);
    // Don't block the request, just log the error
    next();
  }
};

/**
 * Ensure nurse tasks are properly linked to invoices and prescriptions
 */
const ensureNurseTaskInvoiceLinks = async (invoiceId, prescriptionId, patientId) => {
  try {
    const NurseTask = require('../models/NurseTask');
    
    // Find all nurse tasks for this patient that might be related to this payment
    const tasks = await NurseTask.find({
      patientId: patientId,
      taskType: 'MEDICATION'
    });

    // console.log(`🔗 [PAYMENT SYNC] Ensuring invoice links for ${tasks.length} nurse tasks...`);

    for (const task of tasks) {
      let needsUpdate = false;
      const updates = {};

      // Link to invoice if missing
      if (!task.medicationDetails?.invoiceId && invoiceId) {
        updates['medicationDetails.invoiceId'] = invoiceId;
        needsUpdate = true;
      }

      // Link to prescription if missing
      if (!task.medicationDetails?.prescriptionId && prescriptionId) {
        updates['medicationDetails.prescriptionId'] = prescriptionId;
        needsUpdate = true;
      }

      // Update payment authorization if it's missing or incorrect
      if (!task.paymentAuthorization || task.paymentAuthorization.paymentStatus === 'unpaid') {
        // Get the actual payment data from the invoice
        const MedicalInvoice = require('../models/MedicalInvoice');
        const invoice = await MedicalInvoice.findById(invoiceId);
        
        if (invoice) {
          const isFullyPaid = (invoice.amountPaid || 0) >= (invoice.total || 0);
          const medicationName = task.medicationDetails?.medicationName || task.description;
          
          // Check if this invoice contains the medication for this task
          const invoiceContainsMedication = invoice.items?.some(item => 
            item.medicationName && medicationName && 
            item.medicationName.toLowerCase().includes(medicationName.toLowerCase())
          );

          if (invoiceContainsMedication) {
            updates['paymentAuthorization.paymentStatus'] = isFullyPaid ? 'fully_paid' : 'partial';
            updates['paymentAuthorization.canAdminister'] = true;
            updates['paymentAuthorization.lastUpdated'] = new Date();
            
            // Calculate authorized doses based on frequency and duration
            const frequency = task.medicationDetails?.frequency || 'once daily';
            const duration = task.medicationDetails?.duration || 1;
            const dosesPerDay = calculateDosesPerDay(frequency);
            const totalDoses = dosesPerDay * duration;
            
            if (isFullyPaid) {
              updates['paymentAuthorization.authorizedDoses'] = totalDoses;
              updates['paymentAuthorization.paidDays'] = duration;
              updates['paymentAuthorization.outstandingAmount'] = 0;
            } else {
              // Partial payment - calculate proportional doses
              const paymentRatio = (invoice.amountPaid || 0) / (invoice.total || 1);
              updates['paymentAuthorization.authorizedDoses'] = Math.floor(totalDoses * paymentRatio);
              updates['paymentAuthorization.paidDays'] = Math.ceil(duration * paymentRatio);
              updates['paymentAuthorization.outstandingAmount'] = (invoice.total || 0) - (invoice.amountPaid || 0);
            }
            
            needsUpdate = true;
          }
        }
      }

      // Apply updates if needed
      if (needsUpdate) {
        await NurseTask.findByIdAndUpdate(task._id, { $set: updates });
        // console.log(`✅ [PAYMENT SYNC] Updated nurse task ${task._id} with invoice links and payment data`);
      }
    }

    // console.log('✅ [PAYMENT SYNC] Invoice linking complete');
  } catch (error) {
    // console.error('❌ [PAYMENT SYNC] Error ensuring invoice links:', error);
  }
};

/**
 * Middleware to sync all existing payments (for fixing current inconsistencies)
 */
const syncAllExistingPayments = async (req, res, next) => {
  try {
    // console.log('🔄 [PAYMENT SYNC] Starting full payment synchronization...');
    
    const paymentSyncService = new PaymentSynchronizationService();
    const result = await paymentSyncService.syncAllExistingPayments();
    
    if (result.success) {
      // console.log(`✅ [PAYMENT SYNC] Full synchronization complete: ${result.syncedCount} invoices processed`);
    } else {
      // console.error('❌ [PAYMENT SYNC] Full synchronization failed:', result.error);
    }
    
    next();
  } catch (error) {
    // console.error('❌ [PAYMENT SYNC] Error in full synchronization:', error);
    next();
  }
};

module.exports = {
  syncPaymentData,
  syncAllExistingPayments,
  ensureNurseTaskInvoiceLinks
};
