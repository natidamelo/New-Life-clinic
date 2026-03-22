const mongoose = require('mongoose');
const inventoryDeductionService = require('../services/inventoryDeductionService');
const InventoryItem = require('../models/InventoryItem');

/**
 * Test script specifically for glucose inventory deduction
 */

async function testGlucoseInventoryDeduction() {
  try {
    console.log('🧪 Testing Glucose Inventory Deduction...\n');
    
    // Test 1: Check current glucose inventory
    console.log('📋 Test 1: Current Glucose Inventory');
    console.log('=====================================');
    
    const glucoseItem = await InventoryItem.findOne({ 
      name: { $regex: /glucose/i },
      isActive: true 
    });
    
    if (glucoseItem) {
      console.log(`  📦 Found glucose item: ${glucoseItem.name}`);
      console.log(`  📦 Item Code: ${glucoseItem.itemCode}`);
      console.log(`  📦 Current quantity: ${glucoseItem.quantity}`);
      console.log(`  📦 Cost price: $${glucoseItem.costPrice}`);
      console.log(`  📦 Selling price: $${glucoseItem.sellingPrice}`);
      
      const initialQuantity = glucoseItem.quantity;
      
      // Test 2: Simulate glucose test completion
      console.log('\n📋 Test 2: Simulating Glucose Test Completion');
      console.log('=============================================');
      
      const mockLabOrder = {
        testName: 'Glucose, Fasting',
        _id: new mongoose.Types.ObjectId()
      };
      
      const testUserId = new mongoose.Types.ObjectId('68946a3f861ea34c0eee6ac3'); // Use the createdBy ID from your data
      
      console.log(`  🔬 Testing inventory deduction for: ${mockLabOrder.testName}`);
      
      const result = await inventoryDeductionService.deductLabInventory(mockLabOrder, testUserId);
      
      if (result && result.success) {
        console.log(`  ✅ Inventory deduction successful!`);
        console.log(`     Item: ${result.itemName}`);
        console.log(`     Quantity consumed: ${result.quantityConsumed}`);
        console.log(`     New quantity: ${result.newQuantity}`);
        
        // Verify the quantity was actually updated in the database
        await glucoseItem.refresh();
        const updatedQuantity = glucoseItem.quantity;
        
        if (updatedQuantity === initialQuantity - 1) {
          console.log(`  ✅ Quantity verification passed: ${initialQuantity} → ${updatedQuantity}`);
        } else {
          console.log(`  ❌ Quantity verification failed. Expected: ${initialQuantity - 1}, Actual: ${updatedQuantity}`);
        }
      } else {
        console.log(`  ❌ Inventory deduction failed`);
        if (result === null) {
          console.log(`     Reason: No inventory mapping found or insufficient stock`);
        }
      }
      
      // Test 3: Check lab test inventory mapping
      console.log('\n📋 Test 3: Lab Test Inventory Mapping');
      console.log('=====================================');
      
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
      
    } else {
      console.log(`  ❌ No glucose inventory item found`);
      console.log(`  💡 Make sure you have a glucose inventory item in your database`);
    }
    
    console.log('\n🎉 Glucose inventory deduction test completed!');
    
  } catch (error) {
    console.error('❌ Error during glucose inventory deduction test:', error);
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
    return testGlucoseInventoryDeduction();
  })
  .then(() => {
    console.log('✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
}

module.exports = { testGlucoseInventoryDeduction };
