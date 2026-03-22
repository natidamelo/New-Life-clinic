/**
 * Check IV Fluids Issue
 * 
 * This script will investigate why IV fluids are not deducting inventory
 * while other medications work fine.
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

async function checkIVFluidsIssue() {
  try {
    console.log('🔍 [IV FLUIDS CHECK] Investigating IV fluids inventory deduction issue...\n');
    
    // Import models
    const NurseTask = require('./models/NurseTask');
    const InventoryItem = require('./models/InventoryItem');
    const InventoryTransaction = require('./models/InventoryTransaction');
    
    // 1. Find all IV fluid inventory items
    console.log('📦 Step 1: Finding all IV fluid inventory items...');
    const ivFluids = await InventoryItem.find({
      $or: [
        { name: { $regex: /saline/i } },
        { name: { $regex: /ringer/i } },
        { name: { $regex: /dextrose/i } },
        { name: { $regex: /lactate/i } },
        { name: { $regex: /hartmann/i } }
      ],
      isActive: true
    });
    
    console.log(`📊 Found ${ivFluids.length} IV fluid items:`);
    ivFluids.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.name}`);
      console.log(`      - Category: ${item.category}`);
      console.log(`      - Quantity: ${item.quantity}`);
      console.log(`      - Route: ${item.administrationRoute || 'Not specified'}`);
    });
    
    // 2. Find all IV fluid medication tasks
    console.log('\n📋 Step 2: Finding all IV fluid medication tasks...');
    const ivFluidTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      $or: [
        { 'medicationDetails.medicationName': { $regex: /saline/i } },
        { 'medicationDetails.medicationName': { $regex: /ringer/i } },
        { 'medicationDetails.medicationName': { $regex: /dextrose/i } },
        { 'medicationDetails.medicationName': { $regex: /lactate/i } },
        { 'medicationDetails.medicationName': { $regex: /hartmann/i } }
      ]
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`📊 Found ${ivFluidTasks.length} recent IV fluid tasks:`);
    ivFluidTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.medicationDetails?.medicationName || task.description}`);
      console.log(`      - Patient: ${task.patientName}`);
      console.log(`      - Status: ${task.status}`);
      console.log(`      - Route: ${task.medicationDetails?.route || 'Not specified'}`);
      console.log(`      - Created: ${task.createdAt}`);
    });
    
    // 3. Find administered IV fluid doses
    console.log('\n💉 Step 3: Finding administered IV fluid doses...');
    const administeredIVTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      $or: [
        { 'medicationDetails.medicationName': { $regex: /saline/i } },
        { 'medicationDetails.medicationName': { $regex: /ringer/i } },
        { 'medicationDetails.medicationName': { $regex: /dextrose/i } },
        { 'medicationDetails.medicationName': { $regex: /lactate/i } },
        { 'medicationDetails.medicationName': { $regex: /hartmann/i } }
      ],
      'medicationDetails.doseRecords': {
        $elemMatch: { administered: true }
      }
    });
    
    console.log(`📊 Found ${administeredIVTasks.length} IV fluid tasks with administered doses:`);
    administeredIVTasks.forEach((task, index) => {
      const administeredDoses = task.medicationDetails.doseRecords.filter(dose => dose.administered);
      console.log(`   ${index + 1}. ${task.medicationDetails?.medicationName}`);
      console.log(`      - Task ID: ${task._id}`);
      console.log(`      - Patient: ${task.patientName}`);
      console.log(`      - Administered doses: ${administeredDoses.length}`);
      console.log(`      - Route: ${task.medicationDetails?.route || 'Not specified'}`);
    });
    
    // 4. Check non-IV medications for comparison
    console.log('\n🔬 Step 4: Checking non-IV medications for comparison...');
    const nonIVTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      'medicationDetails.doseRecords': {
        $elemMatch: { administered: true }
      },
      $and: [
        { 'medicationDetails.medicationName': { $not: { $regex: /saline/i } } },
        { 'medicationDetails.medicationName': { $not: { $regex: /ringer/i } } },
        { 'medicationDetails.medicationName': { $not: { $regex: /dextrose/i } } },
        { 'medicationDetails.medicationName': { $not: { $regex: /lactate/i } } },
        { 'medicationDetails.medicationName': { $not: { $regex: /hartmann/i } } }
      ]
    }).limit(5);
    
    console.log(`📊 Found ${nonIVTasks.length} non-IV medication tasks (for comparison):`);
    for (const task of nonIVTasks) {
      const administeredDoses = task.medicationDetails.doseRecords.filter(dose => dose.administered);
      const transaction = await InventoryTransaction.findOne({
        documentReference: task._id,
        transactionType: 'medical-use'
      });
      
      console.log(`   - ${task.medicationDetails?.medicationName}`);
      console.log(`     Route: ${task.medicationDetails?.route || 'Not specified'}`);
      console.log(`     Administered: ${administeredDoses.length} doses`);
      console.log(`     Transaction: ${transaction ? '✅ Exists' : '❌ Missing'}`);
    }
    
    // 5. Check for missing transactions in IV fluids
    console.log('\n🔍 Step 5: Checking for missing inventory transactions in IV fluids...');
    let ivMissingCount = 0;
    const ivMissingTasks = [];
    
    for (const task of administeredIVTasks) {
      const existingTransaction = await InventoryTransaction.findOne({
        documentReference: task._id,
        transactionType: 'medical-use'
      });
      
      if (!existingTransaction) {
        ivMissingCount++;
        ivMissingTasks.push(task);
        console.log(`   ❌ Missing transaction for: ${task.medicationDetails?.medicationName}`);
        console.log(`      Task ID: ${task._id}`);
        console.log(`      Route: ${task.medicationDetails?.route}`);
      }
    }
    
    if (ivMissingCount === 0) {
      console.log('   ✅ All IV fluid tasks have proper inventory transactions');
    } else {
      console.log(`   ❌ Found ${ivMissingCount} IV fluid tasks with missing transactions`);
    }
    
    // 6. Check IV fluid inventory transactions
    console.log('\n📊 Step 6: Checking IV fluid inventory transactions...');
    const ivItemIds = ivFluids.map(item => item._id);
    const ivTransactions = await InventoryTransaction.find({
      item: { $in: ivItemIds },
      transactionType: 'medical-use'
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`📊 Found ${ivTransactions.length} recent IV fluid transactions:`);
    for (const txn of ivTransactions) {
      const item = ivFluids.find(i => i._id.toString() === txn.item.toString());
      console.log(`   - ${item?.name || 'Unknown'}`);
      console.log(`     Quantity: ${txn.quantity}`);
      console.log(`     Date: ${txn.createdAt}`);
      console.log(`     Reason: ${txn.reason}`);
    }
    
    // 7. Analyze the route field
    console.log('\n🔍 Step 7: Analyzing administration routes...');
    const ivRoutes = new Set();
    const nonIVRoutes = new Set();
    
    administeredIVTasks.forEach(task => {
      const route = task.medicationDetails?.route;
      if (route) ivRoutes.add(route);
    });
    
    nonIVTasks.forEach(task => {
      const route = task.medicationDetails?.route;
      if (route) nonIVRoutes.add(route);
    });
    
    console.log('   IV Fluid Routes:', Array.from(ivRoutes));
    console.log('   Non-IV Routes:', Array.from(nonIVRoutes));
    
    // 8. Summary
    console.log('\n📊 Step 8: Summary and Analysis...');
    console.log(`   - IV fluid items in inventory: ${ivFluids.length}`);
    console.log(`   - IV fluid tasks: ${ivFluidTasks.length}`);
    console.log(`   - Administered IV fluid tasks: ${administeredIVTasks.length}`);
    console.log(`   - IV fluid tasks missing transactions: ${ivMissingCount}`);
    console.log(`   - IV fluid transactions: ${ivTransactions.length}`);
    
    if (ivMissingCount > 0) {
      console.log('\n⚠️ ISSUE CONFIRMED: IV fluids have missing inventory deductions');
      console.log('\n🔍 Possible causes:');
      console.log('   1. Frontend might be handling IV fluids differently');
      console.log('   2. Route field might be causing issues (Intravenous vs others)');
      console.log('   3. IV fluid tasks might have different task structure');
      console.log('   4. API endpoint might be filtering IV fluids out');
      console.log('\n💡 The automatic monitor will fix these within 30 seconds');
    } else {
      console.log('\n✅ IV fluids inventory deduction is working properly');
    }
    
    console.log('\n✅ Investigation complete!');
    
  } catch (error) {
    console.error('❌ Error during investigation:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the investigation
if (require.main === module) {
  connectDB().then(() => {
    checkIVFluidsIssue();
  });
}

module.exports = { checkIVFluidsIssue };
