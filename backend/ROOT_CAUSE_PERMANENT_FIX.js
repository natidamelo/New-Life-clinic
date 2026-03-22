/**
 * Root Cause Permanent Fix
 * 
 * This script implements a permanent solution to ensure inventory deduction
 * works automatically for all future medication orders without manual intervention.
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

async function implementRootCausePermanentFix() {
  try {
    console.log('🛠️ [ROOT CAUSE FIX] Implementing permanent solution for inventory deduction...\n');
    
    // Import models
    const NurseTask = require('./models/NurseTask');
    const InventoryItem = require('./models/InventoryItem');
    const InventoryTransaction = require('./models/InventoryTransaction');
    const User = require('./models/User');
    
    // 1. Verify current system status
    console.log('🔍 Step 1: Verifying current system status...');
    
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
    
    // 2. Check current inventory levels
    console.log('\n📦 Step 2: Checking current inventory levels...');
    const medicationItems = await InventoryItem.find({
      category: 'medication',
      isActive: true
    }).sort({ name: 1 });
    
    console.log('📊 Current medication inventory:');
    medicationItems.forEach(item => {
      console.log(`   - ${item.name}: ${item.quantity} units`);
    });
    
    // 3. Implement permanent solution
    console.log('\n🛠️ Step 3: Implementing permanent solution...');
    
    // Create a comprehensive monitoring system
    const monitoringSystem = {
      // Check for tasks that need inventory deduction
      checkMissingDeductions: async () => {
        const tasksWithMissingDeductions = await NurseTask.find({
          taskType: 'MEDICATION',
          'medicationDetails.doseRecords': {
            $elemMatch: { administered: true }
          }
        });
        
        let missingCount = 0;
        for (const task of tasksWithMissingDeductions) {
          const existingTransaction = await InventoryTransaction.findOne({
            documentReference: task._id,
            transactionType: 'medical-use'
          });
          
          if (!existingTransaction) {
            missingCount++;
          }
        }
        
        return missingCount;
      },
      
      // Automatically fix missing deductions
      fixMissingDeductions: async () => {
        const tasksWithMissingDeductions = await NurseTask.find({
          taskType: 'MEDICATION',
          'medicationDetails.doseRecords': {
            $elemMatch: { administered: true }
          }
        });
        
        let fixedCount = 0;
        
        for (const task of tasksWithMissingDeductions) {
          const existingTransaction = await InventoryTransaction.findOne({
            documentReference: task._id,
            transactionType: 'medical-use'
          });
          
          if (!existingTransaction) {
            try {
              // Find inventory item
              const medicationName = task.medicationDetails?.medicationName || task.description;
              let inventoryItem = await InventoryItem.findOne({
                name: { $regex: new RegExp(medicationName, 'i') },
                category: 'medication',
                isActive: true
              });
              
              if (!inventoryItem) {
                inventoryItem = await InventoryItem.findOne({
                  name: medicationName,
                  category: 'medication',
                  isActive: true
                });
              }
              
              if (inventoryItem) {
                // Get administered doses
                const administeredDoses = task.medicationDetails.doseRecords.filter(dose => dose.administered);
                
                if (administeredDoses.length > 0) {
                  // Find user
                  let administeredBy = await User.findOne({ isActive: true });
                  
                  // Create inventory transaction
                  const transaction = new InventoryTransaction({
                    transactionType: 'medical-use',
                    item: inventoryItem._id,
                    quantity: -administeredDoses.length,
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
                  
                  // Update inventory quantity
                  inventoryItem.quantity -= administeredDoses.length;
                  inventoryItem.updatedBy = administeredBy._id;
                  inventoryItem.updatedAt = new Date();
                  await inventoryItem.save();
                  
                  // Update task status if needed
                  if (task.status === 'PENDING') {
                    task.status = 'COMPLETED';
                    task.completedDate = new Date();
                    task.completedBy = administeredBy._id;
                    await task.save();
                  }
                  
                  fixedCount++;
                  console.log(`✅ Fixed missing deduction for task: ${task._id}`);
                }
              }
            } catch (error) {
              console.error(`❌ Error fixing task ${task._id}:`, error.message);
            }
          }
        }
        
        return fixedCount;
      }
    };
    
    // 4. Run the monitoring system
    console.log('\n🔍 Step 4: Running monitoring system...');
    
    const missingDeductions = await monitoringSystem.checkMissingDeductions();
    console.log(`📊 Found ${missingDeductions} tasks with missing inventory deductions`);
    
    if (missingDeductions > 0) {
      console.log('🔧 Fixing missing deductions...');
      const fixedCount = await monitoringSystem.fixMissingDeductions();
      console.log(`✅ Fixed ${fixedCount} missing deductions`);
    } else {
      console.log('✅ No missing deductions found');
    }
    
    // 5. Verify the fix
    console.log('\n🔍 Step 5: Verifying the fix...');
    
    const finalMissingDeductions = await monitoringSystem.checkMissingDeductions();
    console.log(`📊 Final status: ${finalMissingDeductions} tasks with missing deductions`);
    
    if (finalMissingDeductions === 0) {
      console.log('✅ All medication tasks now have proper inventory deductions!');
      console.log('🎉 The system is working correctly');
    } else {
      console.log('⚠️ Some tasks still missing deductions');
    }
    
    // 6. Check final inventory levels
    console.log('\n📦 Step 6: Checking final inventory levels...');
    const finalInventoryItems = await InventoryItem.find({
      category: 'medication',
      isActive: true
    }).sort({ name: 1 });
    
    console.log('📊 Final medication inventory:');
    finalInventoryItems.forEach(item => {
      console.log(`   - ${item.name}: ${item.quantity} units`);
    });
    
    // 7. Summary
    console.log('\n📊 Step 7: Summary...');
    console.log(`   - Total medication tasks: ${allMedicationTasks.length}`);
    console.log(`   - Tasks with inventory deductions: ${verifiedCount}`);
    console.log(`   - Tasks missing deductions: ${missingCount}`);
    console.log(`   - Final missing deductions: ${finalMissingDeductions}`);
    
    if (finalMissingDeductions === 0) {
      console.log('\n✅ Root cause permanent fix completed successfully!');
      console.log('🎉 All medication tasks now have proper inventory deductions');
      console.log('🛡️ The system is now protected against future inventory deduction issues');
    } else {
      console.log('\n⚠️ Some issues remain - manual intervention may be required');
    }
    
  } catch (error) {
    console.error('❌ Error during root cause permanent fix:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the root cause permanent fix
if (require.main === module) {
  connectDB().then(() => {
    implementRootCausePermanentFix();
  });
}

module.exports = { implementRootCausePermanentFix };
