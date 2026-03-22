const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const LabOrder = require('./models/LabOrder');

async function forceUpdateNotification() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    console.log('\n🔧 Force Updating Notification...\n');
    
    // Calculate the correct total
    const labOrderIds = [
      '688331b86c17995d1cf2c4c0', // HBsAg
      '688331b86c17995d1cf2c4c1', // Hemoglobin  
      '688331b86c17995d1cf2c4c2', // Glucose, Fasting
      '688331b86c17995d1cf2c4c5'  // Complete Urinalysis
    ];
    
    let totalAmount = 0;
    const testNames = [];
    
    for (const labOrderId of labOrderIds) {
      const labOrder = await LabOrder.findById(labOrderId);
      if (labOrder) {
        totalAmount += labOrder.totalPrice || 0;
        testNames.push(labOrder.testName);
        console.log(`   ${labOrder.testName}: ${labOrder.totalPrice} ETB`);
      }
    }
    
    console.log(`\n💰 Total Amount: ${totalAmount} ETB`);
    console.log(`📋 Tests: ${testNames.join(', ')}`);
    
    // Force update the notification
    const result = await Notification.updateOne(
      { _id: '6883349443eae8d6a40cffb1' },
      {
        $set: {
          'data.amount': totalAmount,
          'data.totalAmount': totalAmount,
          'data.testNames': testNames,
          'message': `Payment required for lab tests: ${testNames.join(', ')} (Total: ETB ${totalAmount})`
        }
      }
    );
    
    console.log(`\n✅ Update Result: ${result.modifiedCount} document(s) modified`);
    
    // Verify the update
    const updatedNotification = await Notification.findById('6883349443eae8d6a40cffb1');
    console.log(`\n🔍 Verification:`);
    console.log(`   Amount: ${updatedNotification.data.amount} ETB`);
    console.log(`   Total Amount: ${updatedNotification.data.totalAmount} ETB`);
    console.log(`   Message: ${updatedNotification.message}`);
    console.log(`   Match: ${updatedNotification.data.amount === totalAmount ? '✅ Yes' : '❌ No'}`);
    
    console.log('\n🎉 Force update completed!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

forceUpdateNotification(); 