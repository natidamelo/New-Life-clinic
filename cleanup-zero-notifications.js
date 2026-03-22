const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');

// Import models
const Notification = require('./backend/models/Notification');

async function cleanupZeroAmountNotifications() {
  try {
    console.log('🧹 CLEANING UP ZERO-AMOUNT NOTIFICATIONS\n');

    // Find all medication payment notifications with zero amounts
    const zeroAmountNotifications = await Notification.find({
      type: 'medication_payment_required',
      $or: [
        { 'data.amount': { $lte: 0 } },
        { 'data.amount': { $exists: false } },
        { 'data.totalAmount': { $lte: 0 } },
        { 'data.totalAmount': { $exists: false } }
      ],
      read: { $ne: true } // Only unread ones
    });

    console.log(`Found ${zeroAmountNotifications.length} unread notifications with zero/missing amounts`);

    if (zeroAmountNotifications.length > 0) {
      // Mark them as read
      const result = await Notification.updateMany(
        {
          type: 'medication_payment_required',
          $or: [
            { 'data.amount': { $lte: 0 } },
            { 'data.amount': { $exists: false } },
            { 'data.totalAmount': { $lte: 0 } },
            { 'data.totalAmount': { $exists: false } }
          ],
          read: { $ne: true }
        },
        {
          $set: {
            read: true,
            updatedAt: new Date()
          }
        }
      );

      console.log(`✅ Successfully marked ${result.modifiedCount} zero-amount notifications as read`);
      
      // List the notifications that were cleaned up
      zeroAmountNotifications.forEach((notif, index) => {
        console.log(`${index + 1}. ID: ${notif._id} - Patient: ${notif.data?.patientName} - Amount: ${notif.data?.amount || notif.data?.totalAmount || 0}`);
      });
    } else {
      console.log('✅ No zero-amount notifications found to clean up');
    }

    console.log('\n🧹 Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    mongoose.connection.close();
  }
}

cleanupZeroAmountNotifications(); 