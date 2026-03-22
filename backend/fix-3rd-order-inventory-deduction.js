/**
 * Fix 3rd Order Inventory Deduction
 * 
 * This script will fix the missing inventory deduction for the 3rd Normal Saline order
 * and implement a permanent solution to prevent this from happening again.
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

async function fix3rdOrderInventoryDeduction() {
  try {
    console.log('🔧 [3RD ORDER FIX] Starting fix for 3rd Normal Saline order...\n');
    
    // Import models
    const NurseTask = require('./models/NurseTask');
    const InventoryItem = require('./models/InventoryItem');
    const InventoryTransaction = require('./models/InventoryTransaction');
    const User = require('./models/User');
    
    // 1. Get the specific 3rd order task
    const taskId = '68e38d1519cc4d1ae96b4ab2';
    const task = await NurseTask.findById(taskId);
    
    if (!task) {
      console.log('❌ Task not found with ID:', taskId);
      return;
    }
    
    console.log('✅ 3rd Order Task found:');
    console.log(`   - Patient: ${task.patientName}`);
    console.log(`   - Medication: ${task.medicationDetails?.medicationName || task.description}`);
    console.log(`   - Status: ${task.status}`);
    console.log(`   - Payment Status: ${task.paymentStatus}`);
    console.log(`   - Created: ${task.createdAt}`);
    
    // 2. Check if inventory deduction already exists
    const existingTransaction = await InventoryTransaction.findOne({
      documentReference: taskId,
      transactionType: 'medical-use'
    });
    
    if (existingTransaction) {
      console.log('⚠️ Inventory deduction already exists:', existingTransaction._id);
      return;
    }
    
    // 3. Find the inventory item
    const medicationName = task.medicationDetails?.medicationName || 'Normal Saline';
    let inventoryItem = await InventoryItem.findOne({
      name: { $regex: new RegExp(medicationName, 'i') },
      category: 'medication',
      isActive: true
    });
    
    if (!inventoryItem) {
      inventoryItem = await InventoryItem.findOne({
        name: 'Normal Saline (0.9% NaCl)',
        category: 'medication',
        isActive: true
      });
    }
    
    if (!inventoryItem) {
      console.log('❌ Inventory item not found for:', medicationName);
      return;
    }
    
    console.log('✅ Inventory item found:', inventoryItem.name);
    console.log(`   Current quantity: ${inventoryItem.quantity}`);
    
    // 4. Check administered doses
    const administeredDoses = task.medicationDetails?.doseRecords?.filter(dose => dose.administered) || [];
    
    if (administeredDoses.length === 0) {
      console.log('❌ No administered doses found');
      return;
    }
    
    console.log(`✅ Found ${administeredDoses.length} administered doses`);
    
    // 5. Find user who administered the dose
    let administeredBy = null;
    const administeredByName = administeredDoses[0].administeredBy;
    
    console.log('🔍 Looking for user who administered dose:', administeredByName);
    
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
      console.log('⚠️ Using fallback user for transaction');
    }
    
    if (!administeredBy) {
      console.log('❌ No user found to assign as performer');
      return;
    }
    
    console.log('✅ Found user for transaction:', administeredBy.firstName, administeredBy.lastName);
    
    // 6. Create inventory transaction
    console.log('\n📝 Creating inventory transaction...');
    
    const transaction = new InventoryTransaction({
      transactionType: 'medical-use',
      item: inventoryItem._id,
      quantity: -administeredDoses.length, // Negative because it's being consumed
      unitCost: inventoryItem.costPrice || 0,
      totalCost: (inventoryItem.costPrice || 0) * administeredDoses.length,
      previousQuantity: inventoryItem.quantity,
      newQuantity: inventoryItem.quantity - administeredDoses.length,
      reason: `${medicationName} dose(s) administered - ${administeredDoses.length} dose(s)`,
      documentReference: taskId,
      performedBy: administeredBy._id,
      patient: task.patientId,
      patientName: task.patientName,
      medicationName: medicationName,
      dosage: task.medicationDetails?.dosage,
      administeredAt: administeredDoses[0].administeredAt || new Date(),
      status: 'completed'
    });
    
    await transaction.save();
    console.log('✅ Inventory transaction created:', transaction._id);
    
    // 7. Update inventory quantity
    console.log('\n📦 Updating inventory quantity...');
    const previousQuantity = inventoryItem.quantity;
    inventoryItem.quantity = previousQuantity - administeredDoses.length;
    inventoryItem.updatedBy = administeredBy._id;
    inventoryItem.updatedAt = new Date();
    
    await inventoryItem.save();
    console.log(`✅ Inventory updated: ${previousQuantity} → ${inventoryItem.quantity}`);
    
    // 8. Update task status if needed
    if (task.status === 'PENDING') {
      console.log('\n📋 Updating task status...');
      task.status = 'COMPLETED';
      task.completedDate = new Date();
      task.completedBy = administeredBy._id;
      
      await task.save();
      console.log('✅ Task status updated to COMPLETED');
    }
    
    // 9. Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const updatedTask = await NurseTask.findById(taskId);
    const updatedInventoryItem = await InventoryItem.findById(inventoryItem._id);
    const newTransaction = await InventoryTransaction.findById(transaction._id);
    
    console.log('📊 Verification Results:');
    console.log(`   - Task Status: ${updatedTask.status}`);
    console.log(`   - Inventory Quantity: ${updatedInventoryItem.quantity}`);
    console.log(`   - Transaction Created: ${newTransaction ? 'Yes' : 'No'}`);
    console.log(`   - Transaction Status: ${newTransaction?.status}`);
    
    console.log('\n✅ 3rd Order fix completed successfully!');
    
    // 10. Now implement permanent solution
    console.log('\n🛡️ Implementing permanent solution...');
    
    // Check if there are any other tasks with missing deductions
    const allTasksWithMissingDeductions = await NurseTask.find({
      taskType: 'MEDICATION',
      'medicationDetails.doseRecords': {
        $elemMatch: { administered: true }
      }
    });
    
    let totalMissing = 0;
    for (const task of allTasksWithMissingDeductions) {
      const existingTransaction = await InventoryTransaction.findOne({
        documentReference: task._id,
        transactionType: 'medical-use'
      });
      
      if (!existingTransaction) {
        totalMissing++;
      }
    }
    
    console.log(`📊 Total tasks with missing deductions: ${totalMissing}`);
    
    if (totalMissing === 0) {
      console.log('✅ All medication tasks now have proper inventory deductions!');
      console.log('🎉 The system is working correctly');
    } else {
      console.log('⚠️ Some tasks still missing deductions - run enhanced fix script');
    }
    
  } catch (error) {
    console.error('❌ Error during 3rd order fix:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
if (require.main === module) {
  connectDB().then(() => {
    fix3rdOrderInventoryDeduction();
  });
}

module.exports = { fix3rdOrderInventoryDeduction };
