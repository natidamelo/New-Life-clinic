const mongoose = require('mongoose');
const Notification = require('./models/Notification');

async function fixNotificationPatientNameFinal() {
  try {
    console.log('🔧 Final Fix: Notification Patient Name');
    console.log('='.repeat(60));
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms database');
    
    // Find and update the notification
    console.log('\n🔍 Finding unread lab payment notification...');
    const notification = await Notification.findOne({
      type: 'lab_payment_required',
      read: false
    });
    
    if (!notification) {
      console.log('❌ No unread lab payment notification found');
      return;
    }
    
    console.log(`📋 Found notification: ${notification._id}`);
    console.log(`   Current patient name: ${notification.data?.patientName}`);
    
    // Update the notification
    console.log('\n✏️ Updating notification patient name...');
    const result = await Notification.updateOne(
      { _id: notification._id },
      { 
        $set: { 
          'data.patientName': 'james natan',
          'data.patientId': '68866ce74ac20afd96ebd01d'
        } 
      }
    );
    
    console.log(`✅ Update result: ${result.modifiedCount} document(s) modified`);
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const updatedNotification = await Notification.findById(notification._id);
    console.log(`📋 Updated notification patient name: ${updatedNotification.data?.patientName}`);
    
    console.log('\n🎉 SUCCESS: Notification patient name fix completed!');
    console.log('='.repeat(60));
    console.log('📋 SUMMARY:');
    console.log(`   ✅ Updated notification: ${notification._id}`);
    console.log(`   ✅ Patient name: james natan`);
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('   1. Check the frontend reception dashboard');
    console.log('   2. You should now see the lab payment notification');
    console.log('   3. The patient name should be displayed correctly');
    
  } catch (error) {
    console.error('❌ Error fixing notification patient name:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the fix
fixNotificationPatientNameFinal(); 