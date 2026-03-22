const mongoose = require('mongoose');
const inventoryDeductionService = require('../services/inventoryDeductionService');
const InventoryItem = require('../models/InventoryItem');

async function comprehensiveInventoryTest() {
  try {
    console.log('🧪 Comprehensive Inventory Deduction Test');
    console.log('=========================================\n');

    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms');

    // Test 1: Lab Test Inventory Deduction
    console.log('📋 Test 1: Lab Test Inventory Deduction');
    console.log('=======================================');

    const glucoseItem = await InventoryItem.findOne({
      _id: '68dbe045d23305b944814bec' // Laboratory category glucose
    });

    if (glucoseItem) {
      console.log(`  📦 Glucose item: ${glucoseItem.name} (${glucoseItem.category})`);
      console.log(`  📦 Current quantity: ${glucoseItem.quantity}`);

      const initialQuantity = glucoseItem.quantity;

      // Test glucose deduction
      const labOrder = {
        testName: 'Glucose, Fasting',
        _id: new mongoose.Types.ObjectId()
      };

      const result = await inventoryDeductionService.deductLabInventory(labOrder, new mongoose.Types.ObjectId());

      if (result && result.success) {
        console.log(`  ✅ Lab deduction successful: ${result.quantityConsumed} units`);
        console.log(`  📊 New quantity: ${result.newQuantity}`);

        // Verify in database
        const updatedGlucoseItem = await InventoryItem.findById(glucoseItem._id);
        if (updatedGlucoseItem && updatedGlucoseItem.quantity === initialQuantity - 1) {
          console.log(`  ✅ Database verification passed`);
        } else {
          console.log(`  ❌ Database verification failed`);
        }
      } else {
        console.log(`  ❌ Lab deduction failed`);
      }
    }

    // Test 2: Service Inventory Deduction
    console.log('\n📋 Test 2: Service Inventory Deduction');
    console.log('=======================================');

    const Service = require('../models/Service');
    const serviceWithInventory = await Service.findOne({
      category: 'lab',
      linkedInventoryItems: { $exists: true, $ne: [] }
    }).populate('linkedInventoryItems');

    if (serviceWithInventory && serviceWithInventory.linkedInventoryItems.length > 0) {
      const inventoryItem = serviceWithInventory.linkedInventoryItems[0];
      console.log(`  📦 Service: ${serviceWithInventory.name}`);
      console.log(`  📦 Linked item: ${inventoryItem.name} (${inventoryItem.category})`);
      console.log(`  📦 Current quantity: ${inventoryItem.quantity}`);

      const initialQuantity = inventoryItem.quantity;

      // Test service deduction
      const serviceResult = await inventoryDeductionService.deductServiceInventory(
        serviceWithInventory._id,
        1,
        new mongoose.Types.ObjectId()
      );

      if (serviceResult && serviceResult.success) {
        console.log(`  ✅ Service deduction successful: ${serviceResult.quantityConsumed} units`);
        console.log(`  📊 New quantity: ${serviceResult.newQuantity}`);

        // Verify in database
        const updatedInventoryItem = await InventoryItem.findById(inventoryItem._id);
        if (updatedInventoryItem && updatedInventoryItem.quantity === initialQuantity - 1) {
          console.log(`  ✅ Database verification passed`);
        } else {
          console.log(`  ❌ Database verification failed`);
        }
      } else {
        console.log(`  ❌ Service deduction failed`);
      }
    }

    // Test 3: Medication Inventory Deduction
    console.log('\n📋 Test 3: Medication Inventory Deduction');
    console.log('==========================================');

    const medicationItem = await InventoryItem.findOne({
      category: 'medication',
      isActive: true
    });

    if (medicationItem) {
      console.log(`  💊 Medication: ${medicationItem.name} (${medicationItem.category})`);
      console.log(`  💊 Current quantity: ${medicationItem.quantity}`);

      const initialQuantity = medicationItem.quantity;

      // Test medication deduction
      const medicationResult = await inventoryDeductionService.deductMedicationInventory(
        medicationItem.name,
        1,
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
        'Test medication administration'
      );

      if (medicationResult && medicationResult.success) {
        console.log(`  ✅ Medication deduction successful: ${medicationResult.quantityConsumed} units`);
        console.log(`  💊 New quantity: ${medicationResult.newQuantity}`);

        // Verify in database
        const updatedMedicationItem = await InventoryItem.findById(medicationItem._id);
        if (updatedMedicationItem && updatedMedicationItem.quantity === initialQuantity - 1) {
          console.log(`  ✅ Database verification passed`);
        } else {
          console.log(`  ❌ Database verification failed`);
        }
      } else {
        console.log(`  ❌ Medication deduction failed`);
      }
    }

    // Test 4: Check Inventory Transactions
    console.log('\n📋 Test 4: Inventory Transactions');
    console.log('===================================');

    const InventoryTransaction = require('../models/InventoryTransaction');
    const recentTransactions = await InventoryTransaction.find({
      transactionType: 'medical-use',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    })
    .populate('item', 'name category')
    .sort({ createdAt: -1 })
    .limit(10);

    console.log(`📊 Found ${recentTransactions.length} recent medical-use transactions:`);

    recentTransactions.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${tx.item.name} (${tx.item.category}) - ${tx.quantity} units`);
      console.log(`     Reason: ${tx.reason}`);
      console.log(`     Date: ${tx.createdAt}`);
      console.log('');
    });

    console.log('\n🎉 Comprehensive inventory test completed!');

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error during comprehensive test:', error);
  }
}

comprehensiveInventoryTest();
