const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const MedicalInvoice = require('./models/MedicalInvoice');

async function cleanAllLabNotifications() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧹 Cleaning All Lab Payment Notifications\n');
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
      
      // Remove all existing notifications for this patient
      console.log(`   🗑️ Removing ${patientNotifications.length} existing notifications...`);
      
      const deleteResult = await Notification.deleteMany({
        _id: { $in: patientNotifications.map(n => n._id) }
      });
      
      console.log(`   ✅ Deleted ${deleteResult.deletedCount} notifications`);
      
      // Create a single, clean notification that reflects the current payment status
      if (labInvoice.amountPaid > 0) {
        const newNotification = new Notification({
          type: 'lab_payment_required',
          title: labInvoice.status === 'paid' 
            ? 'Payment Completed' 
            : `Partial Payment - ${labInvoice.amountPaid} ETB paid, ${labInvoice.balance} ETB remaining`,
          message: labInvoice.status === 'paid'
            ? 'Payment completed successfully. Total amount paid.'
            : `Partial payment received. ${labInvoice.amountPaid} ETB paid, ${labInvoice.balance} ETB remaining.`,
          recipientRole: 'reception',
          senderRole: 'doctor',
          senderId: '507f1f77bcf86cd799439011',
          data: {
            invoiceId: labInvoice._id,
            invoiceNumber: labInvoice.invoiceNumber,
            patientId: labInvoice.patient,
            patientName: patientName,
            amount: labInvoice.total,
            totalAmount: labInvoice.total,
            paymentStatus: labInvoice.status === 'paid' ? 'paid' : 'partially_paid',
            amountPaid: labInvoice.amountPaid,
            outstandingAmount: labInvoice.balance,
            paidAt: new Date()
          },
          priority: 'medium',
          read: true, // Mark as read since payment was made
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await newNotification.save();
        console.log(`   ✅ Created single clean notification for ${patientName}`);
        console.log(`   Title: ${newNotification.title}`);
        console.log(`   Payment Status: ${newNotification.data.paymentStatus}`);
        console.log(`   Read: ${newNotification.read}`);
      }
    }
    
    // Final verification
    console.log('\n🔍 Final verification...');
    console.log('=' .repeat(60));
    
    const finalNotifications = await Notification.find({
      type: 'lab_payment_required'
    }).sort({ createdAt: -1 });
    
    console.log(`\n📋 Final notification count: ${finalNotifications.length}`);
    
    // Check for any unread notifications
    const unreadNotifications = finalNotifications.filter(n => !n.read);
    console.log(`\n⚠️ Unread notifications: ${unreadNotifications.length}`);
    
    if (unreadNotifications.length > 0) {
      console.log('\n🔍 Unread notifications:');
      unreadNotifications.forEach((notification, index) => {
        console.log(`\n${index + 1}. ID: ${notification._id}`);
        console.log(`   Patient: ${notification.data?.patientName}`);
        console.log(`   Title: ${notification.title}`);
        console.log(`   Payment Status: ${notification.data?.paymentStatus}`);
        console.log(`   Invoice ID: ${notification.data?.invoiceId}`);
      });
      
      // Force mark any remaining unread notifications as read
      console.log('\n🔧 Force marking remaining unread notifications as read...');
      const updateResult = await Notification.updateMany(
        {
          type: 'lab_payment_required',
          read: false
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
    
    // Final count
    const finalCount = await Notification.countDocuments({
      type: 'lab_payment_required'
    });
    
    console.log(`\n📊 Final lab payment notification count: ${finalCount}`);
    
    if (finalCount === 0) {
      console.log('\n🎉 All lab payment notifications have been cleaned up!');
    } else {
      console.log('\n📋 Remaining notifications:');
      const remaining = await Notification.find({
        type: 'lab_payment_required'
      }).sort({ createdAt: -1 });
      
      remaining.forEach((notification, index) => {
        console.log(`\n${index + 1}. ID: ${notification._id}`);
        console.log(`   Patient: ${notification.data?.patientName}`);
        console.log(`   Title: ${notification.title}`);
        console.log(`   Read: ${notification.read}`);
        console.log(`   Payment Status: ${notification.data?.paymentStatus}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

cleanAllLabNotifications();
