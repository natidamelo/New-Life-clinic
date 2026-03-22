const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const LabOrder = require('../models/LabOrder');

async function checkLabNotificationDetails() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔍 Checking lab notification details...');
    
    // Find the lab notification
    const labNotification = await Notification.findOne({
      type: 'lab_payment_required',
      read: false
    });
    
    if (!labNotification) {
      console.log('❌ No lab notification found');
      return;
    }
    
    console.log('\n📋 Lab Notification Details:');
    console.log(`   ID: ${labNotification._id}`);
    console.log(`   Title: ${labNotification.title}`);
    console.log(`   Message: ${labNotification.message}`);
    console.log(`   Amount: ${labNotification.data?.amount || 0} ETB`);
    console.log(`   Total Amount: ${labNotification.data?.totalAmount || 0} ETB`);
    console.log(`   Patient: ${labNotification.data?.patientName}`);
    console.log(`   Lab Order IDs: ${JSON.stringify(labNotification.data?.labOrderIds)}`);
    console.log(`   Test Names: ${JSON.stringify(labNotification.data?.testNames)}`);
    
    // Check the actual lab orders
    if (labNotification.data?.labOrderIds && Array.isArray(labNotification.data.labOrderIds)) {
      console.log('\n🔍 Checking associated lab orders:');
      
      let totalCalculated = 0;
      for (const labOrderId of labNotification.data.labOrderIds) {
        const labOrder = await LabOrder.findById(labOrderId);
        if (labOrder) {
          console.log(`   Lab Order ${labOrderId}:`);
          console.log(`     Test: ${labOrder.testName}`);
          console.log(`     Price: ${labOrder.totalPrice || 0} ETB`);
          console.log(`     Status: ${labOrder.status}`);
          totalCalculated += labOrder.totalPrice || 0;
        } else {
          console.log(`   Lab Order ${labOrderId}: NOT FOUND`);
        }
      }
      
      console.log(`\n💰 Total calculated from lab orders: ${totalCalculated} ETB`);
      console.log(`💰 Notification amount: ${labNotification.data?.amount || 0} ETB`);
      
      if (totalCalculated !== (labNotification.data?.amount || 0)) {
        console.log('❌ AMOUNT MISMATCH! Need to fix notification.');
        
        // Fix the notification
        await Notification.findByIdAndUpdate(labNotification._id, {
          $set: {
            'data.amount': totalCalculated,
            'data.totalAmount': totalCalculated,
            'title': `Lab Tests Payment Required - ${totalCalculated} ETB`,
            'message': `Payment required for lab tests. Total amount: ${totalCalculated} ETB.`
          }
        });
        
        console.log('✅ Fixed notification amount');
      } else {
        console.log('✅ Amounts match correctly');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkLabNotificationDetails();
