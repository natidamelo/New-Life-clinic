const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const LabOrder = require('./models/LabOrder');
const labTestMap = require('./config/labTestInventoryMap');

async function fixNotificationAmounts() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    console.log('\n🔧 Fixing notification amounts to reflect correct pricing...\n');

    // Get all lab payment notifications
    const labNotifications = await Notification.find({
      type: 'lab_payment_required'
    }).sort({ createdAt: -1 });

    console.log(`📋 Found ${labNotifications.length} lab payment notifications:`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const notification of labNotifications) {
      const testName = notification.data?.testName;
      const currentAmount = notification.data?.amount;
      const labOrderId = notification.data?.labOrderId;

      console.log(`\n🔍 Processing notification for: ${testName}`);
      console.log(`   Current amount: ${currentAmount} ETB`);
      console.log(`   Lab Order ID: ${labOrderId}`);

      if (!testName) {
        console.log('   ❌ No test name found, skipping...');
        skippedCount++;
        continue;
      }

      // Get the correct price from the mapping
      const mapping = labTestMap[testName];
      let correctPrice = 50; // Default fallback

      if (mapping && mapping.itemName) {
        // Try to get price from inventory item
        const InventoryItem = require('./models/InventoryItem');
        const inventoryItem = await InventoryItem.findOne({ name: mapping.itemName });
        
        if (inventoryItem && inventoryItem.sellingPrice) {
          correctPrice = inventoryItem.sellingPrice;
        } else {
          // Use smart pricing logic
          if (testName.toLowerCase().includes('glucose')) correctPrice = 200;
          else if (testName.toLowerCase().includes('hemoglobin') || testName.toLowerCase().includes('cbc')) correctPrice = 100;
          else if (testName.toLowerCase().includes('cholesterol') || testName.toLowerCase().includes('lipid')) correctPrice = 250;
          else if (testName.toLowerCase().includes('liver') || testName.toLowerCase().includes('alt') || testName.toLowerCase().includes('ast')) correctPrice = 150;
          else if (testName.toLowerCase().includes('kidney') || testName.toLowerCase().includes('creatinine') || testName.toLowerCase().includes('urea')) correctPrice = 120;
          else if (testName.toLowerCase().includes('thyroid') || testName.toLowerCase().includes('tsh')) correctPrice = 180;
          else if (testName.toLowerCase().includes('hiv') || testName.toLowerCase().includes('hepatitis')) correctPrice = 300;
          else if (testName.toLowerCase().includes('urine') || testName.toLowerCase().includes('stool')) correctPrice = 80;
          else correctPrice = 100;
        }
      }

      console.log(`   Correct price: ${correctPrice} ETB`);

      // Check if amount needs updating
      if (currentAmount !== correctPrice) {
        console.log(`   🔄 Updating amount from ${currentAmount} to ${correctPrice} ETB`);

        // Update notification
        notification.data.amount = correctPrice;
        notification.data.totalAmount = correctPrice;
        await notification.save();

        // Also update the corresponding lab order if it exists
        if (labOrderId) {
          const labOrder = await LabOrder.findById(labOrderId);
          if (labOrder) {
            labOrder.totalPrice = correctPrice;
            if (labOrder.tests && labOrder.tests.length > 0) {
              labOrder.tests[0].price = correctPrice;
            }
            await labOrder.save();
            console.log(`   ✅ Updated lab order ${labOrderId} price to ${correctPrice} ETB`);
          }
        }

        updatedCount++;
      } else {
        console.log(`   ✅ Amount already correct (${currentAmount} ETB)`);
        skippedCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`  ✅ Updated: ${updatedCount} notifications`);
    console.log(`  ⏭️  Skipped: ${skippedCount} notifications (already correct)`);
    console.log(`  📋 Total processed: ${labNotifications.length} notifications`);

    if (updatedCount > 0) {
      console.log('\n🎉 Notification amounts have been updated to reflect correct pricing!');
      console.log('   The frontend should now show the correct amounts.');
    } else {
      console.log('\n✅ All notification amounts are already correct!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run the fix
fixNotificationAmounts(); 