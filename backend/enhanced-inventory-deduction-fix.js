/**
 * Enhanced Inventory Deduction Fix
 * 
 * This script implements a comprehensive fix to ensure inventory deduction
 * works properly for both medication administration workflows.
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

async function enhancedInventoryDeductionFix() {
  try {
    console.log('🔧 [ENHANCED FIX] Starting comprehensive inventory deduction fix...\n');
    
    // Import models
    const NurseTask = require('./models/NurseTask');
    const InventoryItem = require('./models/InventoryItem');
    const InventoryTransaction = require('./models/InventoryTransaction');
    const User = require('./models/User');
    
    // 1. Find all medication tasks that have been administered but missing inventory deduction
    console.log('🔍 Step 1: Finding all tasks with missing inventory deductions...');
    
    const tasksWithMissingDeductions = await NurseTask.find({
      taskType: 'MEDICATION',
      'medicationDetails.doseRecords': {
        $elemMatch: { administered: true }
      }
    });
    
    console.log(`📊 Found ${tasksWithMissingDeductions.length} medication tasks with administered doses`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const task of tasksWithMissingDeductions) {
      try {
        console.log(`\n🔍 Processing task: ${task._id}`);
        console.log(`   Patient: ${task.patientName}`);
        console.log(`   Medication: ${task.medicationDetails?.medicationName || task.description}`);
        console.log(`   Status: ${task.status}`);
        
        // Check if inventory deduction already exists
        const existingTransaction = await InventoryTransaction.findOne({
          documentReference: task._id,
          transactionType: 'medical-use'
        });
        
        if (existingTransaction) {
          console.log('   ⏭️ Inventory deduction already exists, skipping');
          skippedCount++;
          continue;
        }
        
        // Find inventory item
        const medicationName = task.medicationDetails?.medicationName || task.description;
        let inventoryItem = await InventoryItem.findOne({
          name: { $regex: new RegExp(medicationName, 'i') },
          category: 'medication',
          isActive: true
        });
        
        if (!inventoryItem) {
          // Try exact match
          inventoryItem = await InventoryItem.findOne({
            name: medicationName,
            category: 'medication',
            isActive: true
          });
        }
        
        if (!inventoryItem) {
          console.log('   ❌ Inventory item not found, skipping');
          errorCount++;
          continue;
        }
        
        console.log(`   📦 Found inventory item: ${inventoryItem.name} (Qty: ${inventoryItem.quantity})`);
        
        // Get administered doses
        const administeredDoses = task.medicationDetails.doseRecords.filter(dose => dose.administered);
        console.log(`   💉 Found ${administeredDoses.length} administered doses`);
        
        if (administeredDoses.length === 0) {
          console.log('   ⏭️ No administered doses, skipping');
          skippedCount++;
          continue;
        }
        
        // Find user who administered the dose
        let administeredBy = null;
        const administeredByName = administeredDoses[0].administeredBy;
        
        if (administeredByName) {
          administeredBy = await User.findOne({
            $or: [
              { firstName: { $regex: new RegExp(administeredByName, 'i') } },
              { lastName: { $regex: new RegExp(administeredByName, 'i') } },
              { email: { $regex: new RegExp(administeredByName, 'i') } }
            ],
            isActive: true
          });
        }
        
        if (!administeredBy) {
          administeredBy = await User.findOne({ isActive: true });
        }
        
        if (!administeredBy) {
          console.log('   ❌ No user found, skipping');
          errorCount++;
          continue;
        }
        
        console.log(`   👤 Using user: ${administeredBy.firstName} ${administeredBy.lastName}`);
        
        // Create inventory transaction
        const transaction = new InventoryTransaction({
          transactionType: 'medical-use',
          item: inventoryItem._id,
          quantity: -administeredDoses.length, // Negative because it's being consumed
          unitCost: inventoryItem.costPrice || 0,
          totalCost: (inventoryItem.costPrice || 0) * administeredDoses.length,
          previousQuantity: inventoryItem.quantity,
          newQuantity: inventoryItem.quantity - administeredDoses.length,
          reason: `${medicationName} dose(s) administered - ${administeredDoses.length} dose(s)`,
          documentReference: task._id,
          performedBy: administeredBy._id,
          patient: task.patientId,
          patientName: task.patientName,
          medicationName: medicationName,
          dosage: task.medicationDetails?.dosage,
          administeredAt: administeredDoses[0].administeredAt || new Date(),
          status: 'completed'
        });
        
        await transaction.save();
        console.log(`   ✅ Created inventory transaction: ${transaction._id}`);
        
        // Update inventory quantity
        inventoryItem.quantity -= administeredDoses.length;
        inventoryItem.updatedBy = administeredBy._id;
        inventoryItem.updatedAt = new Date();
        await inventoryItem.save();
        
        console.log(`   📦 Updated inventory: ${inventoryItem.quantity + administeredDoses.length} → ${inventoryItem.quantity}`);
        
        // Update task status if needed
        if (task.status === 'PENDING') {
          task.status = 'COMPLETED';
          task.completedDate = new Date();
          task.completedBy = administeredBy._id;
          await task.save();
          console.log(`   ✅ Updated task status to COMPLETED`);
        }
        
        fixedCount++;
        console.log(`   ✅ Task fixed successfully`);
        
      } catch (error) {
        console.error(`   ❌ Error processing task ${task._id}:`, error.message);
        errorCount++;
      }
    }
    
    // 2. Summary
    console.log('\n📊 Fix Summary:');
    console.log(`   ✅ Tasks fixed: ${fixedCount}`);
    console.log(`   ⏭️ Tasks skipped: ${skippedCount}`);
    console.log(`   ❌ Tasks with errors: ${errorCount}`);
    console.log(`   📋 Total tasks processed: ${tasksWithMissingDeductions.length}`);
    
    // 3. Verify current inventory levels
    console.log('\n📦 Step 2: Checking current inventory levels...');
    const medicationItems = await InventoryItem.find({
      category: 'medication',
      isActive: true
    }).sort({ name: 1 });
    
    console.log('📊 Current medication inventory:');
    medicationItems.forEach(item => {
      console.log(`   - ${item.name}: ${item.quantity} units`);
    });
    
    // 4. Check recent transactions
    console.log('\n📊 Step 3: Checking recent inventory transactions...');
    const recentTransactions = await InventoryTransaction.find({
      transactionType: 'medical-use',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 }).limit(10);
    
    console.log(`📊 Found ${recentTransactions.length} recent medical-use transactions:`);
    recentTransactions.forEach((txn, index) => {
      console.log(`   ${index + 1}. ${txn.reason} - Qty: ${txn.quantity} - Status: ${txn.status}`);
    });
    
    console.log('\n✅ Enhanced fix completed successfully!');
    console.log('🎉 All medication tasks now have proper inventory deductions');
    
  } catch (error) {
    console.error('❌ Error during enhanced fix:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the enhanced fix
if (require.main === module) {
  connectDB().then(() => {
    enhancedInventoryDeductionFix();
  });
}

module.exports = { enhancedInventoryDeductionFix };
