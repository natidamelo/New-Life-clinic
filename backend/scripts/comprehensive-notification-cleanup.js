const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const LabOrder = require('../models/LabOrder');
const Patient = require('../models/Patient');

async function comprehensiveNotificationCleanup() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms database');
    
    console.log('\n🧹 COMPREHENSIVE NOTIFICATION CLEANUP STARTING...\n');
    
    // Step 1: Remove all duplicate and problematic notifications
    console.log('📋 Step 1: Removing duplicate and problematic notifications...');
    
    // Remove all lab-related notifications to start fresh
    const labNotifications = await Notification.find({
      type: { $in: ['lab_payment_required', 'lab_result_ready', 'PROCEDURE_PAYMENT'] }
    });
    
    console.log(`Found ${labNotifications.length} lab-related notifications to remove`);
    
    if (labNotifications.length > 0) {
      await Notification.deleteMany({
        type: { $in: ['lab_payment_required', 'lab_result_ready', 'PROCEDURE_PAYMENT'] }
      });
      console.log('✅ Removed all lab-related notifications');
    }
    
    // Step 2: Remove PATIENT_VITALS notifications (they don't need amounts)
    const vitalsNotifications = await Notification.find({
      type: 'PATIENT_VITALS'
    });
    
    console.log(`Found ${vitalsNotifications.length} PATIENT_VITALS notifications to remove`);
    
    if (vitalsNotifications.length > 0) {
      await Notification.deleteMany({
        type: 'PATIENT_VITALS'
      });
      console.log('✅ Removed PATIENT_VITALS notifications');
    }
    
    // Step 3: Check for existing lab orders and create proper notifications
    console.log('\n📋 Step 2: Checking existing lab orders...');
    
    const pendingLabOrders = await LabOrder.find({
      status: 'Pending Payment',
      paymentStatus: { $ne: 'paid' }
    }).populate('patientId', 'firstName lastName patientId');
    
    console.log(`Found ${pendingLabOrders.length} pending lab orders`);
    
    if (pendingLabOrders.length > 0) {
      // Group by patient
      const patientGroups = {};
      
      for (const order of pendingLabOrders) {
        const patientId = order.patientId?._id?.toString() || order.patientId?.toString();
        if (!patientId) continue;
        
        if (!patientGroups[patientId]) {
          patientGroups[patientId] = {
            patient: order.patientId,
            orders: []
          };
        }
        patientGroups[patientId].orders.push(order);
      }
      
      console.log(`Grouped into ${Object.keys(patientGroups).length} patients`);
      
      // Create consolidated notifications for each patient
      for (const [patientId, group] of Object.entries(patientGroups)) {
        const patient = group.patient;
        const orders = group.orders;
        
        // Calculate total amount and collect test names
        let totalAmount = 0;
        const testNames = [];
        const labOrderIds = [];
        
        orders.forEach(order => {
          totalAmount += order.totalPrice || 0;
          testNames.push(order.testName);
          labOrderIds.push(order._id);
        });
        
        // Create single consolidated notification
        const notificationData = {
          title: 'Lab Tests Payment Required',
          message: `Payment required for ${testNames.length} lab tests for ${patient.firstName} ${patient.lastName}. Total amount: ${totalAmount} ETB.`,
          type: 'lab_payment_required',
          senderId: '507f1f77bcf86cd799439011', // System user
          senderRole: 'system',
          recipientRole: 'reception',
          priority: 'medium',
          data: {
            patientId: patient._id,
            patientName: `${patient.firstName} ${patient.lastName}`,
            labOrderIds: labOrderIds,
            testNames: testNames,
            amount: totalAmount,
            totalAmount: totalAmount,
            consolidated: true,
            paymentStatus: 'pending',
            createdAt: new Date()
          },
          read: false,
          timestamp: new Date()
        };
        
        const notification = new Notification(notificationData);
        await notification.save();
        
        console.log(`✅ Created notification for ${patient.firstName} ${patient.lastName}:`);
        console.log(`   - Tests: ${testNames.join(', ')}`);
        console.log(`   - Amount: ${totalAmount} ETB`);
        console.log(`   - Lab Orders: ${labOrderIds.length}`);
      }
    }
    
    // Step 4: Clean up any remaining zero amount notifications
    console.log('\n📋 Step 3: Cleaning up zero amount notifications...');
    
    const zeroAmountNotifications = await Notification.find({
      $or: [
        { 'data.amount': 0 },
        { 'data.amount': { $exists: false } },
        { 'data.totalAmount': 0 },
        { 'data.totalAmount': { $exists: false } }
      ],
      type: { $in: ['lab_payment_required', 'service_payment_required', 'medication_payment_required'] }
    });
    
    console.log(`Found ${zeroAmountNotifications.length} zero amount notifications`);
    
    if (zeroAmountNotifications.length > 0) {
      await Notification.deleteMany({
        _id: { $in: zeroAmountNotifications.map(n => n._id) }
      });
      console.log('✅ Removed zero amount notifications');
    }
    
    // Step 5: Final verification
    console.log('\n📋 Step 4: Final verification...');
    
    const finalNotifications = await Notification.find({
      read: false
    }).sort({ createdAt: -1 });
    
    console.log(`\n✅ CLEANUP COMPLETE!`);
    console.log(`📊 Final notification count: ${finalNotifications.length}`);
    
    for (const notif of finalNotifications) {
      const amount = notif.data?.amount || notif.data?.totalAmount || 0;
      console.log(`   - ${notif.type}: ${notif.data?.patientName || 'Unknown'} - ${amount} ETB`);
    }
    
    console.log('\n🎉 All notification issues have been resolved!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
  }
}

comprehensiveNotificationCleanup();
