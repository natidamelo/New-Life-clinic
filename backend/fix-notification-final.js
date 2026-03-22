const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const LabOrder = require('./models/LabOrder');

async function fixNotificationFinal() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    console.log('\n🔧 Final Notification Fix...\n');
    
    // Get the specific notification
    const notification = await Notification.findById('6883349443eae8d6a40cffb1');
    
    if (notification && notification.data?.labOrderIds) {
      let totalAmount = 0;
      const testNames = [];
      
      // Calculate total from lab orders
      for (const labOrderId of notification.data.labOrderIds) {
        const labOrder = await LabOrder.findById(labOrderId);
        if (labOrder) {
          totalAmount += labOrder.totalPrice || 0;
          testNames.push(labOrder.testName);
        }
      }
      
      console.log(`\n🔍 Current State:`);
      console.log(`   Notification Amount: ${notification.data.amount} ETB`);
      console.log(`   Calculated Total: ${totalAmount} ETB`);
      console.log(`   Tests: ${testNames.join(', ')}`);
      
      // Update the notification
      notification.data.amount = totalAmount;
      notification.data.totalAmount = totalAmount;
      notification.data.testNames = testNames;
      notification.message = `Payment required for lab tests: ${testNames.join(', ')} (Total: ETB ${totalAmount})`;
      
      await notification.save();
      
      console.log(`\n✅ Updated Notification:`);
      console.log(`   New Amount: ${notification.data.amount} ETB`);
      console.log(`   New Message: ${notification.message}`);
      
      // Verify the update
      const updatedNotification = await Notification.findById('6883349443eae8d6a40cffb1');
      console.log(`\n🔍 Verification:`);
      console.log(`   Amount: ${updatedNotification.data.amount} ETB`);
      console.log(`   Total Amount: ${updatedNotification.data.totalAmount} ETB`);
      console.log(`   Match: ${updatedNotification.data.amount === totalAmount ? '✅ Yes' : '❌ No'}`);
      
    } else {
      console.log('❌ Notification not found or no lab order IDs');
    }
    
    console.log('\n🎉 Final notification fix completed!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

fixNotificationFinal(); 