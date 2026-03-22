const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const MedicalInvoice = require('./models/MedicalInvoice');

async function fixNatanNotifications() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔧 Fixing Natan Kinfe Lab Payment Notifications\n');
    console.log('=' .repeat(60));
    
    // Find Natan's invoice
    const invoice = await MedicalInvoice.findOne({
      invoiceNumber: 'LAB-1754987860149-g6di5'
    });
    
    if (!invoice) {
      console.log('❌ Invoice not found');
      return;
    }
    
    console.log(`✅ Found invoice: ${invoice.invoiceNumber}`);
    console.log(`   Status: ${invoice.status}`);
    console.log(`   Amount Paid: ${invoice.amountPaid} ETB`);
    console.log(`   Balance: ${invoice.balance} ETB`);
    
    // Find all lab payment notifications for Natan
    const notifications = await Notification.find({
      type: 'lab_payment_required',
      'data.patientName': 'Natan kinfe'
    });
    
    console.log(`\n📋 Found ${notifications.length} lab payment notifications for Natan`);
    
    if (notifications.length > 0) {
      notifications.forEach((notification, index) => {
        console.log(`\n${index + 1}. Notification ID: ${notification._id}`);
        console.log(`   Title: ${notification.title}`);
        console.log(`   Read: ${notification.read}`);
        console.log(`   Payment Status: ${notification.data?.paymentStatus || 'not set'}`);
        console.log(`   Paid At: ${notification.data?.paidAt || 'not set'}`);
        console.log(`   Invoice ID: ${notification.data?.invoiceId || 'not set'}`);
      });
      
      // Fix the notifications
      console.log('\n🔧 Fixing notifications...');
      
      for (const notification of notifications) {
        // Update all notifications to reflect partial payment status
        const updatedNotification = await Notification.findByIdAndUpdate(
          notification._id,
          {
            $set: {
              read: true, // Mark as read since payment was made
              'data.paymentStatus': 'partially_paid',
              'data.amountPaid': invoice.amountPaid,
              'data.outstandingAmount': invoice.balance,
              'data.paidAt': new Date(),
              'data.invoiceId': invoice._id,
              'data.invoiceNumber': invoice.invoiceNumber,
              title: `Partial Payment - ${invoice.amountPaid} ETB paid, ${invoice.balance} ETB remaining`,
              message: `Partial payment received. ${invoice.amountPaid} ETB paid, ${invoice.balance} ETB remaining.`,
              updatedAt: new Date()
            }
          },
          { new: true }
        );
        
        console.log(`✅ Updated notification ${notification._id}`);
        console.log(`   New title: ${updatedNotification.title}`);
        console.log(`   Payment Status: ${updatedNotification.data.paymentStatus}`);
        console.log(`   Amount Paid: ${updatedNotification.data.amountPaid} ETB`);
        console.log(`   Outstanding Amount: ${updatedNotification.data.outstandingAmount} ETB`);
      }
      
      // Now run the cleanup to remove these notifications from the panel
      console.log('\n🧹 Running notification cleanup...');
      const { cleanupPaymentNotifications } = require('./utils/notificationCleanup');
      await cleanupPaymentNotifications(invoice._id, invoice.patient);
      
      console.log('\n✅ All notifications have been updated and cleaned up');
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const updatedNotifications = await Notification.find({
      type: 'lab_payment_required',
      'data.patientName': 'Natan kinfe'
    });
    
    console.log(`\n📋 Updated notifications: ${updatedNotifications.length}`);
    updatedNotifications.forEach((notification, index) => {
      console.log(`\n${index + 1}. Notification ID: ${notification._id}`);
      console.log(`   Title: ${notification.title}`);
      console.log(`   Read: ${notification.read}`);
      console.log(`   Payment Status: ${notification.data?.paymentStatus}`);
      console.log(`   Amount Paid: ${notification.data?.amountPaid} ETB`);
      console.log(`   Outstanding Amount: ${notification.data?.outstandingAmount} ETB`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

fixNatanNotifications();
