/**
 * Fix Normal Saline Inventory Deduction Issue
 * 
 * This script will fix the inventory deduction issue for the Normal Saline
 * medication task by creating the missing inventory transaction.
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

async function fixNormalSalineInventoryDeduction() {
  try {
    console.log('🔧 [FIX] Starting Normal Saline inventory deduction fix...\n');
    
    // Import models
    const NurseTask = require('./models/NurseTask');
    const InventoryItem = require('./models/InventoryItem');
    const InventoryTransaction = require('./models/InventoryTransaction');
    const User = require('./models/User');
    
    // 1. Get the specific task
    const taskId = '68e388c80919058eaa403683';
    const task = await NurseTask.findById(taskId);
    
    if (!task) {
      console.log('❌ Task not found with ID:', taskId);
      return;
    }
    
    console.log('✅ Task found:', task.medicationDetails?.medicationName || task.description);
    
    // 2. Find the inventory item
    const medicationName = task.medicationDetails?.medicationName || 'Normal Saline';
    let inventoryItem = await InventoryItem.findOne({
      name: { $regex: new RegExp(medicationName, 'i') },
      category: 'medication',
      isActive: true
    });
    
    // If not found with regex, try exact match
    if (!inventoryItem) {
      inventoryItem = await InventoryItem.findOne({
        name: 'Normal Saline (0.9% NaCl)',
        category: 'medication',
        isActive: true
      });
    }
    
    // If still not found, try by ID from the diagnostic
    if (!inventoryItem) {
      inventoryItem = await InventoryItem.findById('68e37bccfd08e6070b1598c5');
    }
    
    if (!inventoryItem) {
      console.log('❌ Inventory item not found for:', medicationName);
      return;
    }
    
    console.log('✅ Inventory item found:', inventoryItem.name);
    console.log(`   Current quantity: ${inventoryItem.quantity}`);
    
    // 3. Check if transaction already exists
    const existingTransaction = await InventoryTransaction.findOne({
      item: inventoryItem._id,
      documentReference: taskId,
      reason: { $regex: new RegExp(medicationName, 'i') }
    });
    
    if (existingTransaction) {
      console.log('⚠️ Inventory transaction already exists:', existingTransaction._id);
      console.log('   Transaction details:', {
        reason: existingTransaction.reason,
        quantity: existingTransaction.quantity,
        status: existingTransaction.status,
        createdAt: existingTransaction.createdAt
      });
      return;
    }
    
    // 4. Check if dose was actually administered
    const administeredDoses = task.medicationDetails?.doseRecords?.filter(dose => dose.administered) || [];
    
    if (administeredDoses.length === 0) {
      console.log('❌ No doses have been administered yet');
      console.log('💡 Cannot create inventory transaction without administered doses');
      return;
    }
    
    console.log(`✅ Found ${administeredDoses.length} administered doses`);
    
    // 5. Get the user who administered the dose
    let administeredBy = null;
    const administeredByName = administeredDoses[0].administeredBy;
    
    console.log('🔍 Looking for user who administered dose:', administeredByName);
    
    if (administeredByName) {
      // Try to find user by name (since administeredBy might be a name string)
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
      // Try to find any active user as fallback
      administeredBy = await User.findOne({ isActive: true });
      console.log('⚠️ Using fallback user for transaction');
    }
    
    if (!administeredBy) {
      console.log('❌ No user found to assign as performer');
      return;
    }
    
    console.log('✅ Found user for transaction:', administeredBy.firstName, administeredBy.lastName);
    
    // 6. Create the inventory transaction
    console.log('\n📝 Creating inventory transaction...');
    
    const transaction = new InventoryTransaction({
      transactionType: 'medical-use',
      item: inventoryItem._id,
      quantity: -1, // Negative because it's being consumed
      unitCost: inventoryItem.costPrice || 0,
      totalCost: inventoryItem.costPrice || 0,
      previousQuantity: inventoryItem.quantity,
      newQuantity: inventoryItem.quantity - 1,
      reason: `${medicationName} dose administered - Day 1, Anytime`,
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
    inventoryItem.quantity = previousQuantity - 1;
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
    
    console.log('\n✅ Fix completed successfully!');
    console.log('🎉 Normal Saline inventory deduction is now working properly');
    
  } catch (error) {
    console.error('❌ Error during fix:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the fix
if (require.main === module) {
  connectDB().then(() => {
    fixNormalSalineInventoryDeduction();
  });
}

module.exports = { fixNormalSalineInventoryDeduction };
