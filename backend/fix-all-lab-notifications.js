const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const MedicalInvoice = require('./models/MedicalInvoice');

async function fixAllLabNotifications() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔧 Fixing All Lab Payment Notifications\n');
    console.log('=' .repeat(60));
    
    // Find all lab payment notifications
    const notifications = await Notification.find({
      type: 'lab_payment_required'
    }).sort({ createdAt: -1 });
    
    console.log(`📋 Found ${notifications.length} total lab payment notifications`);
    
    // Group notifications by patient
    const notificationsByPatient = {};
    notifications.forEach(notification => {
      const patientName = notification.data?.patientName;
      if (!notificationsByPatient[patientName]) {
        notificationsByPatient[patientName] = [];
      }
      notificationsByPatient[patientName].push(notification);
    });
    
    console.log(`\n👥 Notifications by patient:`);
    Object.keys(notificationsByPatient).forEach(patientName => {
      console.log(`   ${patientName}: ${notificationsByPatient[patientName].length} notifications`);
    });
    
    // Process each patient's notifications
    for (const [patientName, patientNotifications] of Object.entries(notificationsByPatient)) {
      console.log(`\n🔍 Processing notifications for: ${patientName}`);
      console.log('=' .repeat(40));
      
      // Find the patient's invoices
      const invoices = await MedicalInvoice.find({
        patientName: patientName
      }).sort({ createdAt: -1 });
      
      if (invoices.length === 0) {
        console.log(`   ❌ No invoices found for ${patientName}`);
        continue;
      }
      
      console.log(`   📋 Found ${invoices.length} invoices for ${patientName}`);
      
      // Find the most recent lab invoice
      const labInvoice = invoices.find(inv => 
        inv.invoiceNumber.includes('LAB-') || inv.items?.some(item => item.type === 'lab')
      );
      
      if (!labInvoice) {
        console.log(`   ❌ No lab invoice found for ${patientName}`);
        continue;
      }
      
      console.log(`   ✅ Found lab invoice: ${labInvoice.invoiceNumber}`);
      console.log(`   Status: ${labInvoice.status}`);
      console.log(`   Amount Paid: ${labInvoice.amountPaid} ETB`);
      console.log(`   Balance: ${labInvoice.balance} ETB`);
      
      // Update all notifications for this patient
      console.log(`   🔧 Updating ${patientNotifications.length} notifications...`);
      
      for (const notification of patientNotifications) {
        const updatedNotification = await Notification.findByIdAndUpdate(
          notification._id,
          {
            $set: {
              read: true, // Mark as read since payment was made
              'data.paymentStatus': labInvoice.status === 'paid' ? 'paid' : 'partially_paid',
              'data.amountPaid': labInvoice.amountPaid,
              'data.outstandingAmount': labInvoice.balance,
              'data.paidAt': new Date(),
              'data.invoiceId': labInvoice._id,
              'data.invoiceNumber': labInvoice.invoiceNumber,
              title: labInvoice.status === 'paid' 
                ? 'Payment Completed' 
                : `Partial Payment - ${labInvoice.amountPaid} ETB paid, ${labInvoice.balance} ETB remaining`,
              message: labInvoice.status === 'paid'
                ? 'Payment completed successfully. Total amount paid.'
                : `Partial payment received. ${labInvoice.amountPaid} ETB paid, ${labInvoice.balance} ETB remaining.`,
              updatedAt: new Date()
            }
          },
          { new: true }
        );
        
        console.log(`   ✅ Updated notification ${notification._id}`);
        console.log(`   New title: ${updatedNotification.title}`);
        console.log(`   Payment Status: ${updatedNotification.data.paymentStatus}`);
        console.log(`   Amount Paid: ${updatedNotification.data.amountPaid} ETB`);
        console.log(`   Outstanding Amount: ${updatedNotification.data.outstandingAmount} ETB`);
      }
      
      // Run cleanup for this patient's invoice
      console.log(`   🧹 Running notification cleanup for invoice ${labInvoice._id}...`);
      const { cleanupPaymentNotifications } = require('./utils/notificationCleanup');
      await cleanupPaymentNotifications(labInvoice._id, labInvoice.patient);
    }
    
    // Final verification
    console.log('\n🔍 Final verification...');
    console.log('=' .repeat(60));
    
    const finalNotifications = await Notification.find({
      type: 'lab_payment_required'
    }).sort({ createdAt: -1 });
    
    console.log(`\n📋 Final notification count: ${finalNotifications.length}`);
    
    // Check for any unread notifications that should be hidden
    const unreadNotifications = finalNotifications.filter(n => !n.read);
    console.log(`\n⚠️ Unread notifications: ${unreadNotifications.length}`);
    
    if (unreadNotifications.length > 0) {
      console.log('\n🔍 Unread notifications that should be hidden:');
      unreadNotifications.forEach((notification, index) => {
        console.log(`\n${index + 1}. ID: ${notification._id}`);
        console.log(`   Patient: ${notification.data?.patientName}`);
        console.log(`   Title: ${notification.title}`);
        console.log(`   Payment Status: ${notification.data?.paymentStatus}`);
        console.log(`   Invoice ID: ${notification.data?.invoiceId}`);
      });
    }
    
    // Check for notifications that should be hidden but aren't read
    const shouldBeHidden = finalNotifications.filter(n => {
      const hasPayment = n.data?.paymentStatus === 'paid' || 
                        n.data?.paymentStatus === 'partially_paid' ||
                        n.data?.paidAt ||
                        n.data?.invoiceId;
      return hasPayment && !n.read;
    });
    
    console.log(`\n🔍 Notifications that should be hidden but aren't read: ${shouldBeHidden.length}`);
    
    if (shouldBeHidden.length > 0) {
      console.log('\n⚠️ These notifications should be hidden:');
      shouldBeHidden.forEach((n, index) => {
        console.log(`\n${index + 1}. ID: ${n._id}`);
        console.log(`   Patient: ${n.data?.patientName}`);
        console.log(`   Title: ${n.title}`);
        console.log(`   Payment Status: ${n.data?.paymentStatus}`);
        console.log(`   Invoice ID: ${n.data?.invoiceId}`);
      });
      
      // Force mark these as read
      console.log('\n🔧 Force marking remaining notifications as read...');
      const updateResult = await Notification.updateMany(
        {
          _id: { $in: shouldBeHidden.map(n => n._id) }
        },
        {
          $set: {
            read: true,
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`✅ Force updated ${updateResult.modifiedCount} notifications`);
    }
    
    console.log('\n🎉 All lab payment notifications have been fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

fixAllLabNotifications();
