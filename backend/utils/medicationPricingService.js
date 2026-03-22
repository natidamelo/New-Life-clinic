/**
 * Medication Pricing Service
 * 
 * This service provides centralized medication pricing logic to prevent
 * hardcoded prices and ensure all medication costs are fetched from the database.
 */

const BillableItem = require('../models/BillableItem');
const InventoryItem = require('../models/InventoryItem');

class MedicationPricingService {
  /**
   * Get medication price from BillableItem (preferred) or Inventory
   * @param {string} medicationName - Name of the medication
   * @returns {Promise<{price: number, source: string, error?: string}>}
   */
  static async getMedicationPrice(medicationName) {
    if (!medicationName) {
      return {
        price: null,
        source: 'none',
        error: 'No medication name provided'
      };
    }

    try {
      // First, try to get price from BillableItem (preferred source)
      const billableItem = await BillableItem.findOne({
        name: { $regex: new RegExp(medicationName.trim(), 'i') },
        type: 'medication',
        isActive: true
      });

      if (billableItem && billableItem.unitPrice > 0) {
        return {
          price: billableItem.unitPrice,
          source: `BillableItem (${billableItem.name})`,
          billableItemId: billableItem._id
        };
      }

      // Fallback to inventory if no BillableItem found
      const inventoryItem = await InventoryItem.findOne({
        name: { $regex: new RegExp(medicationName.trim(), 'i') },
        category: 'medication',
        isActive: true
      });

      if (inventoryItem && inventoryItem.sellingPrice > 0) {
        return {
          price: inventoryItem.sellingPrice,
          source: `Inventory (${inventoryItem.name})`,
          inventoryItemId: inventoryItem._id
        };
      }

      // No price found - this should trigger an error, not use a fallback
      return {
        price: null,
        source: 'none',
        error: `No pricing found for medication: ${medicationName}. Please add this medication to BillableItems or Inventory.`
      };

    } catch (error) {
      console.error(`❌ [MedicationPricingService] Error getting price for ${medicationName}:`, error);
      return {
        price: null,
        source: 'error',
        error: `Database error while fetching price for ${medicationName}: ${error.message}`
      };
    }
  }

  /**
   * Validate that a medication has proper pricing before allowing operations
   * @param {string} medicationName - Name of the medication
   * @returns {Promise<{isValid: boolean, price: number, error?: string}>}
   */
  static async validateMedicationPricing(medicationName) {
    const priceResult = await this.getMedicationPrice(medicationName);
    
    if (priceResult.error || !priceResult.price) {
      return {
        isValid: false,
        price: 0,
        error: priceResult.error || 'No price available'
      };
    }

    return {
      isValid: true,
      price: priceResult.price,
      source: priceResult.source
    };
  }

  /**
   * Get medication price with strict validation (throws error if no price)
   * @param {string} medicationName - Name of the medication
   * @returns {Promise<number>}
   */
  static async getMedicationPriceStrict(medicationName) {
    const priceResult = await this.getMedicationPrice(medicationName);
    
    if (priceResult.error || !priceResult.price) {
      throw new Error(`Medication pricing error: ${priceResult.error || 'No price available'}`);
    }

    return priceResult.price;
  }

  /**
   * Create or update BillableItem for a medication
   * @param {string} medicationName - Name of the medication
   * @param {number} unitPrice - Unit price
   * @returns {Promise<Object>}
   */
  static async ensureBillableItemExists(medicationName, unitPrice) {
    try {
      let billableItem = await BillableItem.findOne({
        name: medicationName,
        type: 'medication'
      });

      if (billableItem) {
        // Update existing item
        billableItem.unitPrice = unitPrice;
        billableItem.updatedAt = new Date();
        await billableItem.save();
        console.log(`✅ [MedicationPricingService] Updated BillableItem: ${medicationName} - ETB ${unitPrice}`);
      } else {
        // Create new item
        billableItem = new BillableItem({
          name: medicationName,
          unitPrice: unitPrice,
          type: 'medication',
          isActive: true
        });
        await billableItem.save();
        console.log(`✅ [MedicationPricingService] Created BillableItem: ${medicationName} - ETB ${unitPrice}`);
      }

      return billableItem;
    } catch (error) {
      console.error(`❌ [MedicationPricingService] Error ensuring BillableItem for ${medicationName}:`, error);
      throw error;
    }
  }

  /**
   * Sync all medication prices from inventory to BillableItems
   * @returns {Promise<{synced: number, errors: number}>}
   */
  static async syncInventoryPrices() {
    try {
      console.log('🔄 [MedicationPricingService] Starting inventory price sync...');
      
      const inventoryItems = await InventoryItem.find({
        category: 'medication',
        isActive: true,
        sellingPrice: { $gt: 0 }
      });

      let synced = 0;
      let errors = 0;

      for (const item of inventoryItems) {
        try {
          await this.ensureBillableItemExists(item.name, item.sellingPrice);
          synced++;
        } catch (error) {
          console.error(`❌ [MedicationPricingService] Error syncing ${item.name}:`, error);
          errors++;
        }
      }

      console.log(`✅ [MedicationPricingService] Sync complete: ${synced} synced, ${errors} errors`);
      return { synced, errors };
    } catch (error) {
      console.error('❌ [MedicationPricingService] Error during sync:', error);
      throw error;
    }
  }
}

module.exports = MedicationPricingService;

