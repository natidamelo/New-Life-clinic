const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction'); // Assuming this model is used by the route, not directly by service for this part.
const DispensedItemCharge = require('../models/DispensedItemCharge'); // Import the new model
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Service for inventory management operations
 */
const inventoryService = {
  /**
   * Decrease inventory when items are used by lab, nurses, or other departments, or dispensed to a patient.
   * @param {Array} items - Array of items to be consumed [{itemId, quantity, unit (optional)}]
   * @param {String} departmentType - Department using the items (lab, nurse, pharmacy_dispense, etc.)
   * @param {String} referenceId - Reference ID (labTest ID, prescription ID, visit ID, etc.)
   * @param {String} userId - ID of user performing the action
   * @param {String} [patientId] - Optional: ID of the patient if items are being dispensed directly to a patient.
   * @param {String} [notes] - Optional: Notes for the dispense operation / charge item.
   * @returns {Promise<Array>} - Updated inventory items and created charge items if applicable
   */
  async consumeInventory(items, departmentType, referenceId, userId, patientId = null, notes = '') {
    // For single MongoDB instances, we'll skip transactions
    // Transactions require replica sets or sharded clusters
    let useTransactions = false;
    let session = null;
    
    console.log('Using non-transactional approach for inventory deduction');
    
    try {
      const updatedItems = [];
      const createdCharges = [];
      
      for (const item of items) {
        const inventoryItem = useTransactions 
          ? await InventoryItem.findById(item.itemId).session(session)
          : await InventoryItem.findById(item.itemId);
        
        if (!inventoryItem) {
          throw new Error(`Inventory item ${item.itemId} not found`);
        }
        
        if (inventoryItem.quantity < item.quantity) {
          throw new Error(`Not enough ${inventoryItem.name} in stock. Available: ${inventoryItem.quantity} ${inventoryItem.unit}`);
        }
        
        // Update inventory
        const previousQuantity = inventoryItem.quantity;
        const newQuantity = previousQuantity - item.quantity;
        
        inventoryItem.quantity = newQuantity;
        
        // Ensure we have a valid performedBy user ID for transaction record
        let performedById = userId;
        if (!performedById) {
          const fallbackUser = await User.findOne({ role: 'admin' }) || await User.findOne();
          performedById = fallbackUser ? fallbackUser._id : new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
        }

        // Add transaction record
        inventoryItem.transactions.push({
          type: 'remove',
          quantity: item.quantity,
          previousQuantity,
          newQuantity,
          reason: `Used by ${departmentType}`,
          reference: referenceId,
          performedBy: performedById
        });
        
        inventoryItem.updatedAt = Date.now();
        inventoryItem.updatedBy = userId;
        
        if (useTransactions) {
          await inventoryItem.save({ session });
        } else {
          await inventoryItem.save();
        }
        
        updatedItems.push(inventoryItem);

        // Create InventoryTransaction record
        const transactionReason = notes || `Dispensed via ${departmentType}`;

        if (performedById) {
          const inventoryTransaction = new InventoryTransaction({
              item: inventoryItem._id,
              transactionType: 'medical-use',
              quantity: -item.quantity,
              previousQuantity,
              newQuantity,
              reason: transactionReason,
              documentReference: referenceId,
              patient: patientId,
              performedBy: performedById,
              _skipInventoryUpdate: true // ✅ FIX: Skip hook - inventory already updated manually above
          });
          
          if (useTransactions) {
            await inventoryTransaction.save({ session });
          } else {
            await inventoryTransaction.save();
          }

          if (departmentType === 'pharmacy_dispense' && patientId) {
            if (typeof inventoryItem.sellingPrice !== 'number' || inventoryItem.sellingPrice <= 0) {
              throw new Error(`Item ${inventoryItem.name} (ID: ${inventoryItem._id}) does not have a valid selling price and cannot be dispensed for billing.`);
            }

            const charge = new DispensedItemCharge({
              patient: patientId,
              inventoryItem: inventoryItem._id,
              itemName: inventoryItem.name,
              quantityDispensed: item.quantity,
              unitPrice: inventoryItem.sellingPrice,
              totalPrice: item.quantity * inventoryItem.sellingPrice,
              status: 'pending_billing',
              dispenseDate: new Date(),
              dispensedBy: userId,
              inventoryTransaction: inventoryTransaction._id, // Link to the transaction
              notes: notes || `Dispensed for patient ${patientId}`
            });
            
            if (useTransactions) {
              await charge.save({ session });
            } else {
              await charge.save();
            }
            createdCharges.push(charge);
          }
        }
      }
      
      if (useTransactions && session) {
        await session.commitTransaction();
        session.endSession();
      }
      
      console.log(`✅ Successfully deducted inventory: ${items.map(item => `${item.quantity} units`).join(', ')}`);
      
      // Return both updated items and any charges created
      return { updatedItems, createdCharges };
    } catch (err) {
      if (useTransactions && session) {
        await session.abortTransaction();
        session.endSession();
      }
      console.error('Error in consumeInventory:', err.message);
      throw err;
    }
  },
  
  /**
   * Check if inventory items are available in sufficient quantity
   * @param {Array} items - Array of items to be checked [{itemId, quantity}]
   * @returns {Promise<Object>} - Availability status and insufficient items if any
   */
  async checkInventoryAvailability(items) {
    try {
      const insufficientItems = [];
      
      for (const item of items) {
        const inventoryItem = await InventoryItem.findById(item.itemId);
        
        if (!inventoryItem) {
          insufficientItems.push({
            itemId: item.itemId,
            name: 'Unknown item',
            required: item.quantity,
            available: 0,
            error: 'Item not found'
          });
          continue;
        }
        
        if (inventoryItem.quantity < item.quantity) {
          insufficientItems.push({
            itemId: item.itemId,
            name: inventoryItem.name,
            required: item.quantity,
            available: inventoryItem.quantity,
            unit: inventoryItem.unit
          });
        }
      }
      
      return {
        available: insufficientItems.length === 0,
        insufficientItems
      };
    } catch (err) {
      console.error('Error checking inventory availability:', err);
      throw err;
    }
  },
  
  /**
   * Get low stock items
   * @returns {Promise<Array>} - List of low stock items
   */
  async getLowStockItems() {
    try {
      const items = await InventoryItem.find({
        $expr: { $lte: ["$quantity", "$minimumStockLevel"] }
      }).sort({ quantity: 1 });
      
      return items;
    } catch (err) {
      console.error('Error fetching low stock items:', err);
      throw err;
    }
  },
  
  /**
   * Get items that need reordering
   * @returns {Promise<Array>} - List of items that need reordering
   */
  async getItemsNeedingReorder() {
    try {
      const items = await InventoryItem.find({
        $expr: { 
          $and: [
            { $gt: ["$quantity", "$minimumStockLevel"] },
            { $lte: ["$quantity", "$reorderPoint"] }
          ]
        }
      }).sort({ quantity: 1 });
      
      return items;
    } catch (err) {
      console.error('Error fetching items that need reordering:', err);
      throw err;
    }
  },
  
  /**
   * Get item transaction history
   * @param {String} itemId - Inventory item ID
   * @returns {Promise<Array>} - Transaction history
   */
  async getItemTransactions(itemId) {
    try {
      const item = await InventoryItem.findById(itemId)
        .populate('transactions.performedBy', 'name')
        .select('transactions');
      
      if (!item) {
        throw new Error('Inventory item not found');
      }
      
      return item.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (err) {
      console.error('Error fetching transactions:', err);
      throw err;
    }
  }
};

module.exports = inventoryService; 
