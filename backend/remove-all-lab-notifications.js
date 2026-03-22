const mongoose = require('mongoose');
const Notification = require('./models/Notification');

async function removeAllLabNotifications() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🗑️ Removing All Lab Payment Notifications\n');
    console.log('=' .repeat(60));
    
    // Count existing notifications
    const countBefore = await Notification.countDocuments({
      type: 'lab_payment_required'
    });
    
    console.log(`📋 Found ${countBefore} lab payment notifications`);
    
    if (countBefore === 0) {
      console.log('✅ No lab payment notifications to remove');
      return;
    }
    
    // Remove all lab payment notifications
    const deleteResult = await Notification.deleteMany({
      type: 'lab_payment_required'
    });
    
    console.log(`✅ Removed ${deleteResult.deletedCount} lab payment notifications`);
    
    // Verify removal
    const countAfter = await Notification.countDocuments({
      type: 'lab_payment_required'
    });
    
    console.log(`📊 Final count: ${countAfter} lab payment notifications`);
    
    if (countAfter === 0) {
      console.log('🎉 All lab payment notifications have been removed!');
    } else {
      console.log('⚠️ Some notifications may still exist');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

removeAllLabNotifications();
