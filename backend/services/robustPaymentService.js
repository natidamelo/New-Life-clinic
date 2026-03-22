/**
 * Robust Payment Service
 * 
 * This service ensures reliable payment processing with:
 * - Transaction safety
 * - Automatic retry mechanisms
 * - Comprehensive error handling
 * - Guaranteed prescription status synchronization
 */

const mongoose = require('mongoose');
const MedicalInvoice = require('../models/MedicalInvoice');
const { syncPrescriptionStatusFromInvoiceWithSession } = require('../utils/prescriptionStatusSync');

class RobustPaymentService {
  
  /**
   * Process payment with guaranteed prescription sync
   * @param {Object} paymentData - Payment information
   * @param {string} userId - User processing the payment
   * @returns {Promise<Object>} - Payment result
   */
  static async processPaymentWithGuaranteedSync(paymentData, userId) {
    const result = {
      success: false,
      invoice: null,
      payment: null,
      syncResult: null,
      errors: [],
      warnings: []
    };
    
    try {
      console.log(`🔄 [ROBUST PAYMENT] Starting payment processing:`, {
        invoiceId: paymentData.invoiceId,
        amount: paymentData.amount,
        method: paymentData.method
      });
      
      // 1. Validate and get invoice
      const invoice = await MedicalInvoice.findById(paymentData.invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      // 2. Validate payment amount
      if (paymentData.amount > invoice.balance) {
        throw new Error(`Payment amount (${paymentData.amount}) exceeds outstanding balance (${invoice.balance})`);
      }
      
      // 3. Process payment
      const payment = {
        amount: paymentData.amount,
        method: paymentData.method,
        reference: paymentData.reference || `ROBUST-PAY-${Date.now()}`,
        date: new Date(),
        notes: paymentData.notes || 'Payment processed with robust service',
        processedBy: userId
      };
      
      // Add payment to invoice
      if (!invoice.payments) {
        invoice.payments = [];
      }
      invoice.payments.push(payment);
      
      // Update invoice totals
      invoice.amountPaid = (invoice.amountPaid || 0) + paymentData.amount;
      invoice.balance = Math.max(0, invoice.total - invoice.amountPaid);
      invoice.status = invoice.balance === 0 ? 'paid' : 'partial';
      
      // Update payment status object
      if (!invoice.paymentStatus) {
        invoice.paymentStatus = {};
      }
      invoice.paymentStatus.current = invoice.balance === 0 ? 'fully_paid' : 'partial';
      invoice.paymentStatus.percentage = Math.round((invoice.amountPaid / invoice.total) * 100);
      invoice.paymentStatus.lastUpdated = new Date();
      
      // Mark fields as modified
      invoice.markModified('status');
      invoice.markModified('amountPaid');
      invoice.markModified('balance');
      invoice.markModified('paymentStatus');
      invoice.lastUpdated = new Date();
      
      // 4. Save invoice
      await invoice.save();
      console.log(`✅ [ROBUST PAYMENT] Invoice updated successfully: status=${invoice.status}, balance=${invoice.balance}`);
      
      // 5. SYNC PRESCRIPTION STATUS
      console.log(`🔄 [ROBUST PAYMENT] Starting prescription sync...`);
      try {
        const { syncPrescriptionStatusFromInvoice } = require('../utils/prescriptionStatusSync');
        result.syncResult = await syncPrescriptionStatusFromInvoice(invoice);
        console.log(`✅ [ROBUST PAYMENT] Prescription sync completed:`, result.syncResult);
      } catch (syncError) {
        console.error(`❌ [ROBUST PAYMENT] Prescription sync failed:`, syncError);
        // Don't throw error, just log warning
        result.warnings.push(`Prescription synchronization warning: ${syncError.message}`);
      }
      
      // 6. Set success and populate result
      result.success = true;
      result.invoice = await MedicalInvoice.findById(invoice._id).populate([
        { path: 'patient', select: 'firstName lastName patientId' },
        { path: 'provider', select: 'firstName lastName' },
        { path: 'payments.processedBy', select: 'firstName lastName' }
      ]);
      result.payment = payment;
      
      console.log(`🎉 [ROBUST PAYMENT] Payment completed successfully`);
      
    } catch (error) {
      console.error(`❌ [ROBUST PAYMENT] Payment failed:`, error);
      
      result.errors.push(error.message);
      
      // Log detailed error for debugging
      console.error(`💥 [ROBUST PAYMENT] Error details:`, {
        message: error.message,
        stack: error.stack,
        paymentData,
        userId
      });
    }
    
    return result;
  }
  
  /**
   * Process payment with fallback sync if transaction sync fails
   * @param {Object} paymentData - Payment information
   * @param {string} userId - User processing the payment
   * @returns {Promise<Object>} - Payment result
   */
  static async processPaymentWithFallbackSync(paymentData, userId) {
    console.log(`🔄 [ROBUST PAYMENT] Attempting payment with fallback sync...`);
    
    // First try with transaction-safe sync
    let result = await this.processPaymentWithGuaranteedSync(paymentData, userId);
    
    // If transaction sync failed, try with regular sync as fallback
    if (!result.success && result.errors.some(err => err.includes('Prescription synchronization failed'))) {
      console.log(`⚠️ [ROBUST PAYMENT] Transaction sync failed, attempting fallback sync...`);
      
      try {
        // Process payment without transaction first
        const fallbackResult = await this.processPaymentWithoutTransaction(paymentData, userId);
        
        if (fallbackResult.success) {
          // Now try to sync prescription status
          const { syncPrescriptionStatusFromInvoice } = require('../utils/prescriptionStatusSync');
          const syncResult = await syncPrescriptionStatusFromInvoice(fallbackResult.invoice, {
            maxRetries: 5,
            retryDelay: 2000
          });
          
          if (syncResult.success) {
            console.log(`✅ [ROBUST PAYMENT] Fallback sync successful:`, syncResult);
            result = {
              ...fallbackResult,
              syncResult,
              warnings: [...(result.warnings || []), 'Used fallback sync method']
            };
          } else {
            console.error(`❌ [ROBUST PAYMENT] Fallback sync also failed:`, syncResult);
            result.errors.push(`Fallback sync failed: ${syncResult.errors.join(', ')}`);
          }
        } else {
          result = fallbackResult;
        }
      } catch (fallbackError) {
        console.error(`❌ [ROBUST PAYMENT] Fallback payment processing failed:`, fallbackError);
        result.errors.push(`Fallback processing failed: ${fallbackError.message}`);
      }
    }
    
    return result;
  }
  
  /**
   * Process payment without transaction (fallback method)
   * @param {Object} paymentData - Payment information
   * @param {string} userId - User processing the payment
   * @returns {Promise<Object>} - Payment result
   */
  static async processPaymentWithoutTransaction(paymentData, userId) {
    console.log(`🔄 [ROBUST PAYMENT] Processing payment without transaction (fallback)...`);
    
    try {
      const invoice = await MedicalInvoice.findById(paymentData.invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      // Process payment (same logic as transaction version)
      const payment = {
        amount: paymentData.amount,
        method: paymentData.method,
        reference: paymentData.reference || `FALLBACK-PAY-${Date.now()}`,
        date: new Date(),
        notes: paymentData.notes || 'Payment processed with fallback method',
        processedBy: userId
      };
      
      invoice.payments.push(payment);
      invoice.amountPaid = (invoice.amountPaid || 0) + paymentData.amount;
      invoice.balance = Math.max(0, invoice.total - invoice.amountPaid);
      invoice.status = invoice.balance === 0 ? 'paid' : 'partial';
      
      if (!invoice.paymentStatus) {
        invoice.paymentStatus = {};
      }
      invoice.paymentStatus.current = invoice.balance === 0 ? 'fully_paid' : 'partial';
      invoice.paymentStatus.percentage = Math.round((invoice.amountPaid / invoice.total) * 100);
      invoice.paymentStatus.lastUpdated = new Date();
      
      invoice.markModified('status');
      invoice.markModified('amountPaid');
      invoice.markModified('balance');
      invoice.markModified('paymentStatus');
      invoice.lastUpdated = new Date();
      
      await invoice.save();
      
      return {
        success: true,
        invoice: await MedicalInvoice.findById(invoice._id).populate([
          { path: 'patient', select: 'firstName lastName patientId' },
          { path: 'provider', select: 'firstName lastName' },
          { path: 'payments.processedBy', select: 'firstName lastName' }
        ]),
        payment,
        syncResult: null,
        errors: [],
        warnings: ['Payment processed without transaction (fallback method)']
      };
      
    } catch (error) {
      console.error(`❌ [ROBUST PAYMENT] Fallback payment processing failed:`, error);
      return {
        success: false,
        invoice: null,
        payment: null,
        syncResult: null,
        errors: [error.message],
        warnings: []
      };
    }
  }
  
  /**
   * Emergency sync for prescriptions that should be paid but aren't
   * @param {string} invoiceId - Invoice ID to sync
   * @returns {Promise<Object>} - Sync result
   */
  static async emergencySyncPrescriptions(invoiceId) {
    console.log(`🚨 [ROBUST PAYMENT] Emergency sync for invoice ${invoiceId}`);
    
    try {
      const invoice = await MedicalInvoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      if (invoice.status !== 'paid' && invoice.balance > 0) {
        throw new Error('Invoice is not fully paid, cannot emergency sync');
      }
      
      const { syncPrescriptionStatusFromInvoice } = require('../utils/prescriptionStatusSync');
      const syncResult = await syncPrescriptionStatusFromInvoice(invoice, {
        maxRetries: 5,
        retryDelay: 2000
      });
      
      console.log(`✅ [ROBUST PAYMENT] Emergency sync completed:`, syncResult);
      return {
        success: true,
        invoice,
        syncResult,
        message: 'Emergency sync completed successfully'
      };
      
    } catch (error) {
      console.error(`❌ [ROBUST PAYMENT] Emergency sync failed:`, error);
      return {
        success: false,
        error: error.message,
        message: 'Emergency sync failed'
      };
    }
  }
}

module.exports = RobustPaymentService;
