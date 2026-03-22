/**
 * Test Inventory Deduction - Run Now
 * 
 * This script manually triggers the inventory deduction check
 * to see what's happening in real-time
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

async function testInventoryDeduction() {
  try {
    console.log('\n🔍 [TEST] Testing inventory deduction system NOW...\n');
    
    // Import models
    const NurseTask = require('./models/NurseTask');
    const InventoryItem = require('./models/InventoryItem');
    const InventoryTransaction = require('./models/InventoryTransaction');
    
    // 1. Check current inventory
    console.log('📦 Step 1: Current inventory levels:');
    const inventory = await InventoryItem.find({ category: 'medication', isActive: true }).sort({ name: 1 });
    inventory.forEach(item => {
      console.log(`   - ${item.name}: ${item.quantity} units`);
    });
    
    // 2. Find all tasks with administered doses in last 5 minutes
    console.log('\n💉 Step 2: Recent administrations (last 5 minutes):');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      'medicationDetails.doseRecords': {
        $elemMatch: {
          administered: true,
          administeredAt: { $gte: fiveMinutesAgo }
        }
      }
    });
    
    console.log(`📊 Found ${recentTasks.length} recent medication administrations:`);
    
    for (const task of recentTasks) {
      const recentDoses = task.medicationDetails.doseRecords.filter(
        d => d.administered && d.administeredAt >= fiveMinutesAgo
      );
      
      console.log(`\n   🔍 Task: ${task._id}`);
      console.log(`      Medication: ${task.medicationDetails?.medicationName}`);
      console.log(`      Patient: ${task.patientName}`);
      console.log(`      Recent doses: ${recentDoses.length}`);
      
      // Check if transaction exists
      const transaction = await InventoryTransaction.findOne({
        documentReference: task._id,
        transactionType: 'medical-use'
      });
      
      if (transaction) {
        console.log(`      ✅ Transaction exists: ${transaction.reason}`);
        console.log(`      Quantity: ${transaction.quantity}`);
        console.log(`      Created: ${transaction.createdAt}`);
      } else {
        console.log(`      ❌ NO TRANSACTION FOUND - INVENTORY NOT DEDUCTED!`);
        console.log(`      This is the problem - automatic monitor should fix this`);
        
        // Show dose details
        recentDoses.forEach((dose, index) => {
          console.log(`         Dose ${index + 1}:`);
          console.log(`            Day: ${dose.day}, Time: ${dose.timeSlot}`);
          console.log(`            Administered: ${dose.administeredAt}`);
          console.log(`            By: ${dose.administeredBy}`);
          console.log(`            inventoryDeducted flag: ${dose.inventoryDeducted || false}`);
          console.log(`            processed flag: ${dose.processed || false}`);
        });
      }
    }
    
    // 3. Check ALL tasks with administered doses (not just recent)
    console.log('\n\n💉 Step 3: ALL tasks with administered doses:');
    const allAdministeredTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      'medicationDetails.doseRecords': {
        $elemMatch: { administered: true }
      }
    });
    
    console.log(`📊 Found ${allAdministeredTasks.length} total administered medication tasks:`);
    
    let withTransaction = 0;
    let withoutTransaction = 0;
    
    for (const task of allAdministeredTasks) {
      const transaction = await InventoryTransaction.findOne({
        documentReference: task._id,
        transactionType: 'medical-use'
      });
      
      if (transaction) {
        withTransaction++;
      } else {
        withoutTransaction++;
        console.log(`   ❌ Missing transaction: ${task._id} - ${task.medicationDetails?.medicationName} - ${task.patientName}`);
      }
    }
    
    console.log(`\n   ✅ With transactions: ${withTransaction}`);
    console.log(`   ❌ Without transactions: ${withoutTransaction}`);
    
    // 4. Trigger automatic monitor manually
    if (withoutTransaction > 0) {
      console.log('\n\n🔧 Step 4: Manually triggering automatic fix...');
      const autoMonitor = require('./services/autoInventoryDeductionMonitor');
      await autoMonitor.checkAndFixMissingDeductions();
      console.log('✅ Automatic fix completed');
      
      // Recheck
      console.log('\n📊 Step 5: Rechecking after fix...');
      withTransaction = 0;
      withoutTransaction = 0;
      
      for (const task of allAdministeredTasks) {
        const transaction = await InventoryTransaction.findOne({
          documentReference: task._id,
          transactionType: 'medical-use'
        });
        
        if (transaction) {
          withTransaction++;
        } else {
          withoutTransaction++;
        }
      }
      
      console.log(`   ✅ With transactions: ${withTransaction}`);
      console.log(`   ❌ Without transactions: ${withoutTransaction}`);
      
      if (withoutTransaction === 0) {
        console.log('\n🎉 All issues fixed!');
      } else {
        console.log('\n⚠️ Some issues still remain');
      }
    } else {
      console.log('\n✅ No missing transactions - system working perfectly!');
    }
    
    // 5. Check final inventory
    console.log('\n📦 Step 6: Final inventory levels:');
    const finalInventory = await InventoryItem.find({ category: 'medication', isActive: true }).sort({ name: 1 });
    finalInventory.forEach(item => {
      const original = inventory.find(i => i._id.toString() === item._id.toString());
      const change = original ? original.quantity - item.quantity : 0;
      console.log(`   - ${item.name}: ${item.quantity} units ${change > 0 ? `(deducted ${change})` : ''}`);
    });
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  connectDB().then(() => {
    testInventoryDeduction();
  });
}

module.exports = { testInventoryDeduction };
