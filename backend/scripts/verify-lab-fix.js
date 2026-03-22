#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('../models/Notification');
const LabOrder = require('../models/LabOrder');

async function verifyLabFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔍 Verifying lab notification fix...');
    
    // Check lab notifications
    const labNotifications = await Notification.find({
      type: 'lab_payment_required',
      read: false
    }).lean();
    
    console.log(`\n📋 Found ${labNotifications.length} lab notifications:`);
    
    let allHaveAmounts = true;
    
    labNotifications.forEach((notif, index) => {
      const amount = notif.data?.amount || 0;
      const hasValidAmount = amount > 0;
      
      console.log(`\n${index + 1}. Notification ID: ${notif._id}`);
      console.log(`   Patient: ${notif.data?.patientName || 'Unknown'}`);
      console.log(`   Amount: ${amount} ETB ${hasValidAmount ? '✅' : '❌'}`);
      console.log(`   Tests: ${notif.data?.testNames?.join(', ') || 'N/A'}`);
      console.log(`   Lab Orders: ${notif.data?.labOrderIds?.length || 0}`);
      
      if (!hasValidAmount) {
        allHaveAmounts = false;
      }
    });
    
    // Check lab orders
    const labOrders = await LabOrder.find({
      paymentStatus: { $ne: 'paid' }
    }).populate('patientId');
    
    console.log(`\n🧪 Found ${labOrders.length} unpaid lab orders:`);
    
    labOrders.forEach((order, index) => {
      const patientName = order.patientId ? 
        `${order.patientId.firstName} ${order.patientId.lastName}` : 
        'Unknown Patient';
      
      console.log(`${index + 1}. ${order.testName} - ${patientName} - ${order.totalPrice} ETB`);
    });
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Lab Notifications: ${labNotifications.length}`);
    console.log(`   Lab Orders: ${labOrders.length}`);
    console.log(`   All notifications have amounts > 0: ${allHaveAmounts ? '✅ YES' : '❌ NO'}`);
    
    if (allHaveAmounts && labNotifications.length > 0) {
      console.log('\n🎉 SUCCESS: Lab notification amounts are fixed!');
      console.log('   The frontend should now show proper amounts instead of ETB 0.00');
    } else if (labNotifications.length === 0) {
      console.log('\n⚠️  No lab notifications found. This might be normal if there are no pending lab orders.');
    } else {
      console.log('\n❌ ISSUE: Some notifications still have zero amounts');
    }
    
  } catch (error) {
    console.error('❌ Error verifying lab fix:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

verifyLabFix();
