const mongoose = require('mongoose');
const Notification = require('./models/Notification');

async function removeDuplicateNotifications() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🧹 Removing Duplicate Lab Payment Notifications\n');
    console.log('=' .repeat(60));
    
    // Find all lab payment notifications
    const notifications = await Notification.find({
      type: 'lab_payment_required'
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${notifications.length} total lab payment notifications`);
    
    // Group notifications by patient and invoice
    const groupedNotifications = {};
    
    notifications.forEach(notification => {
      const patientName = notification.data?.patientName;
      const invoiceId = notification.data?.invoiceId;
      const key = `${patientName}-${invoiceId}`;
      
      if (!groupedNotifications[key]) {
        groupedNotifications[key] = [];
      }
      groupedNotifications[key].push(notification);
    });
    
    // Find duplicates
    const duplicates = [];
    Object.entries(groupedNotifications).forEach(([key, group]) => {
      if (group.length > 1) {
        duplicates.push({ key, notifications: group });
      }
    });
    
    console.log(`Found ${duplicates.length} groups with duplicate notifications`);
    
    if (duplicates.length > 0) {
      for (const duplicate of duplicates) {
        console.log(`\n🔍 Processing duplicates for: ${duplicate.key}`);
        console.log(`   Found ${duplicate.notifications.length} notifications`);
        
        // Sort by creation date (keep the oldest one)
        const sortedNotifications = duplicate.notifications.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
        
        // Keep the first (oldest) notification, remove the rest
        const toKeep = sortedNotifications[0];
        const toRemove = sortedNotifications.slice(1);
        
        console.log(`   Keeping: ${toKeep._id} (created: ${toKeep.createdAt})`);
        console.log(`   Removing: ${toRemove.length} duplicates`);
        
        for (const notification of toRemove) {
          console.log(`     Removing: ${notification._id} (created: ${notification.createdAt})`);
          await Notification.findByIdAndDelete(notification._id);
        }
      }
    }
    
    // Verify the cleanup
    console.log('\n🔍 Verifying cleanup...');
    const remainingNotifications = await Notification.find({
      type: 'lab_payment_required'
    }).sort({ createdAt: -1 });
    
    console.log(`\n📋 Remaining notifications: ${remainingNotifications.length}`);
    remainingNotifications.forEach((notification, index) => {
      console.log(`\n${index + 1}. Notification ID: ${notification._id}`);
      console.log(`   Patient: ${notification.data?.patientName}`);
      console.log(`   Invoice ID: ${notification.data?.invoiceId}`);
      console.log(`   Title: ${notification.title}`);
      console.log(`   Read: ${notification.read}`);
      console.log(`   Payment Status: ${notification.data?.paymentStatus}`);
      console.log(`   Created: ${notification.createdAt}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

removeDuplicateNotifications();
