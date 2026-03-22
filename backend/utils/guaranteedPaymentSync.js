/**
 * Guaranteed Payment Synchronization
 * 
 * Ensures that payment status is ALWAYS synchronized between invoices, prescriptions, and nurse tasks
 * This is the root cause fix for payment status mismatches
 */

const mongoose = require('mongoose');
const PaymentStatusNormalizer = require('./paymentStatusNormalizer');

class GuaranteedPaymentSync {
  /**
   * Synchronize payment status across all related entities
   * This is the main function that should be called after any payment
   */
  static async syncPaymentStatus(invoiceId, session = null) {
    try {
      console.log(`🔄 [GUARANTEED SYNC] Starting payment synchronization for invoice ${invoiceId}`);
      
      const MedicalInvoice = require('../models/MedicalInvoice');
      const Prescription = require('../models/Prescription');
      const NurseTask = require('../models/NurseTask');
      
      // Get the invoice
      const invoice = await MedicalInvoice.findById(invoiceId).session(session);
      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      // Normalize the invoice payment status
      const normalizedStatus = PaymentStatusNormalizer.normalize(invoice.status);
      console.log(`📊 [GUARANTEED SYNC] Invoice status: ${invoice.status} -> ${normalizedStatus}`);

      // Update invoice with normalized status if needed
      if (invoice.status !== normalizedStatus) {
        invoice.status = normalizedStatus;
        await invoice.save({ session });
        console.log(`✅ [GUARANTEED SYNC] Updated invoice status to ${normalizedStatus}`);
      }

      // Find all prescriptions linked to this invoice
      const prescriptions = await Prescription.find({
        invoiceId: invoiceId
      }).session(session);

      console.log(`📋 [GUARANTEED SYNC] Found ${prescriptions.length} prescriptions to sync`);

      // Sync each prescription
      for (const prescription of prescriptions) {
        await this.syncPrescriptionPaymentStatus(prescription, invoice, session);
      }

      // Find all nurse tasks that should be linked to this invoice
      const nurseTasks = await NurseTask.find({
        $or: [
          { 'medicationDetails.invoiceId': invoiceId },
          { 'medicationDetails.prescriptionId': { $in: prescriptions.map(p => p._id) } }
        ]
      }).session(session);

      console.log(`📋 [GUARANTEED SYNC] Found ${nurseTasks.length} nurse tasks to sync`);

      // Sync each nurse task
      for (const task of nurseTasks) {
        await this.syncNurseTaskPaymentStatus(task, invoice, session);
      }

      console.log(`✅ [GUARANTEED SYNC] Payment synchronization complete for invoice ${invoiceId}`);
      return { success: true, prescriptionsUpdated: prescriptions.length, tasksUpdated: nurseTasks.length };

    } catch (error) {
      console.error(`❌ [GUARANTEED SYNC] Error synchronizing payment status:`, error);
      throw error;
    }
  }

  /**
   * Synchronize prescription payment status
   */
  static async syncPrescriptionPaymentStatus(prescription, invoice, session = null) {
    try {
      const normalizedStatus = PaymentStatusNormalizer.normalize(invoice.status);
      
      // Update prescription payment status
      prescription.paymentStatus = normalizedStatus;
      
      // Update payment authorization if it exists
      if (prescription.paymentAuthorization) {
        prescription.paymentAuthorization.paymentStatus = normalizedStatus;
        prescription.paymentAuthorization.lastUpdated = new Date();
        
        // Set authorization details based on payment status
        if (PaymentStatusNormalizer.isFullyPaid(normalizedStatus)) {
          prescription.paymentAuthorization.canAdminister = true;
          prescription.paymentAuthorization.authorizedDoses = prescription.paymentAuthorization.totalDoses || 1;
          prescription.paymentAuthorization.unauthorizedDoses = 0;
          prescription.paymentAuthorization.outstandingAmount = 0;
        } else if (PaymentStatusNormalizer.isPartial(normalizedStatus)) {
          prescription.paymentAuthorization.canAdminister = true;
          // Keep existing authorized doses for partial payments
        } else {
          prescription.paymentAuthorization.canAdminister = false;
          prescription.paymentAuthorization.authorizedDoses = 0;
          prescription.paymentAuthorization.unauthorizedDoses = prescription.paymentAuthorization.totalDoses || 1;
        }
      }
      
      await prescription.save({ session });
      console.log(`✅ [GUARANTEED SYNC] Updated prescription ${prescription._id} status to ${normalizedStatus}`);
      
    } catch (error) {
      console.error(`❌ [GUARANTEED SYNC] Error updating prescription ${prescription._id}:`, error);
      throw error;
    }
  }

  /**
   * Synchronize nurse task payment status
   */
  static async syncNurseTaskPaymentStatus(task, invoice, session = null) {
    try {
      const normalizedStatus = PaymentStatusNormalizer.normalize(invoice.status);
      
      // Update task payment status
      task.paymentStatus = normalizedStatus;
      
      // Update payment authorization
      if (!task.paymentAuthorization) {
        task.paymentAuthorization = {};
      }
      
      task.paymentAuthorization.paymentStatus = normalizedStatus;
      task.paymentAuthorization.lastUpdated = new Date();
      
      // Set authorization details based on payment status
      if (PaymentStatusNormalizer.isFullyPaid(normalizedStatus)) {
        task.paymentAuthorization.canAdminister = true;
        task.paymentAuthorization.authorizedDoses = task.paymentAuthorization.totalDoses || 1;
        task.paymentAuthorization.unauthorizedDoses = 0;
        task.paymentAuthorization.outstandingAmount = 0;
        task.paymentAuthorization.restrictionMessage = 'Fully paid - no restrictions';
      } else if (PaymentStatusNormalizer.isPartial(normalizedStatus)) {
        task.paymentAuthorization.canAdminister = true;
        // Keep existing authorized doses for partial payments
        task.paymentAuthorization.restrictionMessage = 'Partial payment - limited doses authorized';
      } else {
        task.paymentAuthorization.canAdminister = false;
        task.paymentAuthorization.authorizedDoses = 0;
        task.paymentAuthorization.unauthorizedDoses = task.paymentAuthorization.totalDoses || 1;
        task.paymentAuthorization.outstandingAmount = invoice.total || 0;
        task.paymentAuthorization.restrictionMessage = 'No payment received - medication administration not authorized';
      }
      
      // Update medication details payment status
      if (task.medicationDetails) {
        task.medicationDetails.paymentStatus = normalizedStatus;
      }
      
      await task.save({ session });
      console.log(`✅ [GUARANTEED SYNC] Updated nurse task ${task._id} status to ${normalizedStatus}`);
      
    } catch (error) {
      console.error(`❌ [GUARANTEED SYNC] Error updating nurse task ${task._id}:`, error);
      throw error;
    }
  }

  /**
   * Fix all existing payment status mismatches
   * This should be run periodically to clean up any inconsistencies
   */
  static async fixAllPaymentStatusMismatches() {
    try {
      console.log('🔄 [GUARANTEED SYNC] Starting comprehensive payment status fix...');
      
      const MedicalInvoice = require('../models/MedicalInvoice');
      const invoices = await MedicalInvoice.find({});
      
      let fixedCount = 0;
      let errorCount = 0;
      
      for (const invoice of invoices) {
        try {
          await this.syncPaymentStatus(invoice._id);
          fixedCount++;
        } catch (error) {
          console.error(`❌ [GUARANTEED SYNC] Error fixing invoice ${invoice._id}:`, error);
          errorCount++;
        }
      }
      
      console.log(`✅ [GUARANTEED SYNC] Comprehensive fix complete:`);
      console.log(`   - Fixed: ${fixedCount} invoices`);
      console.log(`   - Errors: ${errorCount} invoices`);
      
      return { fixedCount, errorCount };
      
    } catch (error) {
      console.error('❌ [GUARANTEED SYNC] Error in comprehensive fix:', error);
      throw error;
    }
  }
}

module.exports = GuaranteedPaymentSync;
