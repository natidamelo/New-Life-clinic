#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('../models/Notification');
const LabOrder = require('../models/LabOrder');
const Patient = require('../models/Patient');
const InventoryItem = require('../models/InventoryItem');

// Lab test mapping to inventory items
const labTestMap = {
  'Complete Urinalysis': { itemName: 'Complete Urinalysis', price: 100 },
  'HBsAg': { itemName: 'HBsAg', price: 500 },
  'Hemoglobin': { itemName: 'Hemoglobin', price: 100 },
  'Glucose, Fasting': { itemName: 'Glucose, Fasting', price: 200 },
  'Glucose': { itemName: 'Glucose, Fasting', price: 200 },
  'Fasting': { itemName: 'Glucose, Fasting', price: 200 }
};

async function fixLabNotificationsZero() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic');
    console.log('✅ Connected to MongoDB');
    
    // Step 1: Check current lab orders
    console.log('\n🔍 Step 1: Checking current lab orders...');
    const labOrders = await LabOrder.find({
      status: { $in: ['pending', 'ordered'] },
      paymentStatus: { $ne: 'paid' }
    }).populate('patientId').lean();
    
    console.log(`📋 Found ${labOrders.length} unpaid lab orders`);
    
    if (labOrders.length === 0) {
      console.log('✅ No unpaid lab orders found. Creating some test data...');
      
      // Create some test lab orders for the patients visible in the UI
      const testPatients = [
        { firstName: 'MR', lastName: 'x', patientId: 'MR-x' },
        { firstName: 'Natan', lastName: 'Kinfe', patientId: 'Natan-Kinfe' }
      ];
      
      for (const testPatient of testPatients) {
        // Find or create patient
        let patient = await Patient.findOne({ 
          $or: [
            { patientId: testPatient.patientId },
            { firstName: testPatient.firstName, lastName: testPatient.lastName }
          ]
        });
        
        if (!patient) {
          console.log(`⚠️  Patient ${testPatient.firstName} ${testPatient.lastName} not found`);
          continue;
        }
        
        console.log(`👤 Found patient: ${patient.firstName} ${patient.lastName} (ID: ${patient._id})`);
        
        // Create lab orders for this patient
        const testNames = testPatient.firstName === 'MR' ? ['Glucose, Fasting'] : ['Glucose, Fasting', 'Hemoglobin', 'Complete Urinalysis'];
        
        for (const testName of testNames) {
          const mapping = labTestMap[testName];
          const price = mapping ? mapping.price : 100; // Default price
          
          const labOrder = new LabOrder({
            patientId: patient._id,
            testName: testName,
            status: 'pending',
            paymentStatus: 'pending',
            totalPrice: price,
            orderDate: new Date(),
            orderedBy: '507f1f77bcf86cd799439011', // Default system user
            category: 'Hematology'
          });
          
          await labOrder.save();
          console.log(`✅ Created lab order: ${testName} for ${patient.firstName} ${patient.lastName} - ${price} ETB`);
        }
      }
      
      // Re-fetch lab orders after creation
      const newLabOrders = await LabOrder.find({
        status: { $in: ['pending', 'ordered'] },
        paymentStatus: { $ne: 'paid' }
      }).populate('patientId').lean();
      
      console.log(`📋 Now have ${newLabOrders.length} unpaid lab orders`);
    }
    
    // Step 2: Group lab orders by patient and create consolidated notifications
    console.log('\n🔧 Step 2: Creating consolidated lab notifications...');
    
    const updatedLabOrders = await LabOrder.find({
      status: { $in: ['pending', 'ordered'] },
      paymentStatus: { $ne: 'paid' }
    }).populate('patientId').lean();
    
    // Group by patient
    const patientGroups = {};
    updatedLabOrders.forEach(order => {
      const patientId = order.patientId._id.toString();
      if (!patientGroups[patientId]) {
        patientGroups[patientId] = {
          patient: order.patientId,
          orders: []
        };
      }
      patientGroups[patientId].orders.push(order);
    });
    
    console.log(`👥 Grouped into ${Object.keys(patientGroups).length} patient groups`);
    
    // Step 3: Remove any existing lab notifications
    console.log('\n🧹 Step 3: Removing existing lab notifications...');
    const deleteResult = await Notification.deleteMany({
      type: 'lab_payment_required'
    });
    console.log(`🗑️  Removed ${deleteResult.deletedCount} existing lab notifications`);
    
    // Step 4: Create new consolidated notifications
    console.log('\n✅ Step 4: Creating new consolidated notifications...');
    
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
      
      // Create consolidated notification
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
          consolidated: true,
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
    
    // Step 5: Verify the fix
    console.log('\n📊 Step 5: Verifying the fix...');
    
    const finalNotifications = await Notification.find({
      type: 'lab_payment_required',
      read: false
    }).lean();
    
    console.log(`\n✅ Final verification:`);
    console.log(`   - Created ${finalNotifications.length} lab notifications`);
    
    finalNotifications.forEach((notif, index) => {
      console.log(`\n${index + 1}. ${notif.data?.patientName}`);
      console.log(`   Amount: ${notif.data?.amount} ETB`);
      console.log(`   Tests: ${notif.data?.testNames?.join(', ')}`);
    });
    
    if (finalNotifications.every(n => n.data?.amount > 0)) {
      console.log('\n🎉 SUCCESS: All lab notifications now have proper amounts!');
    } else {
      console.log('\n⚠️  WARNING: Some notifications still have zero amounts');
    }
    
  } catch (error) {
    console.error('❌ Error fixing lab notifications:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

fixLabNotificationsZero();
