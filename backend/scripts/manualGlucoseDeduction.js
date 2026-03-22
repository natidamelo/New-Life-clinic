const mongoose = require('mongoose');
const inventoryDeductionService = require('../services/inventoryDeductionService');

async function manualGlucoseDeduction() {
  try {
    console.log('🔬 Manual Glucose Inventory Deduction');
    console.log('=====================================\n');

    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms');

    // Find the glucose lab order that's currently in the system
    const LabOrder = require('../models/LabOrder');

    const glucoseOrder = await LabOrder.findOne({
      testName: { $regex: /glucose/i },
      status: 'Results Available'
    }).sort({ updatedAt: -1 });

    if (glucoseOrder) {
      console.log(`📋 Found glucose order:`);
      console.log(`   Test Name: ${glucoseOrder.testName}`);
      console.log(`   Status: ${glucoseOrder.status}`);
      console.log(`   Patient ID: ${glucoseOrder.patientId}`);
      console.log(`   Order ID: ${glucoseOrder._id}`);
      console.log(`   Updated At: ${glucoseOrder.updatedAt}`);

      // Manually trigger inventory deduction
      console.log('\n🔬 Manually triggering inventory deduction...');

      const result = await inventoryDeductionService.deductLabInventory(glucoseOrder, glucoseOrder.createdBy || glucoseOrder.orderingDoctorId);

      if (result && result.success) {
        console.log(`✅ Inventory deduction successful!`);
        console.log(`   Item: ${result.itemName}`);
        console.log(`   Quantity consumed: ${result.quantityConsumed}`);
        console.log(`   New quantity: ${result.newQuantity}`);
      } else {
        console.log(`❌ Inventory deduction failed`);
        if (result === null) {
          console.log(`   Reason: No inventory mapping found or insufficient stock`);
        } else {
          console.log(`   Error: ${result.message || 'Unknown error'}`);
        }
      }
    } else {
      console.log('❌ No glucose orders found with Results Available status');

      // Check for any glucose orders
      const allGlucoseOrders = await LabOrder.find({
        testName: { $regex: /glucose/i }
      });

      console.log(`📋 Found ${allGlucoseOrders.length} glucose orders total:`);
      allGlucoseOrders.forEach(order => {
        console.log(`   ${order.testName} - Status: ${order.status} - Updated: ${order.updatedAt}`);
      });
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

manualGlucoseDeduction();
