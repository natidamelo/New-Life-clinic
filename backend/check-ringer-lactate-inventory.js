/**
 * Check Ringer Lactate Inventory Deduction
 * 
 * This script will check if Ringer Lactate has any issues with inventory deduction
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

async function checkRingerLactateInventory() {
  try {
    console.log('🔍 [RINGER CHECK] Checking Ringer Lactate inventory and deduction...\n');
    
    // Import models
    const NurseTask = require('./models/NurseTask');
    const InventoryItem = require('./models/InventoryItem');
    const InventoryTransaction = require('./models/InventoryTransaction');
    const Prescription = require('./models/Prescription');
    
    // 1. Check Ringer Lactate inventory item
    console.log('📦 Step 1: Checking Ringer Lactate inventory item...');
    const ringerItem = await InventoryItem.findOne({
      name: { $regex: /ringer/i },
      isActive: true
    });
    
    if (!ringerItem) {
      console.log('❌ Ringer Lactate not found in inventory');
      return;
    }
    
    console.log('✅ Ringer Lactate found:');
    console.log(`   - Name: ${ringerItem.name}`);
    console.log(`   - Category: ${ringerItem.category}`);
    console.log(`   - Current Quantity: ${ringerItem.quantity}`);
    console.log(`   - Cost Price: ${ringerItem.costPrice}`);
    console.log(`   - Selling Price: ${ringerItem.sellingPrice}`);
    console.log(`   - Is Active: ${ringerItem.isActive}`);
    
    // 2. Check for Ringer Lactate medication tasks
    console.log('\n📋 Step 2: Checking Ringer Lactate medication tasks...');
    const ringerTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      'medicationDetails.medicationName': { $regex: /ringer/i }
    }).sort({ createdAt: -1 });
    
    console.log(`📊 Found ${ringerTasks.length} Ringer Lactate tasks:`);
    ringerTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. Status: ${task.status}, Patient: ${task.patientName}, Created: ${task.createdAt}`);
    });
    
    // 3. Check for administered Ringer Lactate doses
    console.log('\n💉 Step 3: Checking for administered Ringer Lactate doses...');
    const ringerTasksWithAdministeredDoses = await NurseTask.find({
      taskType: 'MEDICATION',
      'medicationDetails.medicationName': { $regex: /ringer/i },
      'medicationDetails.doseRecords': {
        $elemMatch: { administered: true }
      }
    });
    
    console.log(`📊 Found ${ringerTasksWithAdministeredDoses.length} tasks with administered doses:`);
    ringerTasksWithAdministeredDoses.forEach((task, index) => {
      const administeredDoses = task.medicationDetails.doseRecords.filter(dose => dose.administered);
      console.log(`   ${index + 1}. Task ID: ${task._id}`);
      console.log(`      - Patient: ${task.patientName}`);
      console.log(`      - Administered doses: ${administeredDoses.length}`);
      console.log(`      - Status: ${task.status}`);
    });
    
    // 4. Check for Ringer Lactate inventory transactions
    console.log('\n📊 Step 4: Checking Ringer Lactate inventory transactions...');
    const ringerTransactions = await InventoryTransaction.find({
      item: ringerItem._id,
      transactionType: 'medical-use'
    }).sort({ createdAt: -1 });
    
    console.log(`📊 Found ${ringerTransactions.length} medical-use transactions:`);
    ringerTransactions.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.reason}`);
      console.log(`      - Quantity: ${txn.quantity}`);
      console.log(`      - Status: ${txn.status}`);
      console.log(`      - Date: ${txn.createdAt}`);
      console.log(`      - Task Reference: ${txn.documentReference}`);
    });
    
    // 5. Check for missing inventory deductions
    console.log('\n🔍 Step 5: Checking for tasks with missing inventory deductions...');
    let missingCount = 0;
    const missingTasks = [];
    
    for (const task of ringerTasksWithAdministeredDoses) {
      const existingTransaction = await InventoryTransaction.findOne({
        documentReference: task._id,
        transactionType: 'medical-use'
      });
      
      if (!existingTransaction) {
        missingCount++;
        missingTasks.push(task);
        console.log(`❌ Missing inventory deduction for task: ${task._id}`);
        console.log(`   - Patient: ${task.patientName}`);
        console.log(`   - Administered doses: ${task.medicationDetails.doseRecords.filter(d => d.administered).length}`);
      }
    }
    
    if (missingCount === 0) {
      console.log('✅ All administered Ringer Lactate tasks have proper inventory deductions');
    } else {
      console.log(`❌ Found ${missingCount} tasks with missing inventory deductions`);
    }
    
    // 6. Check recent Ringer Lactate prescriptions
    console.log('\n📋 Step 6: Checking recent Ringer Lactate prescriptions...');
    const ringerPrescriptions = await Prescription.find({
      medicationName: { $regex: /ringer/i },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });
    
    console.log(`📊 Found ${ringerPrescriptions.length} recent Ringer Lactate prescriptions:`);
    ringerPrescriptions.forEach((prescription, index) => {
      console.log(`   ${index + 1}. ${prescription.medicationName}`);
      console.log(`      - Patient: ${prescription.patientName || 'undefined'}`);
      console.log(`      - Status: ${prescription.status}`);
      console.log(`      - Payment Status: ${prescription.paymentStatus}`);
      console.log(`      - Created: ${prescription.createdAt}`);
    });
    
    // 7. Summary
    console.log('\n📊 Step 7: Summary...');
    console.log(`   - Ringer Lactate inventory: ${ringerItem.quantity} units`);
    console.log(`   - Total tasks: ${ringerTasks.length}`);
    console.log(`   - Tasks with administered doses: ${ringerTasksWithAdministeredDoses.length}`);
    console.log(`   - Inventory transactions: ${ringerTransactions.length}`);
    console.log(`   - Missing deductions: ${missingCount}`);
    console.log(`   - Recent prescriptions: ${ringerPrescriptions.length}`);
    
    if (missingCount > 0) {
      console.log('\n⚠️ ISSUE DETECTED: Ringer Lactate has missing inventory deductions');
      console.log('💡 The automatic monitor will fix these within 30 seconds');
      console.log('   Or run: node enhanced-inventory-deduction-fix.js');
    } else {
      console.log('\n✅ Ringer Lactate inventory deduction is working properly');
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
    checkRingerLactateInventory();
  });
}

module.exports = { checkRingerLactateInventory };
