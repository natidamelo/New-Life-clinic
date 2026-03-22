/**
 * Check Recent Medication Orders and Inventory Deduction
 * 
 * This script will check recent medication orders and see if inventory
 * deduction is working properly for new orders.
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

async function checkRecentMedicationOrders() {
  try {
    console.log('🔍 [INVESTIGATION] Checking recent medication orders and inventory deduction...\n');
    
    // Import models
    const NurseTask = require('./models/NurseTask');
    const InventoryItem = require('./models/InventoryItem');
    const InventoryTransaction = require('./models/InventoryTransaction');
    const Prescription = require('./models/Prescription');
    
    // 1. Check recent medication tasks (last 24 hours)
    console.log('📋 Step 1: Checking recent medication tasks...');
    const recentTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });
    
    console.log(`📊 Found ${recentTasks.length} recent medication tasks:`);
    recentTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.medicationDetails?.medicationName || task.description}`);
      console.log(`      - Patient: ${task.patientName}`);
      console.log(`      - Status: ${task.status}`);
      console.log(`      - Created: ${task.createdAt}`);
      console.log(`      - Payment Status: ${task.paymentStatus}`);
      console.log('');
    });
    
    // 2. Check for administered doses in recent tasks
    console.log('💉 Step 2: Checking for administered doses...');
    const tasksWithAdministeredDoses = await NurseTask.find({
      taskType: 'MEDICATION',
      'medicationDetails.doseRecords': {
        $elemMatch: { administered: true }
      },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    console.log(`📊 Found ${tasksWithAdministeredDoses.length} tasks with administered doses:`);
    tasksWithAdministeredDoses.forEach((task, index) => {
      const administeredDoses = task.medicationDetails.doseRecords.filter(dose => dose.administered);
      console.log(`   ${index + 1}. ${task.medicationDetails?.medicationName || task.description}`);
      console.log(`      - Administered doses: ${administeredDoses.length}`);
      console.log(`      - Task ID: ${task._id}`);
      console.log(`      - Patient: ${task.patientName}`);
      console.log('');
    });
    
    // 3. Check inventory transactions for recent activity
    console.log('📊 Step 3: Checking recent inventory transactions...');
    const recentTransactions = await InventoryTransaction.find({
      transactionType: 'medical-use',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });
    
    console.log(`📊 Found ${recentTransactions.length} recent medical-use transactions:`);
    recentTransactions.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.reason}`);
      console.log(`      - Quantity: ${txn.quantity}`);
      console.log(`      - Status: ${txn.status}`);
      console.log(`      - Date: ${txn.createdAt}`);
      console.log(`      - Task Reference: ${txn.documentReference}`);
      console.log('');
    });
    
    // 4. Check current inventory levels
    console.log('📦 Step 4: Checking current inventory levels...');
    const medicationItems = await InventoryItem.find({
      category: 'medication',
      isActive: true
    }).sort({ name: 1 });
    
    console.log('📊 Current medication inventory:');
    medicationItems.forEach(item => {
      console.log(`   - ${item.name}: ${item.quantity} units`);
    });
    
    // 5. Check for tasks with missing inventory deductions
    console.log('\n🔍 Step 5: Checking for tasks with missing inventory deductions...');
    let missingDeductions = 0;
    
    for (const task of tasksWithAdministeredDoses) {
      const existingTransaction = await InventoryTransaction.findOne({
        documentReference: task._id,
        transactionType: 'medical-use'
      });
      
      if (!existingTransaction) {
        console.log(`❌ Missing inventory deduction for task: ${task._id}`);
        console.log(`   - Medication: ${task.medicationDetails?.medicationName || task.description}`);
        console.log(`   - Patient: ${task.patientName}`);
        console.log(`   - Administered doses: ${task.medicationDetails.doseRecords.filter(d => d.administered).length}`);
        missingDeductions++;
      }
    }
    
    if (missingDeductions === 0) {
      console.log('✅ All administered tasks have proper inventory deductions');
    } else {
      console.log(`❌ Found ${missingDeductions} tasks with missing inventory deductions`);
    }
    
    // 6. Check recent prescriptions
    console.log('\n📋 Step 6: Checking recent prescriptions...');
    const recentPrescriptions = await Prescription.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });
    
    console.log(`📊 Found ${recentPrescriptions.length} recent prescriptions:`);
    recentPrescriptions.forEach((prescription, index) => {
      console.log(`   ${index + 1}. ${prescription.medicationName}`);
      console.log(`      - Patient: ${prescription.patientName}`);
      console.log(`      - Status: ${prescription.status}`);
      console.log(`      - Created: ${prescription.createdAt}`);
      console.log(`      - Payment Status: ${prescription.paymentStatus}`);
      console.log('');
    });
    
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
    checkRecentMedicationOrders();
  });
}

module.exports = { checkRecentMedicationOrders };
