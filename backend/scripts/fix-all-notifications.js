#!/usr/bin/env node

/**
 * Comprehensive Notification System Fix Script
 * 
 * This script fixes all notification-related issues:
 * 1. Removes duplicate notifications
 * 2. Updates partial payment notifications
 * 3. Cleans up stale notifications
 * 4. Consolidates similar notifications
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Notification = require('../models/Notification');
const MedicalInvoice = require('../models/MedicalInvoice');
const Prescription = require('../models/Prescription');
const LabOrder = require('../models/LabOrder');
const Patient = require('../models/Patient');

// Import cleanup utility
const NotificationCleanup = require('../utils/notificationCleanup');

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function fixDuplicateNotifications() {
  console.log('\n🔧 [STEP 1] Fixing duplicate notifications...');
  
  try {
    // Find all payment notifications grouped by patient and type
    const duplicates = await Notification.aggregate([
      {
        $match: {
          type: { $in: ['medication_payment_required', 'lab_payment_required', 'service_payment_required', 'card_payment_required'] },
          read: false
        }
      },
      {
        $group: {
          _id: {
            type: '$type',
            patientId: '$data.patientId',
            prescriptionId: '$data.prescriptionId',
            invoiceId: '$data.invoiceId'
          },
          notifications: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    console.log(`📋 Found ${duplicates.length} groups with duplicate notifications`);

    let removedCount = 0;

    for (const group of duplicates) {
      const notifications = group.notifications;
      
      // Keep the most recent notification, remove others
      const sortedNotifications = notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const toKeep = sortedNotifications[0];
      const toRemove = sortedNotifications.slice(1);

      console.log(`🔍 Processing ${notifications.length} duplicate notifications for patient ${group._id.patientId}`);
      console.log(`✅ Keeping notification: ${toKeep._id} (${toKeep.timestamp})`);

      for (const notification of toRemove) {
        await Notification.findByIdAndDelete(notification._id);
        removedCount++;
        console.log(`🗑️ Removed duplicate notification: ${notification._id} (${notification.timestamp})`);
      }
    }

    console.log(`✅ [STEP 1] Removed ${removedCount} duplicate notifications`);
  } catch (error) {
    console.error('❌ [STEP 1] Error fixing duplicates:', error);
  }
}

async function updatePartialPaymentNotifications() {
  console.log('\n🔧 [STEP 2] Updating partial payment notifications...');
  
  try {
    // Find all payment notifications
    const paymentNotifications = await Notification.find({
      type: { $in: ['medication_payment_required', 'lab_payment_required', 'service_payment_required', 'card_payment_required'] },
      read: false
    });

    console.log(`📋 Found ${paymentNotifications.length} payment notifications to check`);

    let updatedCount = 0;

    for (const notification of paymentNotifications) {
      const invoiceId = notification.data?.invoiceId;
      const prescriptionId = notification.data?.prescriptionId;

      if (invoiceId) {
        // Check invoice status
        const invoice = await MedicalInvoice.findById(invoiceId);
        if (invoice && invoice.status === 'partial' && invoice.amountPaid > 0) {
          // Update notification for partial payment
          await Notification.findByIdAndUpdate(notification._id, {
            $set: {
              'data.paymentStatus': 'partial',
              'data.amountPaid': invoice.amountPaid,
              'data.outstandingAmount': invoice.balance,
              'data.paidAt': new Date(),
              title: `Partial Payment - ${invoice.amountPaid} ETB paid, ${invoice.balance} ETB remaining`,
              message: `Partial payment received. ${invoice.amountPaid} ETB paid, ${invoice.balance} ETB remaining.`,
              updatedAt: new Date()
            }
          });
          updatedCount++;
          console.log(`📝 Updated notification ${notification._id} for partial payment on invoice ${invoiceId}`);
        }
      } else if (prescriptionId && notification.type === 'medication_payment_required') {
        // Check prescription payment status
        const prescription = await Prescription.findById(prescriptionId);
        if (prescription && prescription.paymentAuthorization) {
          const auth = prescription.paymentAuthorization;
          if (auth.paymentStatus === 'partially_paid' && auth.totalPaidAmount > 0) {
            await Notification.findByIdAndUpdate(notification._id, {
              $set: {
                'data.paymentStatus': 'partial',
                'data.amountPaid': auth.totalPaidAmount,
                'data.outstandingAmount': auth.outstandingAmount,
                'data.paidAt': new Date(),
                title: `Partial Payment - ${auth.totalPaidAmount} ETB paid, ${auth.outstandingAmount} ETB remaining`,
                message: `Partial payment received for medication. ${auth.totalPaidAmount} ETB paid, ${auth.outstandingAmount} ETB remaining.`,
                updatedAt: new Date()
              }
            });
            updatedCount++;
            console.log(`📝 Updated medication notification ${notification._id} for partial payment on prescription ${prescriptionId}`);
          }
        }
      }
    }

    console.log(`✅ [STEP 2] Updated ${updatedCount} notifications for partial payments`);
  } catch (error) {
    console.error('❌ [STEP 2] Error updating partial payments:', error);
  }
}

async function cleanupStaleNotifications() {
  console.log('\n🔧 [STEP 3] Cleaning up stale notifications...');
  
  try {
    await NotificationCleanup.cleanupAllStaleNotifications();
    console.log('✅ [STEP 3] Stale notification cleanup completed');
  } catch (error) {
    console.error('❌ [STEP 3] Error cleaning up stale notifications:', error);
  }
}

async function consolidateLabNotifications() {
  console.log('\n🔧 [STEP 4] Consolidating lab notifications...');
  
  try {
    // Find lab notifications grouped by patient
    const labGroups = await Notification.aggregate([
      {
        $match: {
          type: 'lab_payment_required',
          read: false
        }
      },
      {
        $group: {
          _id: '$data.patientId',
          notifications: { $push: '$$ROOT' },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    console.log(`📋 Found ${labGroups.length} patients with multiple lab notifications`);

    let consolidatedCount = 0;

    for (const group of labGroups) {
      const notifications = group.notifications;
      const patientId = group._id;

      // Get patient info
      const patient = await Patient.findById(patientId);
      if (!patient) continue;

      console.log(`🔍 Consolidating ${notifications.length} lab notifications for ${patient.firstName} ${patient.lastName}`);

      // Collect all lab order IDs and calculate total amount
      let allLabOrderIds = [];
      let totalAmount = 0;
      let testNames = [];

      for (const notification of notifications) {
        if (notification.data?.labOrderIds) {
          allLabOrderIds = allLabOrderIds.concat(notification.data.labOrderIds);
        }
        if (notification.data?.amount) {
          totalAmount += notification.data.amount;
        }
        if (notification.data?.testNames) {
          testNames = testNames.concat(notification.data.testNames);
        }
      }

      // Remove duplicates
      allLabOrderIds = [...new Set(allLabOrderIds)];
      testNames = [...new Set(testNames)];

      // Create consolidated notification
      const consolidatedNotification = {
        title: 'Lab Tests Payment Required',
        message: `Payment required for ${testNames.length} lab tests for ${patient.firstName} ${patient.lastName}. Total amount: ${totalAmount} ETB.`,
        type: 'lab_payment_required',
        senderId: notifications[0].senderId,
        senderRole: 'system',
        recipientRole: 'reception',
        priority: 'medium',
        data: {
          patientId: patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          labOrderIds: allLabOrderIds,
          testNames: testNames,
          amount: totalAmount,
          consolidated: true,
          originalNotificationCount: notifications.length
        },
        read: false,
        timestamp: new Date()
      };

      // Remove old notifications
      for (const notification of notifications) {
        await Notification.findByIdAndDelete(notification._id);
      }

      // Create new consolidated notification
      const newNotification = new Notification(consolidatedNotification);
      await newNotification.save();

      consolidatedCount++;
      console.log(`✅ Consolidated ${notifications.length} notifications into 1 for patient ${patient.firstName} ${patient.lastName}`);
    }

    console.log(`✅ [STEP 4] Consolidated ${consolidatedCount} groups of lab notifications`);
  } catch (error) {
    console.error('❌ [STEP 4] Error consolidating lab notifications:', error);
  }
}

async function generateSummaryReport() {
  console.log('\n📊 [SUMMARY] Generating final report...');
  
  try {
    const totalNotifications = await Notification.countDocuments();
    const unreadNotifications = await Notification.countDocuments({ read: false });
    const paymentNotifications = await Notification.countDocuments({
      type: { $in: ['medication_payment_required', 'lab_payment_required', 'service_payment_required', 'card_payment_required'] },
      read: false
    });

    console.log('\n📋 NOTIFICATION SYSTEM STATUS:');
    console.log(`   Total notifications: ${totalNotifications}`);
    console.log(`   Unread notifications: ${unreadNotifications}`);
    console.log(`   Unread payment notifications: ${paymentNotifications}`);

    // Break down by type
    const notificationTypes = await Notification.aggregate([
      { $match: { read: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📊 UNREAD NOTIFICATIONS BY TYPE:');
    for (const type of notificationTypes) {
      console.log(`   ${type._id}: ${type.count}`);
    }

    console.log('\n✅ Notification system fix completed successfully!');
  } catch (error) {
    console.error('❌ Error generating summary report:', error);
  }
}

async function main() {
  console.log('🚀 Starting comprehensive notification system fix...\n');
  
  await connectToDatabase();
  
  try {
    await fixDuplicateNotifications();
    await updatePartialPaymentNotifications();
    await cleanupStaleNotifications();
    await consolidateLabNotifications();
    await generateSummaryReport();
  } catch (error) {
    console.error('❌ Critical error during notification fix:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
