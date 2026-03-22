const mongoose = require('mongoose');
const inventoryDeductionService = require('../services/inventoryDeductionService');
const LabOrder = require('../models/LabOrder');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/clinic', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testInventoryDeduction() {
  try {
    console.log('🧪 Testing inventory deduction...');
    
    // Find a recent lab order
    const recentLabOrder = await LabOrder.findOne({ 
      testName: { $regex: /glucose/i },
      inventoryDeducted: false 
    }).sort({ createdAt: -1 });
    
    if (!recentLabOrder) {
      console.log('❌ No recent lab orders found for testing');
      return;
    }
    
    console.log(`🔬 Found lab order: ${recentLabOrder.testName}`);
    console.log(`   ID: ${recentLabOrder._id}`);
    console.log(`   Inventory deducted: ${recentLabOrder.inventoryDeducted}`);
    
    // Test the inventory deduction
    console.log('\n🧪 Testing inventory deduction...');
    const result = await inventoryDeductionService.deductLabInventory(recentLabOrder, '507f1f77bcf86cd799439011');
    
    console.log('\n📊 Result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Check the lab order after deduction
    const updatedLabOrder = await LabOrder.findById(recentLabOrder._id);
    console.log(`\n🔍 Lab order after deduction:`);
    console.log(`   Inventory deducted: ${updatedLabOrder.inventoryDeducted}`);
    console.log(`   Deducted at: ${updatedLabOrder.inventoryDeductedAt}`);
    console.log(`   Deducted by: ${updatedLabOrder.inventoryDeductedBy}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testInventoryDeduction();