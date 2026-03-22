const InventoryItem = require('../models/InventoryItem');
const atomicDeduction = require('./atomicInventoryDeduction');
const InventoryTransaction = require('../models/InventoryTransaction');
const Service = require('../models/Service');
const labTestInventoryMap = require('../config/labTestInventoryMap');

/**
 * Comprehensive service for inventory deduction across all departments
 */
const inventoryDeductionService = {
  /**
   * Deduct inventory for lab tests using the lab test mapping
   * @param {Object} labOrder - Lab order object
   * @param {String} userId - User ID performing the action
   * @returns {Promise<Object|null>} - Inventory transaction result or null
   */
  async deductLabInventory(labOrder, userId) {
    try {
      console.log(`🔬 [INVENTORY] ========== STARTING LAB INVENTORY DEDUCTION ==========`);

      // ATOMIC LOCK: Try to claim the deduction by setting inventoryDeducted = true
      // This prevents race conditions from multiple simultaneous calls
      const LabOrder = require('../models/LabOrder');
      const lockedOrder = await LabOrder.findOneAndUpdate(
        { 
          _id: labOrder._id,
          inventoryDeducted: { $ne: true } // Only update if NOT already deducted
        },
        { 
          $set: { 
            inventoryDeducted: true,
            inventoryDeductedAt: new Date(),
            inventoryDeductedBy: userId
          }
        },
        { new: true }
      );

      // If lockedOrder is null, it means another process already claimed the deduction
      if (!lockedOrder) {
        console.log(`🔬 [INVENTORY] ⏭️  SKIPPED - Inventory already deducted for lab order ${labOrder._id} (prevented race condition)`);
        return {
          success: true,
          skipped: true,
          reason: 'Inventory already deducted (atomic lock prevented duplicate)'
        };
      }

      console.log(`🔬 [INVENTORY] ✅ Deduction lock acquired for lab order ${labOrder._id}`);
      console.log(`🔬 [INVENTORY] Lab Order ID: ${labOrder._id}`);
      console.log(`🔬 [INVENTORY] Test Name: ${labOrder.testName}`);
      console.log(`🔬 [INVENTORY] User ID: ${userId}`);

      // Find inventory item mapping for this lab test
      const testName = labOrder.testName;
      const inventoryMapping = labTestInventoryMap[testName];

      if (!inventoryMapping) {
        console.log(`🔬 [INVENTORY] No inventory mapping found for test: ${testName}`);
        console.log(`🔬 [INVENTORY] Available mappings:`, Object.keys(labTestInventoryMap));
        return null;
      }

      console.log(`🔬 [INVENTORY] Found mapping for ${testName}:`, inventoryMapping);

      // Find the inventory item
      const inventoryItem = await InventoryItem.findOne({
        name: inventoryMapping.itemName,
        ...(inventoryMapping.category && { category: inventoryMapping.category }),
        isActive: true
      });

      if (!inventoryItem) {
        console.log(`🔬 [INVENTORY] Inventory item not found: ${inventoryMapping.itemName}`);
        return null;
      }

      const quantityToConsume = inventoryMapping.quantity || 1;

      console.log(`🔬 [INVENTORY] Lab test details:`);
      console.log(`   Test: ${testName}`);
      console.log(`   Inventory item: ${inventoryItem.name}`);
      console.log(`   Current quantity: ${inventoryItem.quantity}`);
      console.log(`   Quantity to consume: ${quantityToConsume}`);

      // Check if there's enough stock
      if (inventoryItem.quantity < quantityToConsume) {
        console.log(`⚠️ [INVENTORY] Insufficient stock. Available: ${inventoryItem.quantity}, Required: ${quantityToConsume}`);
        return null;
      }

      // Use atomic operation to update inventory quantity
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
        console.log(`⚠️ [INVENTORY] Insufficient stock or item was modified during update`);
        return null;
      }

      // Calculate previousQuantity from the atomic update result
      const previousQuantity = updatedInventoryItem.quantity + quantityToConsume;

      // Create transaction record
      const transaction = new InventoryTransaction({
        transactionType: 'medical-use',
        item: inventoryItem._id,
        quantity: -quantityToConsume,
        unitCost: inventoryItem.costPrice || 0,
        totalCost: (inventoryItem.costPrice || 0) * quantityToConsume,
        reason: `Lab test completed: ${testName}`,
        documentReference: labOrder._id,
        performedBy: userId,
        patient: labOrder.patientId,
        previousQuantity: previousQuantity,
        newQuantity: updatedInventoryItem.quantity,
        status: 'completed',
        _skipInventoryUpdate: true // ✅ FIX: Skip hook - inventory already updated manually above
      });

      await transaction.save();

      console.log(`✅ [INVENTORY] Lab inventory deducted successfully:`);
      console.log(`   Test: ${testName}`);
      console.log(`   Item: ${inventoryItem.name}`);
      console.log(`   Quantity consumed: ${quantityToConsume}`);
      console.log(`   Previous quantity: ${previousQuantity}`);
      console.log(`   New quantity: ${updatedInventoryItem.quantity}`);
      
      return {
        success: true,
        transactionId: transaction._id,
        itemName: inventoryItem.name,
        testName: testName,
        quantityConsumed: quantityToConsume,
        newQuantity: updatedInventoryItem.quantity
      };
      
    } catch (error) {
      console.error(`❌ [INVENTORY] Error deducting lab inventory:`, error);
      return null;
    }
  },

  /**
   * Deduct inventory for services that have linked inventory items
   * @param {String} serviceId - Service ID
   * @param {Number} quantity - Quantity to deduct
   * @param {String} userId - User processing the service
   * @returns {Promise<Object|null>} - Inventory transaction result or null
   */
  async deductServiceInventory(serviceId, quantity, userId) {
    try {
      const Service = require('../models/Service');
      const InventoryItem = require('../models/InventoryItem');
      const InventoryTransaction = require('../models/InventoryTransaction');
      const User = require('../models/User');

      // Find the service
      const service = await Service.findById(serviceId);
      if (!service) {
        console.log(`❌ [SERVICE-DEDUCTION] Service not found: ${serviceId}`);
        return { success: false, error: 'Service not found' };
      }

      // Check if service has linked inventory
      if (!service.linkedInventoryItems || service.linkedInventoryItems.length === 0) {
        console.log(`ℹ️ [SERVICE-DEDUCTION] Service ${service.name} has no linked inventory`);
        return { success: true, skipped: true, reason: 'No linked inventory' };
      }

      // Find inventory item (use first linked item)
      const inventoryItem = await InventoryItem.findById(service.linkedInventoryItems[0]);
      if (!inventoryItem || !inventoryItem.isActive) {
        console.log(`❌ [SERVICE-DEDUCTION] Linked inventory item not found or inactive`);
        return { success: false, error: 'Inventory item not found or inactive' };
      }

      // Check if there's enough inventory
      if (inventoryItem.quantity < quantity) {
        console.log(`❌ [SERVICE-DEDUCTION] Insufficient inventory: ${inventoryItem.quantity} < ${quantity}`);
        return { success: false, error: 'Insufficient inventory' };
      }

      // ✅ IMPROVED DEDUPLICATION: Check for ANY recent transaction for this service (within last 60 seconds)
      // This prevents duplicate deductions even if called multiple times
      const recentTransaction = await InventoryTransaction.findOne({
        item: inventoryItem._id,
        documentReference: serviceId.toString(),
        transactionType: 'medical-use',
        createdAt: { $gte: new Date(Date.now() - 60000) } // 60 seconds ago (increased from 10)
      }).sort({ createdAt: -1 }); // Get the most recent one

      if (recentTransaction) {
        console.log(`🚫 [SERVICE-DEDUCTION] Duplicate transaction prevented for service ${serviceId}`);
        console.log(`   Found existing transaction: ${recentTransaction._id} created at ${recentTransaction.createdAt}`);
        return { 
          success: true, 
          skipped: true, 
          reason: 'Duplicate transaction prevented - inventory already deducted',
          existingTransactionId: recentTransaction._id
        };
      }

      // ✅ ATOMIC OPERATION: Use findOneAndUpdate to prevent race conditions
      // This ensures only one deduction happens even if called simultaneously
      const performedBy = await User.findById(userId);
      if (!performedBy) {
        console.log(`❌ [SERVICE-DEDUCTION] User not found: ${userId}`);
        return { success: false, error: 'User not found' };
      }

      // Get current quantity atomically
      const currentItem = await InventoryItem.findById(inventoryItem._id);
      if (!currentItem) {
        return { success: false, error: 'Inventory item not found' };
      }

      const previousQuantity = currentItem.quantity;
      const newQuantity = previousQuantity - quantity;

      // Check again if there's enough inventory (might have changed)
      if (newQuantity < 0) {
        console.log(`❌ [SERVICE-DEDUCTION] Insufficient inventory after atomic check: ${previousQuantity} < ${quantity}`);
        return { success: false, error: 'Insufficient inventory' };
      }

      // Create inventory transaction first
      const transaction = new InventoryTransaction({
        transactionType: 'medical-use',
        item: inventoryItem._id,
        quantity: -quantity,
        unitCost: inventoryItem.costPrice || 0,
        totalCost: (inventoryItem.costPrice || 0) * quantity,
        previousQuantity: previousQuantity,
        newQuantity: newQuantity,
        reason: `${service.name} service provided`,
        documentReference: serviceId.toString(), // Ensure it's a string
        performedBy: performedBy._id,
        status: 'completed'
      });

      await transaction.save();

      // Update inventory quantity atomically using findOneAndUpdate
      const updatedItem = await InventoryItem.findByIdAndUpdate(
        inventoryItem._id,
        {
          $inc: { quantity: -quantity },
          $set: {
            updatedBy: performedBy._id,
            updatedAt: new Date()
          }
        },
        { new: true }
      );

      if (!updatedItem) {
        console.log(`❌ [SERVICE-DEDUCTION] Failed to update inventory item`);
        // Try to delete the transaction we just created
        await InventoryTransaction.findByIdAndDelete(transaction._id);
        return { success: false, error: 'Failed to update inventory' };
      }

      console.log(`✅ [SERVICE-DEDUCTION] Deducted ${quantity} units of ${updatedItem.name}`);
      console.log(`   📦 Inventory: ${previousQuantity} → ${updatedItem.quantity}`);

      return {
        success: true,
        transaction: transaction._id,
        inventoryItem: updatedItem.name,
        quantityDeducted: quantity,
        newQuantity: updatedItem.quantity
      };

    } catch (error) {
      console.error(`❌ [SERVICE-DEDUCTION] Error deducting service inventory:`, error.message);
      return { success: false, error: error.message };
    }
  }
};

module.exports = inventoryDeductionService;