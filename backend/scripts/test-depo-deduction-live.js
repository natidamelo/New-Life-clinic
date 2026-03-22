const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');

require('dotenv').config();

async function testDepoDeduction() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms database\n');

    const depoItem = await InventoryItem.findOne({
      name: { $regex: /depo/i },
      isActive: true
    });

    if (!depoItem) {
      console.log('❌ No active Depo item found');
      return;
    }

    console.log(`📦 Testing Depo Injection Inventory Deduction\n`);
    console.log(`Current quantity BEFORE test: ${depoItem.quantity}\n`);

    // Test the exact code that medicationAdministration.js uses
    console.log(`Simulating the exact deduction code...\n`);
    
    const previousQty = depoItem.quantity;
    
    // This is the EXACT code from medicationAdministration.js:738-745
    const updatedItem = await InventoryItem.findOneAndUpdate(
      { _id: depoItem._id },
      {
        $inc: { quantity: -1 },
        $set: { updatedBy: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011') }
      },
      { new: true }
    );

    console.log(`✅ Deduction complete`);
    console.log(`   Previous quantity: ${previousQty}`);
    console.log(`   Expected new quantity: ${previousQty - 1}`);
    console.log(`   Actual new quantity: ${updatedItem.quantity}`);
    
    const actualChange = updatedItem.quantity - previousQty;
    console.log(`   Actual change: ${actualChange}`);
    
    if (actualChange === -1) {
      console.log(`\n✅ CORRECT - Inventory deducted by 1 as expected`);
    } else {
      console.log(`\n❌ WRONG - Inventory deducted by ${Math.abs(actualChange)} instead of 1!`);
    }

    // Check if there's a hook being triggered
    console.log(`\n🔍 Checking if save hook is triggered...`);
    
    // Refresh from database
    const refreshedItem = await InventoryItem.findById(depoItem._id);
    console.log(`   Quantity after refresh: ${refreshedItem.quantity}`);
    
    if (refreshedItem.quantity !== updatedItem.quantity) {
      console.log(`   ⚠️  QUANTITY CHANGED after findOneAndUpdate! Hook might be running!`);
    } else {
      console.log(`   ✅ Quantity stable - no hook interference detected`);
    }

    // Rollback the test deduction
    console.log(`\n🔄 Rolling back test deduction...`);
    await InventoryItem.findByIdAndUpdate(
      depoItem._id,
      { $inc: { quantity: 1 } }
    );
    
    const finalItem = await InventoryItem.findById(depoItem._id);
    console.log(`   Quantity restored to: ${finalItem.quantity}`);
    
    console.log(`\n✅ Test complete\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testDepoDeduction();

