/**
 * Payment Status Synchronization Middleware
 * 
 * ROOT CAUSE FIX: Ensures that payment status is ALWAYS synchronized
 * between the main paymentStatus field and paymentAuthorization.paymentStatus field
 */

const PaymentStatusNormalizer = require('../utils/paymentStatusNormalizer');

/**
 * Middleware to sync payment status fields after any nurse task update
 */
const syncPaymentStatusFields = async (req, res, next) => {
  try {
    // Only run for nurse task updates
    if (req.route?.path?.includes('nurse-tasks') && req.method === 'PUT') {
      const { paymentStatus, paymentAuthorization } = req.body;
      
      // If paymentStatus is being updated, ensure paymentAuthorization.paymentStatus is also updated
      if (paymentStatus !== undefined) {
        const normalizedStatus = PaymentStatusNormalizer.normalize(paymentStatus);
        
        // Ensure both fields use the same normalized value
        req.body.paymentStatus = normalizedStatus;
        
        if (req.body.paymentAuthorization) {
          req.body.paymentAuthorization.paymentStatus = normalizedStatus;
        } else if (paymentStatus !== 'unpaid') {
          // Only create paymentAuthorization if payment is not unpaid
          req.body.paymentAuthorization = {
            paymentStatus: normalizedStatus,
            lastUpdated: new Date()
          };
        }
        
        console.log(`🔄 [PAYMENT SYNC] Synchronized payment status: ${paymentStatus} -> ${normalizedStatus}`);
      }
      
      // If paymentAuthorization.paymentStatus is being updated, ensure main paymentStatus is also updated
      if (paymentAuthorization?.paymentStatus !== undefined) {
        const normalizedStatus = PaymentStatusNormalizer.normalize(paymentAuthorization.paymentStatus);
        
        // Ensure both fields use the same normalized value
        req.body.paymentStatus = normalizedStatus;
        req.body.paymentAuthorization.paymentStatus = normalizedStatus;
        
        console.log(`🔄 [PAYMENT SYNC] Synchronized payment auth status: ${paymentAuthorization.paymentStatus} -> ${normalizedStatus}`);
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ [PAYMENT SYNC] Error in payment status sync middleware:', error);
    next(); // Don't block the request
  }
};

/**
 * Post-save hook to ensure payment status consistency
 */
const ensurePaymentStatusConsistency = (doc) => {
  try {
    if (doc.paymentStatus && doc.paymentAuthorization?.paymentStatus) {
      const mainStatus = PaymentStatusNormalizer.normalize(doc.paymentStatus);
      const authStatus = PaymentStatusNormalizer.normalize(doc.paymentAuthorization.paymentStatus);
      
      // If they don't match, update the paymentAuthorization to match the main field
      if (mainStatus !== authStatus) {
        doc.paymentAuthorization.paymentStatus = mainStatus;
        doc.paymentAuthorization.lastUpdated = new Date();
        
        console.log(`🔄 [PAYMENT SYNC] Post-save sync: ${authStatus} -> ${mainStatus}`);
        
        // Save the document to persist the change
        return doc.save().catch(err => {
          console.error('❌ [PAYMENT SYNC] Error saving payment status sync:', err);
        });
      }
    }
  } catch (error) {
    console.error('❌ [PAYMENT SYNC] Error in post-save payment status sync:', error);
  }
};

module.exports = {
  syncPaymentStatusFields,
  ensurePaymentStatusConsistency
};
