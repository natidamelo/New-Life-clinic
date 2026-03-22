const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');

async function testGlucoseFix() {
  try {
    console.log('🧪 Testing Glucose Inventory Fix');
    console.log('================================\n');

    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms');

    // Check current glucose inventory
    const glucoseItem = await InventoryItem.findOne({
      _id: '68dbe045d23305b944814bec'
    });

    if (!glucoseItem) {
      console.log('❌ Glucose item not found');
      return;
    }

    console.log(`📦 Current glucose quantity: ${glucoseItem.quantity}`);
    console.log(`📦 Expected decrease: 1 unit`);

    // Simulate the inventory deduction call that should happen
    console.log('\n🔬 Simulating inventory deduction...');

    // This would normally be called by the lab order controller
    const mockLabOrder = {
      testName: 'Glucose, Fasting',
      _id: new mongoose.Types.ObjectId()
    };

    const inventoryDeductionService = require('../services/inventoryDeductionService');

    const result = await inventoryDeductionService.deductLabInventory(
      mockLabOrder,
      new mongoose.Types.ObjectId('68946a3f861ea34c0eee6ac3')
    );

    if (result && result.success) {
      console.log(`✅ Inventory deduction successful!`);

      // Check the new quantity
      const updatedItem = await InventoryItem.findById('68dbe045d23305b944814bec');
      console.log(`📊 New quantity: ${updatedItem.quantity}`);
      console.log(`📊 Change: ${glucoseItem.quantity} → ${updatedItem.quantity}`);

      if (updatedItem.quantity === glucoseItem.quantity - 1) {
        console.log(`✅ VERIFICATION PASSED: Quantity correctly decreased!`);
        console.log(`🎉 Glucose inventory deduction is working properly!`);
      } else {
        console.log(`❌ VERIFICATION FAILED: Expected decrease of 1, but got ${glucoseItem.quantity - updatedItem.quantity}`);
      }
    } else {
      console.log(`❌ Inventory deduction failed`);
      if (result === null) {
        console.log(`   Reason: No mapping found or insufficient stock`);
      }
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGlucoseFix();
