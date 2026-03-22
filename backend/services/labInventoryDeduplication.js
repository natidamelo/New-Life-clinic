
/**
 * ENHANCED LAB INVENTORY DEDUPLICATION SYSTEM
 * Ensures inventory is deducted only once regardless of ordering pathway
 */

class LabInventoryDeduplication {
  constructor() {
    this.processingOrders = new Set(); // In-memory lock for processing orders
  }
  
  /**
   * Unified lab inventory deduction with pathway-agnostic locking
   * @param {Object} labOrder - Lab order object
   * @param {String} userId - User performing the action
   * @param {String} pathway - 'service' or 'doctor' pathway
   * @returns {Promise<Object>} - Deduction result
   */
  async deductLabInventoryUnified(labOrder, userId, pathway = 'unknown') {
    const lockKey = `lab_${labOrder._id}_${labOrder.testName}`;
    
    // Check if already processing this order
    if (this.processingOrders.has(lockKey)) {
      console.log(`⏭️ [LAB-DEDUP] Order ${labOrder._id} already being processed`);
      return {
        success: true,
        skipped: true,
        reason: 'Order already being processed'
      };
    }
    
    // Set processing lock
    this.processingOrders.add(lockKey);
    
    try {
      const LabOrder = require('./models/LabOrder');
      const InventoryItem = require('./models/InventoryItem');
      const InventoryTransaction = require('./models/InventoryTransaction');
      const labTestInventoryMap = require('./config/labTestInventoryMap');
      
      console.log(`🔬 [LAB-DEDUP] Processing lab order ${labOrder._id} via ${pathway} pathway`);
      
      // ATOMIC CHECK: Ensure inventory hasn't been deducted yet
      const lockedOrder = await LabOrder.findOneAndUpdate(
        { 
          _id: labOrder._id,
          inventoryDeducted: { $ne: true } // Only update if NOT already deducted
        },
        { 
          $set: { 
            inventoryDeducted: true,
            inventoryDeductedAt: new Date(),
            inventoryDeductedBy: userId,
            deductionPathway: pathway
          }
        },
        { new: true }
      );
      
      // If lockedOrder is null, inventory was already deducted
      if (!lockedOrder) {
        console.log(`⏭️ [LAB-DEDUP] Inventory already deducted for order ${labOrder._id}`);
        return {
          success: true,
          skipped: true,
          reason: 'Inventory already deducted'
        };
      }
      
      console.log(`✅ [LAB-DEDUP] Acquired deduction lock for order ${labOrder._id}`);
      
      // Find inventory item mapping
      const testName = labOrder.testName;
      const inventoryMapping = labTestInventoryMap[testName];
      
      if (!inventoryMapping) {
        console.log(`⚠️ [LAB-DEDUP] No inventory mapping found for ${testName}`);
        return {
          success: true,
          skipped: true,
          reason: 'No inventory mapping found'
        };
      }
      
      // Find inventory item
      const inventoryItem = await InventoryItem.findOne({
        name: inventoryMapping.itemName,
        ...(inventoryMapping.category && { category: inventoryMapping.category }),
        isActive: true
      });
      
      if (!inventoryItem) {
        console.log(`⚠️ [LAB-DEDUP] Inventory item not found: ${inventoryMapping.itemName}`);
        return {
          success: false,
          reason: 'Inventory item not found'
        };
      }
      
      const quantityToConsume = inventoryMapping.quantity || 1;
      
      // Check stock availability
      if (inventoryItem.quantity < quantityToConsume) {
        console.log(`⚠️ [LAB-DEDUP] Insufficient stock. Available: ${inventoryItem.quantity}, Required: ${quantityToConsume}`);
        return {
          success: false,
          reason: 'Insufficient stock'
        };
      }
      
      // ATOMIC INVENTORY UPDATE
      const updatedInventoryItem = await InventoryItem.findOneAndUpdate(
        { 
          _id: inventoryItem._id, 
          quantity: { $gte: quantityToConsume } 
        },
        {
          $inc: { quantity: -quantityToConsume },
          $set: { updatedBy: userId }
        },
        { new: true }
      );
      
      if (!updatedInventoryItem) {
        console.log(`⚠️ [LAB-DEDUP] Atomic inventory update failed - concurrent modification`);
        return {
          success: false,
          reason: 'Concurrent modification'
        };
      }
      
      // Create transaction record
      const previousQuantity = updatedInventoryItem.quantity + quantityToConsume;
      
      const transaction = new InventoryTransaction({
        transactionType: 'medical-use',
        item: inventoryItem._id,
        quantity: -quantityToConsume,
        unitCost: inventoryItem.costPrice || 0,
        totalCost: (inventoryItem.costPrice || 0) * quantityToConsume,
        reason: `Lab test completed (${pathway} pathway): ${testName}`,
        documentReference: labOrder._id,
        performedBy: userId,
        patient: labOrder.patientId,
        previousQuantity: previousQuantity,
        newQuantity: updatedInventoryItem.quantity,
        status: 'completed',
        _skipInventoryUpdate: true // ✅ FIX: Skip hook - inventory already updated manually above
      });
      
      await transaction.save();
      
      console.log(`✅ [LAB-DEDUP] Successfully deducted ${quantityToConsume} ${inventoryItem.name}`);
      console.log(`   Previous quantity: ${previousQuantity}`);
      console.log(`   New quantity: ${updatedInventoryItem.quantity}`);
      console.log(`   Pathway: ${pathway}`);
      
      return {
        success: true,
        transactionId: transaction._id,
        itemName: inventoryItem.name,
        quantityConsumed: quantityToConsume,
        newQuantity: updatedInventoryItem.quantity,
        pathway: pathway
      };
      
    } catch (error) {
      console.error(`❌ [LAB-DEDUP] Error in deduction:`, error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      // Always release the processing lock
      this.processingOrders.delete(lockKey);
    }
  }
}

// Export singleton instance
const labDeduplication = new LabInventoryDeduplication();
module.exports = labDeduplication;
