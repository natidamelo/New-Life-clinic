const mongoose = require('mongoose');
const inventoryDeductionService = require('../services/inventoryDeductionService');
const InventoryItem = require('../models/InventoryItem');

/**
 * Manual test script to verify glucose inventory deduction
 */

async function manualGlucoseTest() {
  try {
    console.log('🧪 Manual Glucose Inventory Deduction Test');
    console.log('==========================================\n');
    
    // Step 1: Check current glucose inventory
    console.log('📋 Step 1: Current Glucose Inventory');
    const glucoseItem = await InventoryItem.findOne({ 
      _id: '68dbe045d23305b944814bec' // Your specific glucose item ID
    });
    
    if (!glucoseItem) {
      console.log('❌ Glucose item not found with ID: 68dbe045d23305b944814bec');
      return;
    }
    
    console.log(`  📦 Item: ${glucoseItem.name}`);
    console.log(`  📦 Item Code: ${glucoseItem.itemCode}`);
    console.log(`  📦 Current quantity: ${glucoseItem.quantity}`);
    console.log(`  📦 Cost price: $${glucoseItem.costPrice}`);
    console.log(`  📦 Selling price: $${glucoseItem.sellingPrice}`);
    
    const initialQuantity = glucoseItem.quantity;
    
    // Step 2: Test inventory deduction
    console.log('\n📋 Step 2: Testing Inventory Deduction');
    console.log('=====================================');
    
    const mockLabOrder = {
      testName: 'Glucose, Fasting',
      _id: new mongoose.Types.ObjectId()
    };
    
    const testUserId = new mongoose.Types.ObjectId('68946a3f861ea34c0eee6ac3');
    
    console.log(`  🔬 Testing inventory deduction for: ${mockLabOrder.testName}`);
    console.log(`  👤 User ID: ${testUserId}`);
    
    const result = await inventoryDeductionService.deductLabInventory(mockLabOrder, testUserId);
    
    if (result && result.success) {
      console.log(`  ✅ Inventory deduction successful!`);
      console.log(`     Item: ${result.itemName}`);
      console.log(`     Quantity consumed: ${result.quantityConsumed}`);
      console.log(`     New quantity: ${result.newQuantity}`);
      
      // Step 3: Verify the quantity was actually updated
      console.log('\n📋 Step 3: Verification');
      console.log('=======================');
      
      // Re-fetch the item from database to get updated quantity
      const updatedGlucoseItem = await InventoryItem.findById('68dbe045d23305b944814bec');
      const updatedQuantity = updatedGlucoseItem ? updatedGlucoseItem.quantity : glucoseItem.quantity;
      
      console.log(`  📊 Initial quantity: ${initialQuantity}`);
      console.log(`  📊 Expected quantity: ${initialQuantity - 1}`);
      console.log(`  📊 Actual quantity: ${updatedQuantity}`);
      
      if (updatedQuantity === initialQuantity - 1) {
        console.log(`  ✅ VERIFICATION PASSED: Quantity correctly decreased!`);
        console.log(`  🎉 Glucose inventory deduction is working properly!`);
      } else {
        console.log(`  ❌ VERIFICATION FAILED: Quantity not updated correctly`);
        console.log(`  🔍 Check for errors in the inventory deduction service`);
      }
      
    } else {
      console.log(`  ❌ Inventory deduction failed`);
      if (result === null) {
        console.log(`     Reason: No inventory mapping found or insufficient stock`);
        
        // Check the lab test mapping
        console.log('\n📋 Step 3: Checking Lab Test Mapping');
        console.log('===================================');
        
        const labTestInventoryMap = require('../config/labTestInventoryMap');
        const testMappings = [
          'Glucose, Fasting',
          'Glucose (Fasting)',
          'Glucose',
          'FBS',
          'Fasting Blood Sugar'
        ];
        
        testMappings.forEach(testName => {
          const mapping = labTestInventoryMap[testName];
          if (mapping) {
            console.log(`  ✅ ${testName} → ${mapping.itemName} (qty: ${mapping.quantity})`);
          } else {
            console.log(`  ❌ ${testName} → No mapping found`);
          }
        });
        
        // Check if inventory item exists with the mapped name
        console.log('\n📋 Step 4: Checking Inventory Item by Name');
        console.log('=========================================');
        
        const mappedItem = await InventoryItem.findOne({ 
          name: { $regex: /glucose.*fasting/i },
          isActive: true 
        });
        
        if (mappedItem) {
          console.log(`  ✅ Found inventory item by name: ${mappedItem.name}`);
          console.log(`     ID: ${mappedItem._id}`);
          console.log(`     Quantity: ${mappedItem.quantity}`);
        } else {
          console.log(`  ❌ No inventory item found with name containing "glucose" and "fasting"`);
        }
      }
    }
    
    console.log('\n🎉 Manual glucose test completed!');
    
  } catch (error) {
    console.error('❌ Error during manual glucose test:', error);
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
    return manualGlucoseTest();
  })
  .then(() => {
    console.log('✅ Manual test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Manual test script failed:', error);
    process.exit(1);
  });
}

module.exports = { manualGlucoseTest };
