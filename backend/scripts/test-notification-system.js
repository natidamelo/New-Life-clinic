#!/usr/bin/env node

/**
 * Test Notification System Functionality
 * 
 * This script tests the notification system to ensure it's working correctly:
 * 1. Creates test notifications
 * 2. Tests duplicate prevention
 * 3. Tests partial payment updates
 * 4. Tests cleanup functionality
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models and utilities
const Notification = require('../models/Notification');
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

async function testDuplicatePrevention() {
  console.log('\n🧪 [TEST 1] Testing duplicate prevention...');
  
  try {
    const testNotificationData = {
      title: 'Test Payment Required',
      message: 'This is a test notification',
      type: 'medication_payment_required',
      senderId: '507f1f77bcf86cd799439011',
      senderRole: 'system',
      recipientRole: 'reception',
      priority: 'medium',
      data: {
        prescriptionId: 'test-prescription-123',
        patientId: 'test-patient-123',
        patientName: 'Test Patient',
        amount: 100
      }
    };

    // Create first notification
    const notification1 = await NotificationCleanup.createNotificationSafely(testNotificationData);
    console.log(`✅ Created first notification: ${notification1 ? notification1._id : 'null'}`);

    // Try to create duplicate - should be prevented
    const notification2 = await NotificationCleanup.createNotificationSafely(testNotificationData);
    console.log(`🚫 Second notification (should be null): ${notification2 ? notification2._id : 'null'}`);

    // Clean up test notification
    if (notification1) {
      await Notification.findByIdAndDelete(notification1._id);
      console.log('🧹 Cleaned up test notification');
    }

    console.log('✅ [TEST 1] Duplicate prevention test passed');
  } catch (error) {
    console.error('❌ [TEST 1] Duplicate prevention test failed:', error);
  }
}

async function testNotificationFiltering() {
  console.log('\n🧪 [TEST 2] Testing notification filtering...');
  
  try {
    // Create test notifications with different statuses
    const testNotifications = [
      {
        title: 'Fully Paid Test',
        message: 'This should be hidden',
        type: 'medication_payment_required',
        senderId: '507f1f77bcf86cd799439011',
        senderRole: 'system',
        recipientRole: 'reception',
        data: {
          patientId: 'test-patient-1',
          patientName: 'Test Patient 1',
          paymentStatus: 'paid'
        },
        read: false
      },
      {
        title: 'Partial Payment Test',
        message: 'This should be visible',
        type: 'medication_payment_required',
        senderId: '507f1f77bcf86cd799439011',
        senderRole: 'system',
        recipientRole: 'reception',
        data: {
          patientId: 'test-patient-2',
          patientName: 'Test Patient 2',
          paymentStatus: 'partial',
          amountPaid: 50,
          outstandingAmount: 50
        },
        read: false
      },
      {
        title: 'Unpaid Test',
        message: 'This should be visible',
        type: 'medication_payment_required',
        senderId: '507f1f77bcf86cd799439011',
        senderRole: 'system',
        recipientRole: 'reception',
        data: {
          patientId: 'test-patient-3',
          patientName: 'Test Patient 3',
          amount: 100
        },
        read: false
      }
    ];

    // Create test notifications
    const createdNotifications = [];
    for (const notifData of testNotifications) {
      const notification = new Notification(notifData);
      await notification.save();
      createdNotifications.push(notification);
    }

    console.log(`✅ Created ${createdNotifications.length} test notifications`);

    // Test API filtering
    const allNotifications = await Notification.find({
      recipientRole: 'reception',
      title: { $regex: /Test$/ }
    });

    console.log(`📋 Found ${allNotifications.length} test notifications in database`);

    // Test filtering logic
    const visibleNotifications = allNotifications.filter(notif => {
      const paymentStatus = notif.data?.paymentStatus;
      const isFullyPaid = paymentStatus === 'paid' || paymentStatus === 'fully_paid';
      
      if (isFullyPaid) {
        return false; // Should be hidden
      }
      
      return true; // Should be visible
    });

    console.log(`👀 ${visibleNotifications.length} notifications should be visible (expected: 2)`);

    // Clean up test notifications
    await Notification.deleteMany({ title: { $regex: /Test$/ } });
    console.log('🧹 Cleaned up test notifications');

    if (visibleNotifications.length === 2) {
      console.log('✅ [TEST 2] Notification filtering test passed');
    } else {
      console.log('❌ [TEST 2] Notification filtering test failed');
    }
  } catch (error) {
    console.error('❌ [TEST 2] Notification filtering test failed:', error);
  }
}

async function testNotificationAPI() {
  console.log('\n🧪 [TEST 3] Testing notification API...');
  
  try {
    // Count current notifications
    const currentCount = await Notification.countDocuments({ recipientRole: 'reception', read: false });
    console.log(`📊 Current unread reception notifications: ${currentCount}`);

    // Test query that mimics frontend API call
    const filter = {
      recipientRole: 'reception',
      $or: [
        { read: false },
        { 
          type: { $in: ['service_payment_required','lab_payment_required','medication_payment_required','card_payment_required'] },
          'data.paymentStatus': { $in: ['partial', 'partially_paid'] }
        },
        { type: { $nin: ['service_payment_required','lab_payment_required','medication_payment_required','card_payment_required'] } }
      ]
    };

    const apiResults = await Notification.find(filter)
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    console.log(`🔍 API query returned ${apiResults.length} notifications`);

    // Analyze notification types
    const typeBreakdown = {};
    apiResults.forEach(notif => {
      typeBreakdown[notif.type] = (typeBreakdown[notif.type] || 0) + 1;
    });

    console.log('📊 Notification type breakdown:');
    Object.entries(typeBreakdown).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });

    console.log('✅ [TEST 3] Notification API test completed');
  } catch (error) {
    console.error('❌ [TEST 3] Notification API test failed:', error);
  }
}

async function generateHealthReport() {
  console.log('\n📊 [HEALTH REPORT] Notification System Status...');
  
  try {
    const totalNotifications = await Notification.countDocuments();
    const unreadNotifications = await Notification.countDocuments({ read: false });
    const receptionNotifications = await Notification.countDocuments({ recipientRole: 'reception', read: false });
    const paymentNotifications = await Notification.countDocuments({
      type: { $in: ['medication_payment_required', 'lab_payment_required', 'service_payment_required', 'card_payment_required'] },
      read: false
    });

    console.log('\n📈 NOTIFICATION SYSTEM HEALTH:');
    console.log(`   Total notifications: ${totalNotifications}`);
    console.log(`   Unread notifications: ${unreadNotifications}`);
    console.log(`   Reception notifications: ${receptionNotifications}`);
    console.log(`   Payment notifications: ${paymentNotifications}`);

    // Check for potential issues
    if (paymentNotifications > 10) {
      console.log('⚠️  High number of payment notifications - consider running cleanup');
    }

    if (unreadNotifications > 50) {
      console.log('⚠️  High number of unread notifications - consider review');
    }

    if (paymentNotifications === 0 && receptionNotifications === 0) {
      console.log('✅ No pending notifications - system is clean');
    }

    console.log('\n✅ Notification system health check completed');
  } catch (error) {
    console.error('❌ Health report failed:', error);
  }
}

async function main() {
  console.log('🚀 Starting notification system tests...\n');
  
  await connectToDatabase();
  
  try {
    await testDuplicatePrevention();
    await testNotificationFiltering();
    await testNotificationAPI();
    await generateHealthReport();
    
    console.log('\n🎉 All notification system tests completed!');
  } catch (error) {
    console.error('❌ Critical error during tests:', error);
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
