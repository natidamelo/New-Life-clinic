const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const Patient = require('./models/Patient');

async function fixNotificationPatientName() {
  try {
    console.log('🔧 Fixing Patient Name in Lab Payment Notification');
    console.log('='.repeat(60));
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms database');
    
    // Step 1: Find the unread lab payment notification
    console.log('\n🔍 Step 1: Finding unread lab payment notification...');
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
    console.log(`   Patient ID: ${notification.data?.patientId}`);
    
    // Step 2: Get the patient information
    const patient = await Patient.findById(notification.data?.patientId);
    if (!patient) {
      console.log('❌ Patient not found');
      return;
    }
    
    console.log(`👤 Patient found: ${patient.firstName} ${patient.lastName}`);
    
    // Step 3: Update the notification with correct patient name
    console.log('\n✏️ Step 3: Updating notification with correct patient name...');
    
    // Use direct database update to ensure the change is saved
    const result = await Notification.updateOne(
      { _id: notification._id },
      { 
        $set: { 
          'data.patientName': `${patient.firstName} ${patient.lastName}`,
          'data.patientId': patient._id
        } 
      }
    );
    
    console.log(`✅ Update result: ${result.modifiedCount} document(s) modified`);
    
    // Step 4: Verify the fix
    console.log('\n🔍 Step 4: Verifying the fix...');
    const updatedNotification = await Notification.findById(notification._id);
    console.log(`📋 Updated notification patient name: ${updatedNotification.data?.patientName}`);
    
    // Step 5: Check all unread notifications
    console.log('\n📋 Step 5: Checking all unread notifications...');
    const allUnreadNotifications = await Notification.find({
      type: 'lab_payment_required',
      read: false
    });
    
    console.log(`📊 Total unread lab payment notifications: ${allUnreadNotifications.length}`);
    allUnreadNotifications.forEach((notif, index) => {
      console.log(`   ${index + 1}. ${notif.data?.patientName}: ${notif.data?.totalAmount} ETB (${notif.data?.itemCount} tests)`);
    });
    
    console.log('\n🎉 SUCCESS: Patient name fix completed!');
    console.log('='.repeat(60));
    console.log('📋 SUMMARY:');
    console.log(`   ✅ Updated notification: ${notification._id}`);
    console.log(`   ✅ Patient name: ${patient.firstName} ${patient.lastName}`);
    console.log(`   ✅ Total unread notifications: ${allUnreadNotifications.length}`);
    
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
fixNotificationPatientName(); 