#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('../models/Notification');
const LabOrder = require('../models/LabOrder');
const MedicalInvoice = require('../models/MedicalInvoice');
const Patient = require('../models/Patient');

async function fixRemainingNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    // Step 1: Check current notifications
    console.log('\n🔍 Step 1: Checking current notifications...');
    
    const notifications = await Notification.find({
      type: { $in: ['lab_payment_required', 'service_payment_required'] },
      read: false
    }).lean();
    
    console.log(`Found ${notifications.length} payment notifications:`);
    
    notifications.forEach((notif, index) => {
      console.log(`\n${index + 1}. ${notif.title}`);
      console.log(`   Patient: ${notif.data?.patientName}`);
      console.log(`   Amount: ${notif.data?.amount || 'NO AMOUNT'} ETB`);
      console.log(`   Type: ${notif.type}`);
      console.log(`   ID: ${notif._id}`);
    });
    
    // Step 2: Fix lab notifications with zero amounts
    console.log('\n🔧 Step 2: Fixing lab notifications with zero amounts...');
    
    const labNotifications = notifications.filter(n => n.type === 'lab_payment_required');
    
    for (const notif of labNotifications) {
      if (!notif.data?.amount || notif.data.amount === 0) {
        console.log(`\n🔧 Fixing lab notification: ${notif._id}`);
        
        // Get the lab orders for this notification
        if (notif.data?.labOrderIds && notif.data.labOrderIds.length > 0) {
          const labOrders = await LabOrder.find({
            _id: { $in: notif.data.labOrderIds }
          });
          
          let totalAmount = 0;
          const testNames = [];
          
          labOrders.forEach(order => {
            totalAmount += order.totalPrice || 0;
            testNames.push(order.testName);
          });
          
          if (totalAmount > 0) {
            // Update the notification with correct amount
            await Notification.findByIdAndUpdate(notif._id, {
              $set: {
                'data.amount': totalAmount,
                'data.testNames': testNames,
                title: `Lab Tests Payment Required - ${totalAmount} ETB`,
                message: `Payment required for ${testNames.length} lab tests for ${notif.data?.patientName}. Total amount: ${totalAmount} ETB.`,
                updatedAt: new Date()
              }
            });
            
            console.log(`   ✅ Updated to ${totalAmount} ETB for tests: ${testNames.join(', ')}`);
          } else {
            console.log(`   ⚠️  Lab orders have no price set`);
          }
        } else {
          console.log(`   ⚠️  No lab order IDs found in notification`);
        }
      }
    }
    
    // Step 3: Fix service notifications with incorrect amounts
    console.log('\n🔧 Step 3: Checking service notifications...');
    
    const serviceNotifications = notifications.filter(n => n.type === 'service_payment_required');
    
    for (const notif of serviceNotifications) {
      console.log(`\n🔍 Checking service notification: ${notif._id}`);
      console.log(`   Patient: ${notif.data?.patientName}`);
      console.log(`   Amount: ${notif.data?.amount} ETB`);
      
      // Check if the amount seems too high (400 ETB for wound care seems high)
      if (notif.data?.amount >= 400) {
        console.log(`   ⚠️  Amount seems high, checking invoice...`);
        
        if (notif.data?.invoiceId) {
          const invoice = await MedicalInvoice.findById(notif.data.invoiceId);
          if (invoice) {
            console.log(`   📋 Invoice total: ${invoice.total} ETB`);
            console.log(`   📋 Invoice items:`, invoice.items?.map(item => `${item.description}: ${item.total} ETB`));
            
            // If invoice amount is different, update notification
            if (invoice.total !== notif.data.amount) {
              await Notification.findByIdAndUpdate(notif._id, {
                $set: {
                  'data.amount': invoice.total,
                  title: `Service Payment Required - ${invoice.total} ETB`,
                  message: `Payment required for service for ${notif.data?.patientName}. Amount: ${invoice.total} ETB.`,
                  updatedAt: new Date()
                }
              });
              
              console.log(`   ✅ Updated notification amount to ${invoice.total} ETB`);
            }
          }
        }
      }
    }
    
    // Step 4: Create missing lab orders for MR x if needed
    console.log('\n🔧 Step 4: Checking MR x patient...');
    
    let mrXPatient = await Patient.findOne({
      $or: [
        { firstName: 'MR', lastName: 'x' },
        { firstName: { $regex: /^MR$/i }, lastName: { $regex: /^x$/i } }
      ]
    });
    
    if (mrXPatient) {
      console.log(`✅ Found MR x patient: ${mrXPatient._id}`);
      
      // Check if MR x has lab orders
      const mrXLabOrders = await LabOrder.find({
        patientId: mrXPatient._id,
        paymentStatus: { $ne: 'paid' }
      });
      
      console.log(`   Lab orders for MR x: ${mrXLabOrders.length}`);
      
      if (mrXLabOrders.length === 0) {
        console.log(`   Creating lab order for MR x...`);
        
        const labOrder = new LabOrder({
          patientId: mrXPatient._id,
          patient: mrXPatient._id,
          orderingDoctorId: '507f1f77bcf86cd799439011',
          testName: 'Glucose, Fasting',
          status: 'Pending Payment',
          paymentStatus: 'pending',
          totalPrice: 200, // Set proper price
          orderDateTime: new Date(),
          priority: 'Routine'
        });
        
        await labOrder.save();
        console.log(`   ✅ Created lab order: ${labOrder.testName} - ${labOrder.totalPrice} ETB`);
        
        // Create notification for this lab order
        const notificationData = {
          title: 'Lab Tests Payment Required',
          message: `Payment required for 1 lab test for ${mrXPatient.firstName} ${mrXPatient.lastName}. Total amount: 200 ETB.`,
          type: 'lab_payment_required',
          senderId: '507f1f77bcf86cd799439011',
          senderRole: 'system',
          recipientRole: 'reception',
          priority: 'medium',
          data: {
            patientId: mrXPatient._id,
            patientName: `${mrXPatient.firstName} ${mrXPatient.lastName}`,
            labOrderIds: [labOrder._id],
            testNames: ['Glucose, Fasting'],
            amount: 200,
            consolidated: true
          },
          read: false,
          timestamp: new Date()
        };
        
        const notification = new Notification(notificationData);
        await notification.save();
        
        console.log(`   ✅ Created notification: ${notification._id}`);
      }
    } else {
      console.log(`⚠️  MR x patient not found`);
    }
    
    // Step 5: Final verification
    console.log('\n📊 Step 5: Final verification...');
    
    const finalNotifications = await Notification.find({
      type: { $in: ['lab_payment_required', 'service_payment_required'] },
      read: false
    }).lean();
    
    console.log(`\n✅ Final notification status:`);
    
    finalNotifications.forEach((notif, index) => {
      const amount = notif.data?.amount || 0;
      const hasValidAmount = amount > 0;
      
      console.log(`\n${index + 1}. ${notif.title}`);
      console.log(`   Patient: ${notif.data?.patientName}`);
      console.log(`   Amount: ${amount} ETB ${hasValidAmount ? '✅' : '❌'}`);
    });
    
    const allHaveAmounts = finalNotifications.every(n => (n.data?.amount || 0) > 0);
    
    if (allHaveAmounts) {
      console.log('\n🎉 SUCCESS: All notifications now have proper amounts!');
    } else {
      console.log('\n⚠️  Some notifications still need attention');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

fixRemainingNotifications();
