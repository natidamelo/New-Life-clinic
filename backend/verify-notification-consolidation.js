const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const InventoryItem = require('./models/InventoryItem');
const labTestMap = require('./config/labTestInventoryMap');

async function verifyNotificationConsolidation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    // List of tests to verify
    const testsToVerify = [
      'Hemoglobin', 
      'Glucose, Fasting', 
      'HBsAg'
    ];
    
    console.log('\n🔍 Verifying Notification Consolidation:\n');
    
    let totalPrice = 0;
    const testDetails = [];
    
    for (const testName of testsToVerify) {
      const mapping = labTestMap[testName];
      
      if (!mapping) {
        console.log(`❌ No mapping found for test: ${testName}`);
        continue;
      }
      
      // Find inventory item
      const inventoryItem = await InventoryItem.findOne({ name: mapping.itemName });
      
      if (!inventoryItem) {
        console.log(`❌ No inventory item found for: ${mapping.itemName}`);
        continue;
      }
      
      const price = inventoryItem.sellingPrice;
      
      console.log(`✅ ${testName}:`);
      console.log(`   - Inventory Item: ${inventoryItem.name}`);
      console.log(`   - Selling Price: ETB ${price}`);
      
      totalPrice += price;
      testDetails.push({
        testName,
        price,
        inventoryItemName: inventoryItem.name
      });
    }
    
    console.log('\n📊 Consolidated Pricing Summary:');
    console.log('Test Details:');
    testDetails.forEach(test => {
      console.log(`- ${test.testName}: ETB ${test.price}`);
    });
    console.log(`\nTotal Price: ETB ${totalPrice}`);
    
    // Check existing notifications
    console.log('\n🔔 Checking Existing Notifications:');
    const notifications = await Notification.find({
      type: 'lab_payment_required'
    }).sort({ timestamp: -1 });
    
    console.log(`Total lab payment notifications: ${notifications.length}`);
    
    notifications.forEach((notification, index) => {
      console.log(`\nNotification ${index + 1}:`);
      console.log(`- Patient: ${notification.data?.patientName || 'N/A'}`);
      console.log(`- Amount: ETB ${notification.data?.amount || 'N/A'}`);
      console.log(`- Tests: ${notification.data?.testNames?.join(', ') || 'N/A'}`);
      console.log(`- Timestamp: ${notification.timestamp}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

verifyNotificationConsolidation(); 