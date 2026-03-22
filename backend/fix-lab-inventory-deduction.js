const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Comprehensive fix for lab inventory deduction issues
 */

async function fixLabInventoryDeduction() {
  try {
    console.log('🔧 Starting lab inventory deduction fix...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Import models after connection
    const InventoryItem = require('./models/InventoryItem');
    const LabOrder = require('./models/LabOrder');
    const InventoryTransaction = require('./models/InventoryTransaction');
    const labTestInventoryMap = require('./config/labTestInventoryMap');

    // Step 1: Check current inventory items
    console.log('\n📦 Step 1: Checking current inventory items...');
    const inventoryItems = await InventoryItem.find({ isActive: true });

    console.log(`Found ${inventoryItems.length} active inventory items:`);
    inventoryItems.forEach(item => {
      console.log(`  - ${item.name} (Qty: ${item.quantity}, ID: ${item._id})`);
    });

    // Step 2: Check lab test inventory mapping
    console.log('\n🔬 Step 2: Checking lab test inventory mapping...');
    console.log('Available lab test mappings:');
    Object.keys(labTestInventoryMap).slice(0, 20).forEach(testName => {
      const mapping = labTestInventoryMap[testName];
      console.log(`  - "${testName}" → ${mapping.itemName} (qty: ${mapping.quantity})`);
    });

    // Step 3: Check for mismatched mappings
    console.log('\n🔍 Step 3: Checking for mismatched lab test mappings...');
    const mismatches = [];

    for (const [testName, mapping] of Object.entries(labTestInventoryMap)) {
      if (testName.includes('Glucose') || testName.includes('glucose')) {
        const existingItem = await InventoryItem.findOne({
          name: { $regex: new RegExp(mapping.itemName, 'i') },
          isActive: true
        });

        if (!existingItem) {
          mismatches.push({ testName, mapping, issue: 'No inventory item found' });
        } else {
          console.log(`✅ "${testName}" → ${mapping.itemName} (Found: ${existingItem.quantity} units)`);
        }
      }
    }

    if (mismatches.length > 0) {
      console.log('❌ Found mismatched mappings:');
      mismatches.forEach(mismatch => {
        console.log(`  - ${mismatch.testName}: ${mismatch.issue}`);
      });
    } else {
      console.log('✅ All glucose test mappings match inventory items');
    }

    // Step 4: Check recent lab orders that should have triggered deductions
    console.log('\n📋 Step 4: Checking recent completed lab orders...');
    const recentCompletedOrders = await LabOrder.find({
      status: { $in: ['Results Available', 'Completed'] },
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ updatedAt: -1 }).limit(10);

    console.log(`Found ${recentCompletedOrders.length} recently completed lab orders:`);
    recentCompletedOrders.forEach(order => {
      console.log(`  - ${order.testName} (${order.status}) at ${order.updatedAt}`);
    });

    // Step 5: Check recent inventory transactions
    console.log('\n💰 Step 5: Checking recent inventory transactions...');
    const recentTransactions = await InventoryTransaction.find({
      transactionType: 'medical-use',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ createdAt: -1 }).limit(10);

    console.log(`Found ${recentTransactions.length} recent medical-use transactions:`);
    recentTransactions.forEach(tx => {
      console.log(`  - ${tx.quantity} units of ${tx.item} - ${tx.reason} at ${tx.createdAt}`);
    });

    // Step 6: Test inventory deduction manually
    console.log('\n🧪 Step 6: Testing inventory deduction manually...');
    try {
      const inventoryDeductionService = require('./services/inventoryDeductionService');

      const testLabOrder = {
        testName: 'Glucose, Fasting',
        _id: new mongoose.Types.ObjectId()
      };

      const testUserId = new mongoose.Types.ObjectId('68946a3f861ea34c0eee6ac3');

      console.log(`Testing deduction for: ${testLabOrder.testName}`);
      const result = await inventoryDeductionService.deductLabInventory(testLabOrder, testUserId);

      if (result && result.success) {
        console.log(`✅ Manual deduction successful:`);
        console.log(`   Item: ${result.itemName}`);
        console.log(`   Quantity consumed: ${result.quantityConsumed}`);
        console.log(`   New quantity: ${result.newQuantity}`);
      } else {
        console.log(`❌ Manual deduction failed or no mapping found`);
      }
    } catch (error) {
      console.error('❌ Error testing inventory deduction:', error.message);
    }

    await mongoose.disconnect();
    console.log('\n✅ Lab inventory deduction check completed');

  } catch (error) {
    console.error('❌ Error in lab inventory deduction fix:', error);
    process.exit(1);
  }
}

fixLabInventoryDeduction();
