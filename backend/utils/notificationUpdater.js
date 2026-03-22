const Notification = require('../models/Notification');

/**
 * Utility function to update payment notifications when payments are processed
 * This ensures consistent notification handling across all payment routes
 * 
 * @param {string} invoiceId - The invoice ID
 * @param {string} paymentStatus - 'paid', 'partial', or 'pending'
 * @param {number} amountPaid - Amount that was paid
 * @param {string} prescriptionId - Optional prescription ID for medication payments
 * @param {string} serviceRequestId - Optional service request ID for service payments
 */
async function updatePaymentNotifications(invoiceId, paymentStatus, amountPaid, prescriptionId = null, serviceRequestId = null) {
  try {
    console.log(`🔔 Updating payment notifications for invoice: ${invoiceId}`);
    console.log(`   Payment Status: ${paymentStatus}`);
    console.log(`   Amount Paid: ${amountPaid}`);

    // First, get the invoice to find the patient ID and outstanding balance
    const MedicalInvoice = require('../models/MedicalInvoice');
    const invoice = await MedicalInvoice.findById(invoiceId);
    
    // Build the update data now that we may have invoice context
    const updateData = {
      'data.paymentStatus': paymentStatus,
      'data.paidAt': new Date(),
      'data.amountPaid': amountPaid,
      updatedAt: new Date()
    };

    // Update notification title and message based on payment status
    if (paymentStatus === 'paid') {
      updateData.read = true;
      updateData.title = 'Payment Completed';
      updateData.message = `Payment completed successfully. Total amount paid.`;
    } else if (paymentStatus === 'partial') {
      // For partial payments, update the notification to show remaining amount
      updateData.title = `Partial Payment - ${amountPaid} ETB paid`;
      updateData.message = `Partial payment received. ${amountPaid} ETB paid.`;
      if (invoice && typeof invoice.balance === 'number') {
        updateData['data.outstandingAmount'] = invoice.balance;
        
        // Also update individual medication amounts to reflect the current amount due
        // This ensures consistency between the main amount and medication breakdown
        if (invoice.balance > 0 && invoice.medicationItems && invoice.medicationItems.length > 0) {
          const totalOriginalAmount = invoice.total;
          const remainingAmount = invoice.balance;
          
          // Calculate proportional amounts for each medication
          const updatedMedications = invoice.medicationItems.map(item => {
            const originalPrice = item.totalPrice || item.price || 0;
            const proportion = totalOriginalAmount > 0 ? originalPrice / totalOriginalAmount : 0;
            const currentAmount = remainingAmount * proportion;
            
            return {
              ...item,
              totalPrice: currentAmount,
              price: currentAmount
            };
          });
          
          updateData['data.medications'] = updatedMedications;
        }
      }
    }
    
    if (!invoice) {
      console.log(`❌ Invoice ${invoiceId} not found`);
      return { modifiedCount: 0, matchedCount: 0 };
    }
    
    // Build the query conditions
    const queryConditions = {
      read: false
    };

    // Add specific conditions based on payment type
    if (prescriptionId) {
      // For medication payments
      queryConditions.type = 'medication_payment_required';
      queryConditions['data.prescriptionId'] = prescriptionId;
    } else if (serviceRequestId) {
      // For service payments
      queryConditions.type = 'service_payment_required';
      queryConditions['data.serviceRequestId'] = serviceRequestId;
    } else {
      // For card payments and other general payments
      // Check both invoiceId and patient-based notifications for the same patient
      queryConditions.$or = [
        { 'data.invoiceId': invoiceId },
        { 
          'data.patientId': invoice.patient,
          'data.patientName': { $regex: new RegExp(invoice.patientName || '', 'i') }
        }
      ];
      queryConditions.type = { 
        $in: [
          'card_payment_required', 
          'service_payment_required', 
          'lab_payment_required', 
          'medication_payment_required'
        ] 
      };
    }

    // Update the notifications
    const result = await Notification.updateMany(queryConditions, updateData);

    console.log(`✅ Updated ${result.modifiedCount} payment notifications`);
    console.log(`   Matched: ${result.matchedCount} notifications`);

    return result;
  } catch (error) {
    console.error('❌ Error updating payment notifications:', error);
    throw error;
  }
}

module.exports = { updatePaymentNotifications }; 