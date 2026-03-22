const mongoose = require('mongoose');
const LabOrder = require('./models/LabOrder');
const Notification = require('./models/Notification');

async function fixNotificationAmountsFinal() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    console.log('\n🔧 Fixing Notification Amounts...\n');
    
    // Find all lab payment notifications
    const notifications = await Notification.find({
      type: 'lab_payment_required',
      read: false
    });
    
    console.log(`Found ${notifications.length} lab payment notifications`);
    
    for (const notification of notifications) {
      if (notification.data?.labOrderIds && Array.isArray(notification.data.labOrderIds)) {
        let totalAmount = 0;
        const testNames = [];
        
        // Calculate total from updated lab orders
        for (const labOrderId of notification.data.labOrderIds) {
          const labOrder = await LabOrder.findById(labOrderId);
          if (labOrder) {
            totalAmount += labOrder.totalPrice || 0;
            testNames.push(labOrder.testName);
          }
        }
        
        const oldAmount = notification.data.amount;
        
        if (totalAmount !== oldAmount) {
          console.log(`\n🔧 Fixing notification: ${notification._id}`);
          console.log(`   Patient: ${notification.data.patientName}`);
          console.log(`   Tests: ${testNames.join(', ')}`);
          console.log(`   Old Amount: ${oldAmount} ETB`);
          console.log(`   New Amount: ${totalAmount} ETB`);
          
          // Update notification
          notification.data.amount = totalAmount;
          notification.data.totalAmount = totalAmount;
          notification.data.testNames = testNames;
          notification.message = `Payment required for lab tests: ${testNames.join(', ')} (Total: ETB ${totalAmount})`;
          
          await notification.save();
          console.log(`   ✅ Updated notification`);
        } else {
          console.log(`\n✅ Notification already correct: ${notification._id}`);
          console.log(`   Patient: ${notification.data.patientName}`);
          console.log(`   Amount: ${totalAmount} ETB`);
        }
      }
    }
    
    console.log('\n🎉 Notification amounts fix completed!');
    
  } catch (error) {
    console.error('Error fixing notification amounts:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixNotificationAmountsFinal(); 