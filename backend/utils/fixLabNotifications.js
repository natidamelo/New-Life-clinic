const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const MedicalInvoice = require('../models/MedicalInvoice');

/**
 * Utility to fix lab payment notifications that should be hidden after payment
 */
async function fixLabNotifications() {
  try {
    console.log('🔍 [FIX LAB NOTIFICATIONS] Starting notification fix...');
    
    // Find all lab payment notifications
    const labNotifications = await Notification.find({
      type: 'lab_payment_required',
      read: false
    });
    
    console.log(`🔍 Found ${labNotifications.length} unread lab payment notifications`);
    
    for (const notification of labNotifications) {
      console.log(`🔍 Checking notification ${notification._id} for patient ${notification.data?.patientName}`);
      
      // Check if there's an invoice for this patient with lab items
      const patientName = notification.data?.patientName;
      if (!patientName) {
        console.log(`⚠️ No patient name found for notification ${notification._id}`);
        continue;
      }
      
      // Find recent invoices for this patient with lab items
      const recentInvoices = await MedicalInvoice.find({
        patientName: patientName,
        'items.category': 'lab',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
        $or: [
          { status: 'paid' },
          { balance: { $lte: 0 } },
          { amountPaid: { $gt: 0 } }
        ]
      }).sort({ createdAt: -1 });
      
      if (recentInvoices.length > 0) {
        const invoice = recentInvoices[0];
        console.log(`✅ Found paid invoice ${invoice._id} for ${patientName}, updating notification`);
        
        // Update the notification
        notification.read = true;
        notification.data = {
          ...notification.data,
          paymentStatus: invoice.status === 'paid' ? 'paid' : 'partially_paid',
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          paidAt: new Date(),
          amountPaid: invoice.amountPaid,
          outstandingAmount: invoice.balance || 0
        };
        notification.title = invoice.status === 'paid' ? 'Payment Completed' : `Partial Payment - ${invoice.amountPaid} ETB paid`;
        notification.message = invoice.status === 'paid' 
          ? 'Payment completed successfully. Total amount paid.'
          : `Partial payment received. ${invoice.amountPaid} ETB paid, ${invoice.balance || 0} ETB remaining.`;
        notification.updatedAt = new Date();
        
        await notification.save();
        console.log(`✅ Updated notification ${notification._id}`);
      } else {
        console.log(`ℹ️ No recent paid invoices found for ${patientName}`);
      }
    }
    
    console.log('✅ [FIX LAB NOTIFICATIONS] Completed notification fix');
    return true;
  } catch (error) {
    console.error('❌ [FIX LAB NOTIFICATIONS] Error:', error);
    return false;
  }
}

module.exports = { fixLabNotifications };
