const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');

async function testInventoryDeductionLive() {
  try {
    console.log('🔬 Testing Live Inventory Deduction');
    console.log('===================================\n');

    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms');

    // Get current glucose quantity (using the laboratory category item that user sees in pharmacy)
    const glucoseItem = await InventoryItem.findOne({
      _id: '68dbe045d23305b944814bec' // This is the laboratory category glucose item
    });

    if (!glucoseItem) {
      console.log('❌ Glucose item not found');
      return;
    }

    console.log(`📦 Current glucose quantity: ${glucoseItem.quantity}`);

    // Simulate the exact call that should happen when a lab test is completed
    console.log('\n🔬 Simulating lab order completion...');

    const mockLabOrder = {
      testName: 'Glucose, Fasting',
      _id: new mongoose.Types.ObjectId(),
      status: 'Results Available',
      createdBy: new mongoose.Types.ObjectId('68946a3f861ea34c0eee6ac3'),
      orderingDoctorId: new mongoose.Types.ObjectId('68946a3f861ea34c0eee6ac3')
    };

    const inventoryDeductionService = require('../services/inventoryDeductionService');

    console.log(`🔬 Calling deductLabInventory...`);
    const result = await inventoryDeductionService.deductLabInventory(mockLabOrder, mockLabOrder.createdBy);

    if (result && result.success) {
      console.log(`✅ Inventory deduction successful!`);
      console.log(`   Quantity consumed: ${result.quantityConsumed}`);
      console.log(`   New quantity: ${result.newQuantity}`);

      // Check final quantity
      const finalItem = await InventoryItem.findById('68dbe045d23305b944814bec');
      console.log(`📊 Final quantity: ${finalItem.quantity}`);
      console.log(`📊 Change: ${glucoseItem.quantity} → ${finalItem.quantity}`);

      if (finalItem.quantity === glucoseItem.quantity - 1) {
        console.log(`✅ VERIFICATION PASSED: Quantity correctly decreased!`);
      } else {
        console.log(`❌ VERIFICATION FAILED: Expected decrease of 1`);
      }
    } else {
      console.log(`❌ Inventory deduction failed`);
      if (result === null) {
        console.log(`   Reason: No mapping found or insufficient stock`);
      } else {
        console.log(`   Error: ${result.message || 'Unknown error'}`);
      }
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testInventoryDeductionLive();
