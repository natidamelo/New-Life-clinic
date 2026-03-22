const mongoose = require('mongoose');
const Notification = require('../models/Notification');

/**
 * Clean up lab payment notifications that should be removed after any payment activity
 * This function can be called to remove any lingering lab notifications
 */
const cleanupLabNotifications = async () => {
  try {
    console.log('🧹 Starting lab notification cleanup...');
    
    // Find all lab payment notifications that have any payment activity
    const notificationsToUpdate = await Notification.find({
      type: 'lab_payment_required',
      $or: [
        { 'data.paymentStatus': { $in: ['paid', 'partially_paid'] } },
        { 'data.paidAt': { $exists: true } },
        { 'data.invoiceId': { $exists: true } }
      ]
    });

    console.log(`Found ${notificationsToUpdate.length} lab notifications with payment activity`);

    if (notificationsToUpdate.length > 0) {
      // Mark all these notifications as read and update their status
      const updateResult = await Notification.updateMany(
        {
          _id: { $in: notificationsToUpdate.map(n => n._id) }
        },
        {
          read: true,
          'data.paymentStatus': 'paid', // Mark as fully paid to ensure they're hidden
          'data.paidAt': new Date(),
          updatedAt: new Date()
        }
      );

      console.log(`✅ Updated ${updateResult.modifiedCount} lab notifications`);
    }

    // Also find and mark as read any lab notifications that are older than 24 hours
    const oldNotifications = await Notification.find({
      type: 'lab_payment_required',
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Older than 24 hours
      read: false
    });

    if (oldNotifications.length > 0) {
      const oldUpdateResult = await Notification.updateMany(
        {
          _id: { $in: oldNotifications.map(n => n._id) }
        },
        {
          read: true,
          'data.paymentStatus': 'expired',
          updatedAt: new Date()
        }
      );

      console.log(`✅ Marked ${oldUpdateResult.modifiedCount} old lab notifications as expired`);
    }

    console.log('🧹 Lab notification cleanup completed');
    return {
      success: true,
      updatedCount: notificationsToUpdate.length,
      expiredCount: oldNotifications.length
    };

  } catch (error) {
    console.error('❌ Error during lab notification cleanup:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = cleanupLabNotifications;
