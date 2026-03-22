const mongoose = require('mongoose');
const inventoryDeductionService = require('../services/inventoryDeductionService');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');

/**
 * Debug script to check glucose inventory deduction step by step
 */

async function debugGlucoseDeduction() {
  try {
    console.log('🔍 DEBUG: Glucose Inventory Deduction');
    console.log('=====================================\n');

    // Step 1: Check if we can connect to the database
    console.log('📋 Step 1: Database Connection Check');
    console.log('=====================================');

    try {
      const testConnection = await mongoose.connection.db.admin().ping();
      console.log('✅ Database connection successful');
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      return;
    }

    // Step 2: Check current glucose inventory
    console.log('\n📋 Step 2: Current Glucose Inventory');
    console.log('=====================================');

    const glucoseItem = await InventoryItem.findOne({
      _id: '68dbe045d23305b944814bec' // Your specific glucose item ID
    });

    if (!glucoseItem) {
      console.log('❌ Glucose item not found with ID: 68dbe045d23305b944814bec');
      console.log('Available glucose items:');
      const allGlucose = await InventoryItem.find({ name: { $regex: /glucose/i } });
      allGlucose.forEach(item => {
        console.log(`  - ${item.name} (ID: ${item._id}, Qty: ${item.quantity})`);
      });
      return;
    }

    console.log(`✅ Found glucose item:`);
    console.log(`  📦 Name: ${glucoseItem.name}`);
    console.log(`  📦 Item Code: ${glucoseItem.itemCode}`);
    console.log(`  📦 Current quantity: ${glucoseItem.quantity}`);
    console.log(`  📦 Cost price: $${glucoseItem.costPrice}`);

    const initialQuantity = glucoseItem.quantity;

    // Step 3: Check lab test mapping
    console.log('\n📋 Step 3: Lab Test Mapping Check');
    console.log('=====================================');

    const labTestInventoryMap = require('../config/labTestInventoryMap');
    const testName = 'Glucose, Fasting';

    const testMapping = labTestInventoryMap[testName];
    if (testMapping) {
      console.log(`✅ Mapping found for "${testName}":`);
      console.log(`  📦 Item name: ${testMapping.itemName}`);
      console.log(`  📦 Quantity: ${testMapping.quantity}`);
    } else {
      console.log(`❌ No mapping found for "${testName}"`);
      console.log('Available mappings for glucose:');
      Object.keys(labTestInventoryMap).forEach(key => {
        if (key.toLowerCase().includes('glucose')) {
          console.log(`  - "${key}" → ${labTestInventoryMap[key].itemName}`);
        }
      });
      return;
    }

    // Step 4: Find inventory item by mapped name
    console.log('\n📋 Step 4: Inventory Item Lookup');
    console.log('=====================================');

    const mappedInventoryItem = await InventoryItem.findOne({
      name: { $regex: new RegExp(testMapping.itemName, 'i') },
      isActive: true
    });

    if (!mappedInventoryItem) {
      console.log(`❌ No inventory item found for: ${testMapping.itemName}`);
      console.log('Available inventory items:');
      const allItems = await InventoryItem.find({ isActive: true }).limit(10);
      allItems.forEach(item => {
        console.log(`  - ${item.name} (ID: ${item._id})`);
      });
      return;
    }

    console.log(`✅ Found inventory item:`);
    console.log(`  📦 Name: ${mappedInventoryItem.name}`);
    console.log(`  📦 ID: ${mappedInventoryItem._id}`);
    console.log(`  📦 Current quantity: ${mappedInventoryItem.quantity}`);

    if (mappedInventoryItem._id.toString() !== glucoseItem._id.toString()) {
      console.log(`⚠️ WARNING: Mapped item ID (${mappedInventoryItem._id}) doesn't match glucose item ID (${glucoseItem._id})`);
    }

    // Step 5: Test inventory deduction
    console.log('\n📋 Step 5: Inventory Deduction Test');
    console.log('=====================================');

    const mockLabOrder = {
      testName: testName,
      _id: new mongoose.Types.ObjectId()
    };

    const testUserId = new mongoose.Types.ObjectId('68946a3f861ea34c0eee6ac3');

    console.log(`🔬 Testing deduction for: ${mockLabOrder.testName}`);
    console.log(`👤 User ID: ${testUserId}`);

    const result = await inventoryDeductionService.deductLabInventory(mockLabOrder, testUserId);

    if (result && result.success) {
      console.log(`✅ Inventory deduction successful!`);
      console.log(`   Item: ${result.itemName}`);
      console.log(`   Quantity consumed: ${result.quantityConsumed}`);
      console.log(`   New quantity: ${result.newQuantity}`);

      // Step 6: Verify database changes
      console.log('\n📋 Step 6: Database Verification');
      console.log('=====================================');

      // Re-fetch the item to check if quantity changed
      const updatedItem = await InventoryItem.findById(mappedInventoryItem._id);
      const updatedQuantity = updatedItem ? updatedItem.quantity : mappedInventoryItem.quantity;

      console.log(`📊 Initial quantity: ${initialQuantity}`);
      console.log(`📊 Expected quantity: ${initialQuantity - 1}`);
      console.log(`📊 Actual quantity: ${updatedQuantity}`);

      if (updatedQuantity === initialQuantity - 1) {
        console.log(`✅ VERIFICATION PASSED: Quantity correctly decreased!`);
      } else {
        console.log(`❌ VERIFICATION FAILED: Quantity not updated`);
        console.log(`🔍 Checking if transaction was created...`);

        // Check if transaction was created
        const recentTransactions = await InventoryTransaction.find({
          item: mappedInventoryItem._id,
          transactionType: 'medical-use',
          createdAt: { $gte: new Date(Date.now() - 60000) } // Last minute
        }).sort({ createdAt: -1 });

        if (recentTransactions.length > 0) {
          console.log(`✅ Transaction was created:`);
          recentTransactions.forEach((tx, index) => {
            console.log(`  ${index + 1}. Quantity: ${tx.quantity}, Reason: ${tx.reason}, Date: ${tx.createdAt}`);
          });
        } else {
          console.log(`❌ No recent transactions found for this item`);
        }
      }

      // Step 7: Check transaction records
      console.log('\n📋 Step 7: Transaction History');
      console.log('=====================================');

      const allTransactions = await InventoryTransaction.find({
        item: mappedInventoryItem._id,
        transactionType: 'medical-use'
      }).sort({ createdAt: -1 }).limit(5);

      console.log(`📊 Found ${allTransactions.length} recent medical-use transactions:`);
      allTransactions.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.quantity} units - ${tx.reason} (${tx.createdAt})`);
      });

    } else {
      console.log(`❌ Inventory deduction failed`);
      if (result === null) {
        console.log(`   Reason: No inventory mapping found or insufficient stock`);
      } else {
        console.log(`   Error: ${result.message || 'Unknown error'}`);
      }
    }

    console.log('\n🎉 Debug script completed!');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  // Connect to MongoDB
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('📡 Connected to MongoDB (clinic-cms)');
    return debugGlucoseDeduction();
  })
  .then(() => {
    console.log('✅ Debug script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug script failed:', error);
    process.exit(1);
  });
}

module.exports = { debugGlucoseDeduction };
