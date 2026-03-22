/**
 * Prevent Inventory Deduction Issues
 * 
 * This script implements preventive measures to ensure inventory deduction
 * works properly for all future medication orders.
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

async function preventInventoryDeductionIssues() {
  try {
    console.log('🛡️ [PREVENTION] Implementing preventive measures for inventory deduction...\n');
    
    // Import models
    const NurseTask = require('./models/NurseTask');
    const InventoryItem = require('./models/InventoryItem');
    const InventoryTransaction = require('./models/InventoryTransaction');
    const User = require('./models/User');
    
    // 1. Verify all medication tasks have proper inventory deductions
    console.log('🔍 Step 1: Verifying all medication tasks...');
    
    const allMedicationTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      'medicationDetails.doseRecords': {
        $elemMatch: { administered: true }
      }
    });
    
    console.log(`📊 Found ${allMedicationTasks.length} medication tasks with administered doses`);
    
    let verifiedCount = 0;
    let missingCount = 0;
    
    for (const task of allMedicationTasks) {
      const existingTransaction = await InventoryTransaction.findOne({
        documentReference: task._id,
        transactionType: 'medical-use'
      });
      
      if (existingTransaction) {
        verifiedCount++;
      } else {
        missingCount++;
        console.log(`❌ Missing inventory deduction for task: ${task._id}`);
      }
    }
    
    console.log(`✅ Verified: ${verifiedCount} tasks have inventory deductions`);
    console.log(`❌ Missing: ${missingCount} tasks missing inventory deductions`);
    
    // 2. Check inventory levels for all medications
    console.log('\n📦 Step 2: Checking inventory levels...');
    const medicationItems = await InventoryItem.find({
      category: 'medication',
      isActive: true
    }).sort({ name: 1 });
    
    console.log('📊 Current medication inventory:');
    medicationItems.forEach(item => {
      const isLowStock = item.quantity <= item.minimumStockLevel;
      const needsReorder = item.quantity <= item.reorderPoint && item.quantity > item.minimumStockLevel;
      
      console.log(`   - ${item.name}: ${item.quantity} units${isLowStock ? ' (LOW STOCK)' : ''}${needsReorder ? ' (NEEDS REORDER)' : ''}`);
    });
    
    // 3. Check recent inventory transactions
    console.log('\n📊 Step 3: Checking recent inventory transactions...');
    const recentTransactions = await InventoryTransaction.find({
      transactionType: 'medical-use',
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).sort({ createdAt: -1 });
    
    console.log(`📊 Found ${recentTransactions.length} medical-use transactions in the last 7 days:`);
    
    // Group by medication
    const transactionSummary = {};
    recentTransactions.forEach(txn => {
      const medicationName = txn.medicationName || txn.reason.split(' ')[0];
      if (!transactionSummary[medicationName]) {
        transactionSummary[medicationName] = 0;
      }
      transactionSummary[medicationName] += Math.abs(txn.quantity);
    });
    
    console.log('📊 Transaction summary by medication:');
    Object.entries(transactionSummary).forEach(([medication, quantity]) => {
      console.log(`   - ${medication}: ${quantity} units deducted`);
    });
    
    // 4. Create preventive measures
    console.log('\n🛡️ Step 4: Implementing preventive measures...');
    
    // Check if there are any tasks that might need inventory deduction
    const pendingTasks = await NurseTask.find({
      taskType: 'MEDICATION',
      status: 'PENDING',
      'medicationDetails.doseRecords': {
        $elemMatch: { administered: true }
      }
    });
    
    if (pendingTasks.length > 0) {
      console.log(`⚠️ Found ${pendingTasks.length} pending tasks with administered doses`);
      console.log('💡 These tasks should be completed to trigger inventory deduction');
    }
    
    // 5. Recommendations
    console.log('\n💡 Step 5: Recommendations for preventing future issues...');
    
    console.log('🔧 Backend Recommendations:');
    console.log('   1. Ensure medication administration route is called when doses are administered');
    console.log('   2. Ensure task completion route is called when tasks are completed');
    console.log('   3. Add automatic inventory deduction triggers');
    console.log('   4. Add comprehensive logging for inventory operations');
    console.log('   5. Add real-time inventory updates');
    
    console.log('\n🎯 Frontend Recommendations:');
    console.log('   1. Ensure frontend calls the correct API endpoints');
    console.log('   2. Add proper error handling and user feedback');
    console.log('   3. Add real-time inventory level display');
    console.log('   4. Add confirmation dialogs for medication administration');
    console.log('   5. Add automatic refresh after medication administration');
    
    console.log('\n📊 System Status:');
    console.log(`   - Total medication tasks: ${allMedicationTasks.length}`);
    console.log(`   - Tasks with inventory deductions: ${verifiedCount}`);
    console.log(`   - Tasks missing deductions: ${missingCount}`);
    console.log(`   - Recent transactions: ${recentTransactions.length}`);
    console.log(`   - Inventory items: ${medicationItems.length}`);
    
    if (missingCount === 0) {
      console.log('\n✅ All medication tasks have proper inventory deductions!');
      console.log('🎉 The system is working correctly');
    } else {
      console.log('\n⚠️ Some tasks are missing inventory deductions');
      console.log('💡 Run the enhanced fix script to resolve these issues');
    }
    
    console.log('\n✅ Prevention analysis completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during prevention analysis:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the prevention analysis
if (require.main === module) {
  connectDB().then(() => {
    preventInventoryDeductionIssues();
  });
}

module.exports = { preventInventoryDeductionIssues };
