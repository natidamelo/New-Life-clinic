/**
 * Automatic Inventory Deduction Monitor
 * 
 * This service runs in the background and automatically fixes missing inventory deductions
 * whenever medication doses are administered without proper API calls.
 * 
 * ROOT CAUSE FIX: The frontend is not always calling the correct API endpoint when
 * administering doses. This monitor ensures inventory is deducted regardless.
 */

const mongoose = require('mongoose');

class AutoInventoryDeductionMonitor {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 30000; // Check every 30 seconds
    this.intervalId = null;
  }

  /**
   * Start the automatic monitoring service
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ [AUTO-DEDUCTION] Monitor is already running');
      return;
    }

    console.log('🚀 [AUTO-DEDUCTION] Starting automatic inventory deduction monitor...');
    console.log(`🔍 [AUTO-DEDUCTION] Will check for missing deductions every ${this.checkInterval / 1000} seconds`);

    this.isRunning = true;

    // Run immediately on start
    await this.checkAndFixMissingDeductions();

    // Then run periodically
    this.intervalId = setInterval(async () => {
      await this.checkAndFixMissingDeductions();
    }, this.checkInterval);

    console.log('✅ [AUTO-DEDUCTION] Monitor started successfully');
  }

  /**
   * Stop the monitoring service
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ [AUTO-DEDUCTION] Monitor is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('🛑 [AUTO-DEDUCTION] Monitor stopped');
  }

  /**
   * Check for missing inventory deductions and fix them
   * Only processes tasks that have inventoryDeducted: false to prevent duplicates
   */
  async checkAndFixMissingDeductions() {
    try {
      const NurseTask = require('../models/NurseTask');
      const InventoryItem = require('../models/InventoryItem');
      const InventoryTransaction = require('../models/InventoryTransaction');
      const User = require('../models/User');

      // Find all medication tasks with administered doses that haven't had inventory deducted
      const tasksWithAdministeredDoses = await NurseTask.find({
        taskType: 'MEDICATION',
        'medicationDetails.doseRecords': {
          $elemMatch: {
            administered: true,
            inventoryDeducted: { $ne: true } // Only tasks that haven't had inventory deducted
          }
        }
      });

      if (tasksWithAdministeredDoses.length === 0) {
        return; // No tasks to check
      }

      console.log(`🔍 [AUTO-DEDUCTION] Found ${tasksWithAdministeredDoses.length} tasks needing inventory deduction`);
      let fixedCount = 0;

      for (const task of tasksWithAdministeredDoses) {
        try {
          // Check if inventory transaction already exists
          const existingTransaction = await InventoryTransaction.findOne({
            documentReference: task._id,
            transactionType: 'medical-use'
          });

          if (existingTransaction) {
            // Mark doses as deducted to prevent future processing
            await NurseTask.updateOne(
              { _id: task._id, 'medicationDetails.doseRecords.inventoryDeducted': { $ne: true } },
              { $set: { 'medicationDetails.doseRecords.$[].inventoryDeducted': true } }
            );
            continue; // Already has transaction, skip but mark as deducted
          }

          // Get doses that need inventory deduction (administered but not deducted)
          const dosesNeedingDeduction = task.medicationDetails.doseRecords.filter(
            dose => dose.administered && !dose.inventoryDeducted
          );

          if (dosesNeedingDeduction.length === 0) {
            continue; // No doses need deduction
          }

          const medicationName = task.medicationDetails?.medicationName || task.description;
          console.log(`🔧 [AUTO-DEDUCTION] Processing task ${task._id} - ${medicationName}`);
          console.log(`   Doses needing deduction: ${dosesNeedingDeduction.length}`);

          // Find inventory item
          const inventoryItem = await InventoryItem.findOne({
            name: medicationName,
            isActive: true
          });

          if (!inventoryItem) {
            console.log(`❌ [AUTO-DEDUCTION] Medication "${medicationName}" not found in inventory`);
            continue;
          }

          if (inventoryItem.quantity < dosesNeedingDeduction.length) {
            console.log(`❌ [AUTO-DEDUCTION] Insufficient inventory for ${medicationName}: ${inventoryItem.quantity} < ${dosesNeedingDeduction.length}`);
            continue;
          }

          // Find user for transaction
          const administeredBy = await User.findOne({ isActive: true });

          if (!administeredBy) {
            console.log(`❌ [AUTO-DEDUCTION] No active user found for transaction`);
            continue;
          }

          // Create inventory transaction
          const transaction = new InventoryTransaction({
            transactionType: 'medical-use',
            item: inventoryItem._id,
            quantity: -dosesNeedingDeduction.length,
            unitCost: inventoryItem.costPrice || 0,
            totalCost: (inventoryItem.costPrice || 0) * dosesNeedingDeduction.length,
            previousQuantity: inventoryItem.quantity,
            newQuantity: inventoryItem.quantity - dosesNeedingDeduction.length,
            reason: `${medicationName} dose(s) administered - AUTO-FIXED`,
            documentReference: task._id,
            performedBy: administeredBy._id,
            patient: task.patientId,
            patientName: task.patientName,
            medicationName: medicationName,
            dosage: task.medicationDetails?.dosage,
            administeredAt: dosesNeedingDeduction[0].administeredAt || new Date(),
            status: 'completed'
          });

          await transaction.save();

          // Update inventory quantity
          inventoryItem.quantity -= dosesNeedingDeduction.length;
          inventoryItem.updatedBy = administeredBy._id;
          inventoryItem.updatedAt = new Date();
          await inventoryItem.save();

          // Mark doses as deducted to prevent duplicate processing
          await NurseTask.updateOne(
            { _id: task._id },
            { $set: { 'medicationDetails.doseRecords.$[elem].inventoryDeducted': true } },
            { arrayFilters: [{ 'elem.administered': true, 'elem.inventoryDeducted': { $ne: true } }] }
          );

          fixedCount++;
          console.log(`✅ [AUTO-DEDUCTION] Fixed missing deduction for task ${task._id}: ${medicationName}`);
          console.log(`   📦 Inventory: ${inventoryItem.quantity + dosesNeedingDeduction.length} → ${inventoryItem.quantity}`);

        } catch (error) {
          console.error(`❌ [AUTO-DEDUCTION] Error fixing task ${task._id}:`, error.message);
        }
      }

      if (fixedCount > 0) {
        console.log(`🎉 [AUTO-DEDUCTION] Fixed ${fixedCount} missing inventory deductions`);
      }

    } catch (error) {
      console.error('❌ [AUTO-DEDUCTION] Error in monitor:', error.message);
    }
  }
}

// Export singleton instance
const monitor = new AutoInventoryDeductionMonitor();

module.exports = monitor;
