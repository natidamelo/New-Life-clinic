const inventoryDeductionService = require('./inventoryDeductionService');
const InventoryItem = require('../models/InventoryItem');
const labTestInventoryMap = require('../config/labTestInventoryMap');

const labInventoryService = {
  /**
   * Consume inventory for a completed lab order
   * @param {Object} labOrder - Lab order object
   * @param {String} userId - User ID performing the action
   * @returns {Promise<Object|null>} - Inventory transaction result or null
   */
  async consumeInventoryForLabOrder(labOrder, userId) {
    try {
      return await inventoryDeductionService.deductLabInventory(labOrder, userId);
    } catch (error) {
      console.error(`❌ Error in labInventoryService.consumeInventoryForLabOrder:`, error);
      return null;
    }
  },

  /**
   * Find inventory item by lab test name using mapping
   * @param {String} testName - Lab test name
   * @returns {Promise<Object|null>} - Inventory item object or null
   */
  async findInventoryItemByTestName(testName) {
    try {
      const testMapping = labTestInventoryMap[testName];
      
      if (!testMapping) {
        console.log(`⚠️ No inventory mapping found for lab test: ${testName}`);
        return null;
      }
      
      const inventoryItem = await InventoryItem.findOne({ 
        name: { $regex: new RegExp(testMapping.itemName, 'i') },
        isActive: true 
      });
      
      return inventoryItem;
    } catch (error) {
      console.error(`❌ Error finding inventory item for test: ${testName}`, error);
      return null;
    }
  }
};

module.exports = labInventoryService;
