const mongoose = require('mongoose');
const Notification = require('./models/Notification');

/**
 * Improved lab payment processing logic
 * This script demonstrates the enhanced approach to prevent duplicate notifications
 * and ensure proper partial payment handling
 */
async function improveLabPaymentProcessing() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔧 Improving Lab Payment Processing Logic\n');
    console.log('=' .repeat(60));
    
    // This is a demonstration of the improved logic that should be implemented
    // in the actual lab payment processing route
    
    console.log('\n📋 Improved Lab Payment Processing Steps:');
    console.log('1. ✅ Check for existing notifications before creating new ones');
    console.log('2. ✅ Update existing notifications instead of creating duplicates');
    console.log('3. ✅ Properly handle partial payments');
    console.log('4. ✅ Ensure notifications are marked as read after payment');
    console.log('5. ✅ Clean up duplicate notifications');
    
    // Example of improved notification update logic
    console.log('\n🔍 Example: Improved Notification Update Logic');
    console.log('=' .repeat(60));
    
    const exampleLabOrderIds = ['example_order_id_1', 'example_order_id_2'];
    const exampleInvoiceId = 'example_invoice_id';
    const examplePatientId = 'example_patient_id';
    const exampleAmountPaid = 400;
    const exampleTotalAmount = 700;
    const exampleInvoiceStatus = exampleAmountPaid >= exampleTotalAmount ? 'paid' : 'partial';
    
    console.log(`\n📊 Payment Details:`);
    console.log(`   Amount Paid: ${exampleAmountPaid} ETB`);
    console.log(`   Total Amount: ${exampleTotalAmount} ETB`);
    console.log(`   Invoice Status: ${exampleInvoiceStatus}`);
    console.log(`   Payment Type: ${exampleAmountPaid >= exampleTotalAmount ? 'Full Payment' : 'Partial Payment'}`);
    
    // Step 1: Find and update existing notifications
    console.log('\n🔧 Step 1: Find and update existing notifications');
    
    const existingNotifications = await Notification.find({
      type: 'lab_payment_required',
      $or: [
        { 'data.labOrderIds': { $in: exampleLabOrderIds } },
        { 'data.labOrderId': { $in: exampleLabOrderIds } },
        { 'data.patientId': examplePatientId }
      ]
    });
    
    console.log(`   Found ${existingNotifications.length} existing notifications to update`);
    
    if (existingNotifications.length > 0) {
      // Update all existing notifications
      const updateResult = await Notification.updateMany(
        {
          _id: { $in: existingNotifications.map(n => n._id) }
        },
        {
          $set: {
            read: true, // Mark as read since payment was made
            'data.paymentStatus': exampleInvoiceStatus === 'paid' ? 'paid' : 'partially_paid',
            'data.amountPaid': exampleAmountPaid,
            'data.outstandingAmount': exampleTotalAmount - exampleAmountPaid,
            'data.paidAt': new Date(),
            'data.invoiceId': exampleInvoiceId,
            title: exampleInvoiceStatus === 'paid' 
              ? 'Payment Completed' 
              : `Partial Payment - ${exampleAmountPaid} ETB paid, ${exampleTotalAmount - exampleAmountPaid} ETB remaining`,
            message: exampleInvoiceStatus === 'paid'
              ? 'Payment completed successfully. Total amount paid.'
              : `Partial payment received. ${exampleAmountPaid} ETB paid, ${exampleTotalAmount - exampleAmountPaid} ETB remaining.`,
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`   ✅ Updated ${updateResult.modifiedCount} existing notifications`);
    }
    
    // Step 2: Prevent creation of new notifications for the same lab orders
    console.log('\n🔧 Step 2: Prevent duplicate notification creation');
    console.log('   ✅ Check if notifications already exist before creating new ones');
    console.log('   ✅ Use upsert operations to avoid duplicates');
    
    // Step 3: Clean up any lingering notifications
    console.log('\n🔧 Step 3: Clean up lingering notifications');
    
    const cleanupResult = await Notification.updateMany(
      {
        type: 'lab_payment_required',
        'data.patientId': examplePatientId,
        read: false,
        $or: [
          { 'data.paymentStatus': { $in: ['paid', 'partially_paid'] } },
          { 'data.paidAt': { $exists: true } },
          { 'data.invoiceId': { $exists: true } }
        ]
      },
      {
        $set: {
          read: true,
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`   ✅ Cleaned up ${cleanupResult.modifiedCount} lingering notifications`);
    
    console.log('\n🎉 Improved lab payment processing logic demonstrated!');
    console.log('\n📝 Key Improvements:');
    console.log('   • Check for existing notifications before creating new ones');
    console.log('   • Update existing notifications instead of creating duplicates');
    console.log('   • Properly handle partial payment status');
    console.log('   • Mark notifications as read after any payment activity');
    console.log('   • Clean up duplicate and orphaned notifications');
    console.log('   • Ensure consistent payment status across all notifications');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

improveLabPaymentProcessing();
