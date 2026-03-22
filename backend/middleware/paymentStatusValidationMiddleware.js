/**
 * Payment Status Validation Middleware
 * 
 * This middleware automatically intercepts and corrects incorrect payment status data
 * to prevent frontend display errors like showing "Fully Paid" when there are outstanding balances.
 */

const MedicationPaymentStatusService = require('../services/medicationPaymentStatusService');

/**
 * Middleware to validate and correct payment status data
 */
const validatePaymentStatusData = async (req, res, next) => {
  try {
    // Only apply to responses that contain payment status data
    const originalSend = res.send;
    
    res.send = function(data) {
      try {
        // Parse the response data
        let responseData;
        if (typeof data === 'string') {
          responseData = JSON.parse(data);
        } else {
          responseData = data;
        }
        
        // Check if this response contains payment status data
        if (responseData && (responseData.paymentStatus || responseData.data?.paymentStatus)) {
          console.log(`🔍 [PAYMENT VALIDATION] Intercepting payment status data`);
          
          // Validate and correct the payment status
          const validatedData = MedicationPaymentStatusService.validatePaymentData(responseData.data || responseData);
          
          // Check if corrections were made
          const originalStatus = responseData.data?.paymentStatus || responseData.paymentStatus;
          const correctedStatus = validatedData.paymentStatus;
          
          if (originalStatus !== correctedStatus) {
            console.log(`⚠️ [PAYMENT VALIDATION] Payment status corrected:`);
            console.log(`   Original: ${originalStatus}`);
            console.log(`   Corrected: ${correctedStatus}`);
            console.log(`   Outstanding: ETB ${validatedData.totalOutstanding}`);
            
            // Update the response with corrected data
            if (responseData.data) {
              responseData.data = { ...responseData.data, ...validatedData };
            } else {
              responseData = { ...responseData, ...validatedData };
            }
            
            // Convert back to string if needed
            if (typeof data === 'string') {
              data = JSON.stringify(responseData);
            } else {
              data = responseData;
            }
          } else {
            console.log(`✅ [PAYMENT VALIDATION] Payment status data is correct`);
          }
        }
        
        // Call the original send method
        originalSend.call(this, data);
        
      } catch (error) {
        console.error('❌ [PAYMENT VALIDATION] Error validating payment status:', error);
        // If validation fails, send the original data
        originalSend.call(this, data);
      }
    };
    
    next();
  } catch (error) {
    console.error('❌ [PAYMENT VALIDATION] Middleware error:', error);
    next();
  }
};

/**
 * Middleware to log payment status corrections for audit
 */
const logPaymentStatusCorrections = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    try {
      let responseData;
      if (typeof data === 'string') {
        responseData = JSON.parse(data);
      } else {
        responseData = data;
      }
      
      // Log any payment status data for audit purposes
      if (responseData && (responseData.paymentStatus || responseData.data?.paymentStatus)) {
        const paymentInfo = responseData.data || responseData;
        console.log(`💰 [PAYMENT AUDIT] Payment status sent to frontend:`);
        console.log(`   Status: ${paymentInfo.paymentStatus}`);
        console.log(`   Outstanding: ETB ${paymentInfo.totalOutstanding || 0}`);
        console.log(`   Paid: ETB ${paymentInfo.totalPaid || 0}`);
        console.log(`   Total: ETB ${paymentInfo.totalInvoiced || 0}`);
      }
      
      originalSend.call(this, data);
    } catch (error) {
      originalSend.call(this, data);
    }
  };
  
  next();
};

module.exports = {
  validatePaymentStatusData,
  logPaymentStatusCorrections
};

