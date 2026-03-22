const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');

// Import models
const NurseTask = require('./models/NurseTask');
const InventoryItem = require('./models/InventoryItem');
const InventoryTransaction = require('./models/InventoryTransaction');

async function debugCeftriaxone() {
  try {
    console.log('🔍 Debugging Ceftriaxone Medication Administration Issues...\n');

    // 1. Check if ceftriaxone exists in inventory
    console.log('📦 1. Checking Inventory for Ceftriaxone...');
    const ceftriaxoneInInventory = await InventoryItem.find({
      name: { $regex: /ceftriaxone/i }
    }).select('name quantity category costPrice');
    
    if (ceftriaxoneInInventory.length > 0) {
      console.log('✅ Found in inventory:');
      ceftriaxoneInInventory.forEach(item => {
        console.log(`   - ${item.name}: ${item.quantity} units, Cost: $${item.costPrice}`);
      });
    } else {
      console.log('❌ Ceftriaxone NOT found in inventory');
    }

    // 2. Check nurse tasks for ceftriaxone
    console.log('\n📋 2. Checking Nurse Tasks for Ceftriaxone...');
    const ceftriaxoneTasks = await NurseTask.find({
      $or: [
        { 'medicationDetails.medicationName': { $regex: /ceftriaxone/i } },
        { description: { $regex: /ceftriaxone/i } }
      ]
    }).select('_id patientName description medicationDetails paymentAuthorization taskType createdAt');

    if (ceftriaxoneTasks.length > 0) {
      console.log(`✅ Found ${ceftriaxoneTasks.length} ceftriaxone tasks:`);
      ceftriaxoneTasks.forEach((task, index) => {
        console.log(`\n   Task ${index + 1}:`);
        console.log(`   - ID: ${task._id}`);
        console.log(`   - Patient: ${task.patientName}`);
        console.log(`   - Description: ${task.description}`);
        console.log(`   - Task Type: ${task.taskType}`);
        console.log(`   - Created: ${task.createdAt}`);
        
        if (task.medicationDetails) {
          console.log(`   - Medication Name: ${task.medicationDetails.medicationName || 'Not set'}`);
          console.log(`   - Dosage: ${task.medicationDetails.dosage || 'Not set'}`);
          console.log(`   - Frequency: ${task.medicationDetails.frequency || 'Not set'}`);
          console.log(`   - Start Date: ${task.medicationDetails.startDate || 'Not set'}`);
          console.log(`   - Dose Records: ${task.medicationDetails.doseRecords?.length || 0} records`);
        }
        
        if (task.paymentAuthorization) {
          console.log(`   - Payment Status: ${task.paymentAuthorization.paymentStatus}`);
          console.log(`   - Paid Days: ${task.paymentAuthorization.paidDays || 'Not set'}`);
          console.log(`   - Authorized Doses: ${task.paymentAuthorization.authorizedDoses || 'Not set'}`);
        }
      });
    } else {
      console.log('❌ No ceftriaxone nurse tasks found');
    }

    // 3. Check for any inventory transactions related to ceftriaxone
    console.log('\n💾 3. Checking Inventory Transactions for Ceftriaxone...');
    const ceftriaxoneTransactions = await InventoryTransaction.find({
      $or: [
        { reason: { $regex: /ceftriaxone/i } },
        { 'item.name': { $regex: /ceftriaxone/i } }
      ]
    }).populate('item').select('item reason status quantity transactionType createdAt');

    if (ceftriaxoneTransactions.length > 0) {
      console.log(`✅ Found ${ceftriaxoneTransactions.length} ceftriaxone transactions:`);
      ceftriaxoneTransactions.forEach((txn, index) => {
        console.log(`\n   Transaction ${index + 1}:`);
        console.log(`   - Item: ${txn.item?.name || 'Unknown'}`);
        console.log(`   - Reason: ${txn.reason}`);
        console.log(`   - Status: ${txn.status}`);
        console.log(`   - Quantity: ${txn.quantity}`);
        console.log(`   - Type: ${txn.transactionType}`);
        console.log(`   - Created: ${txn.createdAt}`);
      });
    } else {
      console.log('❌ No ceftriaxone inventory transactions found');
    }

    // 4. Check what medications ARE working (for comparison)
    console.log('\n🔍 4. Checking What Medications ARE Working...');
    const workingMedications = await NurseTask.aggregate([
      {
        $match: {
          'medicationDetails.doseRecords': { $exists: true, $ne: [] }
        }
      },
      {
        $group: {
          _id: '$medicationDetails.medicationName',
          taskCount: { $sum: 1 },
          hasDoseRecords: { $sum: { $cond: [{ $gt: [{ $size: '$medicationDetails.doseRecords' }, 0] }, 1, 0] } }
        }
      },
      { $sort: { taskCount: -1 } }
    ]);

    if (workingMedications.length > 0) {
      console.log('✅ Working medications:');
      workingMedications.slice(0, 10).forEach(med => {
        console.log(`   - ${med._id || 'Unknown'}: ${med.taskCount} tasks, ${med.hasDoseRecords} with dose records`);
      });
    }

    // 5. Check for any error patterns
    console.log('\n🚨 5. Checking for Common Issues...');
    
    // Check if ceftriaxone tasks have missing medicationDetails
    const incompleteTasks = ceftriaxoneTasks.filter(task => 
      !task.medicationDetails || 
      !task.medicationDetails.medicationName ||
      !task.medicationDetails.dosage ||
      !task.medicationDetails.frequency
    );

    if (incompleteTasks.length > 0) {
      console.log(`⚠️  Found ${incompleteTasks.length} ceftriaxone tasks with incomplete medicationDetails`);
      incompleteTasks.forEach((task, index) => {
        console.log(`   Task ${index + 1} (${task._id}):`);
        console.log(`     - Medication Name: ${task.medicationDetails?.medicationName || 'MISSING'}`);
        console.log(`     - Dosage: ${task.medicationDetails?.dosage || 'MISSING'}`);
        console.log(`     - Frequency: ${task.medicationDetails?.frequency || 'MISSING'}`);
      });
    }

    // Check payment authorization issues
    const unpaidTasks = ceftriaxoneTasks.filter(task => 
      task.paymentAuthorization && 
      task.paymentAuthorization.paymentStatus !== 'fully_paid'
    );

    if (unpaidTasks.length > 0) {
      console.log(`💰 Found ${unpaidTasks.length} ceftriaxone tasks with payment issues`);
      unpaidTasks.forEach((task, index) => {
        console.log(`   Task ${index + 1} (${task._id}):`);
        console.log(`     - Payment Status: ${task.paymentAuthorization.paymentStatus}`);
        console.log(`     - Paid Days: ${task.paymentAuthorization.paidDays || 'Not set'}`);
        console.log(`     - Authorized Doses: ${task.paymentAuthorization.authorizedDoses || 'Not set'}`);
      });
    }

    console.log('\n🎯 Summary of Issues Found:');
    console.log('================================');
    
    if (ceftriaxoneInInventory.length === 0) {
      console.log('❌ ISSUE: Ceftriaxone not in inventory');
    }
    
    if (ceftriaxoneTasks.length === 0) {
      console.log('❌ ISSUE: No ceftriaxone nurse tasks found');
    }
    
    if (incompleteTasks.length > 0) {
      console.log('❌ ISSUE: Incomplete medication details in tasks');
    }
    
    if (unpaidTasks.length > 0) {
      console.log('❌ ISSUE: Payment authorization problems');
    }
    
    if (ceftriaxoneInInventory.length > 0 && ceftriaxoneTasks.length > 0 && incompleteTasks.length === 0 && unpaidTasks.length === 0) {
      console.log('✅ No obvious issues found - ceftriaxone should work');
      console.log('🔍 Check browser console for specific error messages during administration');
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the debug function
debugCeftriaxone();
