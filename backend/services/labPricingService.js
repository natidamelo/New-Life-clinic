const InventoryItem = require('../models/InventoryItem');

/** Escape special regex characters so testName can be used in RegExp safely */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Lab Pricing Service - provides pricing information for lab tests
 */
class LabPricingService {
  /**
   * Find inventory price for a lab test (uses current stock selling price)
   * Tries exact name match first, then contains match, so billing always uses inventory price.
   * @param {string} testName - Name of the lab test
   * @returns {Promise<{price: number, item: object}|null>}
   */
  static async findInventoryPrice(testName) {
    try {
      if (!testName || typeof testName !== 'string') {
        return null;
      }

      const trimmedName = testName.trim();
      const baseQuery = { category: 'laboratory', isActive: true };

      // 1) Exact name match first (case-insensitive) so we get the correct item and current price
      let inventoryItem = await InventoryItem.findOne({
        ...baseQuery,
        name: { $regex: new RegExp('^' + escapeRegex(trimmedName) + '$', 'i') }
      });

      // 2) If no exact match, try contains match (e.g. "Stool Exam" matching "Stool Exam (Routine)")
      if (!inventoryItem) {
        inventoryItem = await InventoryItem.findOne({
          ...baseQuery,
          name: { $regex: new RegExp(escapeRegex(trimmedName), 'i') }
        });
      }

      if (inventoryItem && inventoryItem.sellingPrice != null) {
        // Use current selling price from stock (no rounding that could change value)
        const rawPrice = Number(inventoryItem.sellingPrice);
        const roundedPrice = Math.round(rawPrice * 100) / 100;
        
        if (Math.abs(rawPrice - roundedPrice) > 0.001) {
          console.log(`⚠️ [LabPricing] Price rounding: ${rawPrice} → ${roundedPrice} for ${testName}`);
        }
        
        return {
          price: roundedPrice,
          item: inventoryItem
        };
      }

      return null;
    } catch (error) {
      console.error('Error finding inventory price for lab test:', testName, error);
      return null;
    }
  }

  /**
   * Get default pricing for common lab tests
   * @param {string} testName - Name of the lab test
   * @returns {number} Default price
   */
  static getDefaultPrice(testName) {
    const defaultPrices = {
      'glucose': 200,
      'glucose, fasting': 200,
      'complete urinalysis': 100,
      'hemoglobin': 100,
      'hbsag': 500,
      'blood sugar': 200,
      'urine analysis': 100,
      'hb': 100,
      'stool exam (routine)': 300,
      'stool exam': 300,
      'fecal occult blood test (fobt)': 300
    };

    const normalizedName = testName.toLowerCase().trim();
    return defaultPrices[normalizedName] || 0;
  }

  /**
   * Get price for a lab test (inventory or default)
   * @param {string} testName - Name of the lab test
   * @returns {Promise<number>} Price of the test
   */
  static async getPrice(testName) {
    const inventoryPrice = await this.findInventoryPrice(testName);
    if (inventoryPrice && inventoryPrice.price > 0) {
      return inventoryPrice.price;
    }
    
    return this.getDefaultPrice(testName);
  }
}

module.exports = LabPricingService;
