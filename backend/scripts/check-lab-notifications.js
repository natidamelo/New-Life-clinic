#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const Notification = require('../models/Notification');
const LabOrder = require('../models/LabOrder');
const InventoryItem = require('../models/InventoryItem');

async function checkLabNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic');
    console.log('✅ Connected to MongoDB');
    
    console.log('\n🔍 Checking lab notifications with zero amounts...');
    
    const labNotifications = await Notification.find({
      type: 'lab_payment_required',
      read: false
    }).lean();
    
    console.log(`\n📋 Found ${labNotifications.length} lab notifications`);
    
    for (let i = 0; i < labNotifications.length; i++) {
      const notif = labNotifications[i];
      console.log(`\n${i + 1}. Notification ID: ${notif._id}`);
      console.log(`   Patient: ${notif.data?.patientName}`);
      console.log(`   Amount: ${notif.data?.amount} ETB`);
      console.log(`   Test Names: ${notif.data?.testNames?.join(', ') || 'N/A'}`);
      console.log(`   Lab Order IDs: ${notif.data?.labOrderIds?.length || 0} orders`);
      console.log(`   Title: ${notif.title}`);
      console.log(`   Message: ${notif.message}`);
      
      // Check the actual lab orders for this notification
      if (notif.data?.labOrderIds && notif.data.labOrderIds.length > 0) {
        console.log(`   \n   📊 Lab Order Details:`);
        
        let totalCalculatedAmount = 0;
        for (const labOrderId of notif.data.labOrderIds) {
          try {
            const labOrder = await LabOrder.findById(labOrderId);
            if (labOrder) {
              console.log(`      - ${labOrder.testName}: ${labOrder.totalPrice || 0} ETB (Status: ${labOrder.status})`);
              totalCalculatedAmount += labOrder.totalPrice || 0;
            } else {
              console.log(`      - Lab Order ${labOrderId}: NOT FOUND`);
            }
          } catch (error) {
            console.log(`      - Lab Order ${labOrderId}: ERROR - ${error.message}`);
          }
        }
        
        console.log(`   📊 Total Calculated Amount: ${totalCalculatedAmount} ETB`);
        console.log(`   📊 Notification Amount: ${notif.data?.amount} ETB`);
        
        if (totalCalculatedAmount !== notif.data?.amount) {
          console.log(`   ⚠️  MISMATCH: Notification amount doesn't match calculated amount!`);
        }
      }
    }
    
    // Also check inventory items for lab test pricing
    console.log(`\n🧪 Checking inventory items for lab test pricing...`);
    const inventoryItems = await InventoryItem.find({
      category: { $in: ['Lab Test', 'Laboratory', 'lab'] }
    }).lean();
    
    console.log(`\n📦 Found ${inventoryItems.length} lab-related inventory items:`);
    inventoryItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}: ${item.sellingPrice} ETB (Category: ${item.category})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking lab notifications:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkLabNotifications();
