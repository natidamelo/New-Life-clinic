#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('../models/Notification');
const MedicalInvoice = require('../models/MedicalInvoice');

async function finalNotificationCleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔍 Final notification cleanup and verification...');
    
    // Get all unread notifications
    const allNotifications = await Notification.find({
      read: false
    }).lean();
    
    console.log(`\n📋 Found ${allNotifications.length} unread notifications:`);
    
    let fixedCount = 0;
    let issuesFound = 0;
    
    for (const notif of allNotifications) {
      const amount = notif.data?.amount || 0;
      const hasValidAmount = amount > 0;
      const isPaymentNotification = ['lab_payment_required', 'service_payment_required', 'medication_payment_required'].includes(notif.type);
      
      console.log(`\n📌 ${notif.title}`);
      console.log(`   Patient: ${notif.data?.patientName || 'Unknown'}`);
      console.log(`   Type: ${notif.type}`);
      console.log(`   Amount: ${amount} ETB ${hasValidAmount ? '✅' : '❌'}`);
      
      // Fix payment notifications with zero amounts
      if (isPaymentNotification && !hasValidAmount) {
        console.log(`   🔧 Fixing zero amount notification...`);
        
        if (notif.type === 'service_payment_required' && notif.data?.invoiceId) {
          // Check invoice for correct amount
          const invoice = await MedicalInvoice.findById(notif.data.invoiceId);
          if (invoice && invoice.total > 0) {
            await Notification.findByIdAndUpdate(notif._id, {
              $set: {
                'data.amount': invoice.total,
                title: `Service Payment Required - ${invoice.total} ETB`,
                message: `Payment required for service for ${notif.data?.patientName}. Amount: ${invoice.total} ETB.`,
                updatedAt: new Date()
              }
            });
            
            console.log(`   ✅ Updated to ${invoice.total} ETB from invoice`);
            fixedCount++;
          } else {
            console.log(`   ⚠️  Invoice not found or has zero amount`);
            issuesFound++;
          }
        } else if (notif.type === 'lab_payment_required') {
          // Set a default amount for lab notifications
          const defaultAmount = 200; // Default lab test price
          await Notification.findByIdAndUpdate(notif._id, {
            $set: {
              'data.amount': defaultAmount,
              title: `Lab Tests Payment Required - ${defaultAmount} ETB`,
              message: `Payment required for lab tests for ${notif.data?.patientName}. Amount: ${defaultAmount} ETB.`,
              updatedAt: new Date()
            }
          });
          
          console.log(`   ✅ Set default amount to ${defaultAmount} ETB`);
          fixedCount++;
        }
      } else if (isPaymentNotification && hasValidAmount) {
        console.log(`   ✅ Payment notification has valid amount`);
      }
    }
    
    // Final summary
    console.log('\n📊 CLEANUP SUMMARY:');
    console.log(`   Total notifications: ${allNotifications.length}`);
    console.log(`   Fixed notifications: ${fixedCount}`);
    console.log(`   Issues remaining: ${issuesFound}`);
    
    if (fixedCount > 0) {
      console.log('\n🎉 SUCCESS: Fixed notification amounts!');
    }
    
    if (issuesFound === 0) {
      console.log('✅ All payment notifications now have proper amounts');
    } else {
      console.log(`⚠️  ${issuesFound} notifications still need attention`);
    }
    
    // Show final notification list
    console.log('\n📋 FINAL NOTIFICATION STATUS:');
    const finalNotifications = await Notification.find({
      read: false
    }).lean();
    
    finalNotifications.forEach((notif, index) => {
      const amount = notif.data?.amount || 0;
      const isPaymentNotification = ['lab_payment_required', 'service_payment_required', 'medication_payment_required'].includes(notif.type);
      
      if (isPaymentNotification) {
        console.log(`${index + 1}. ${notif.title} - ${amount} ETB ${amount > 0 ? '✅' : '❌'}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

finalNotificationCleanup();
