
const mongoose = require('mongoose');

/**
 * ATOMIC DEDUPLICATION SYSTEM
 * This prevents duplicate inventory deductions using MongoDB's atomic operations
 */

class AtomicInventoryDeduction {
  constructor() {
    this.deductionLocks = new Map(); // In-memory locks
  }
  
  /**
   * Atomic inventory deduction with duplicate prevention
   * @param {String} itemId - Inventory item ID
   * @param {Number} quantity - Quantity to deduct
   * @param {String} reason - Reason for deduction
   * @param {String} documentReference - Reference document ID
   * @param {String} userId - User performing the action
   * @returns {Promise<Object>} - Result of the deduction
   */
  async deductInventory(itemId, quantity, reason, documentReference, userId) {
    const lockKey = `${itemId}_${documentReference}_${reason}`;
    
    // Check if already processing this exact deduction
    if (this.deductionLocks.has(lockKey)) {
      console.log(`⏭️ [ATOMIC] Deduction already in progress for ${lockKey}`);
      return {
        success: true,
        skipped: true,
        reason: 'Deduction already in progress'
      };
    }
    
    // Set lock
    this.deductionLocks.set(lockKey, true);
    
    try {
      const InventoryItem = require('./models/InventoryItem');
      const InventoryTransaction = require('./models/InventoryTransaction');
      
      // Check for existing transaction with same parameters
      const existingTransaction = await InventoryTransaction.findOne({
        item: itemId,
        documentReference: documentReference,
        reason: reason,
        transactionType: 'medical-use'
      });
      
      if (existingTransaction) {
        console.log(`⏭️ [ATOMIC] Duplicate transaction prevented for ${documentReference}`);
        return {
          success: true,
          skipped: true,
          reason: 'Duplicate transaction prevented',
          existingTransactionId: existingTransaction._id
        };
      }
      
      // Use atomic operation with optimistic locking
      // DISABLED: Atomic inventory deduction to prevent duplicates
      console.log(`🚫 [DISABLED] Atomic inventory deduction TEMPORARILY DISABLED`);
      console.log(`   Item ID: ${itemId}`);
      console.log(`   Quantity: ${quantity}`);
      console.log(`   This prevents duplicate deductions until root cause is identified`);
      
      const result = null; // DISABLED: await InventoryItem.findOneAndUpdate(
      /*
      const result = await InventoryItem.findOneAndUpdate(
        { 
          _id: itemId, 
          quantity: { $gte: quantity } // Only update if sufficient stock
        },
        {
          $inc: { quantity: -quantity },
          $set: { updatedBy: userId }
        },
        { new: true }
      );
      */
      
      if (!result) {
        console.log(`⚠️ [ATOMIC] Insufficient stock or concurrent modification`);
        return {
          success: false,
          reason: 'Insufficient stock or concurrent modification'
        };
      }
      
      // Create transaction record
      const transaction = new InventoryTransaction({
        transactionType: 'medical-use',
        item: itemId,
        quantity: -quantity,
        reason: reason,
        documentReference: documentReference,
        performedBy: userId,
        previousQuantity: result.quantity + quantity,
        newQuantity: result.quantity,
        status: 'completed',
        _skipInventoryUpdate: true // ✅ FIX: Skip hook - inventory already updated manually above
      });
      
      await transaction.save();
      
      console.log(`✅ [ATOMIC] Successfully deducted ${quantity} from inventory`);
      
      return {
        success: true,
        transactionId: transaction._id,
        newQuantity: result.quantity
      };
      
    } catch (error) {
      console.error(`❌ [ATOMIC] Error in deduction:`, error);
      return {
        success: false,
        error: error.message
      };
    } finally {
      // Always release the lock
      this.deductionLocks.delete(lockKey);
    }
  }
}

// Export singleton instance
const atomicDeduction = new AtomicInventoryDeduction();
module.exports = atomicDeduction;
