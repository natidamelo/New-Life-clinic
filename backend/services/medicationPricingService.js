const mongoose = require('mongoose');

/**
 * Medication Pricing Service
 * Automatically fetches correct pricing from inventory and validates medication invoices
 */
class MedicationPricingService {
  constructor() {
    this.db = null;
    this.inventoryItemsCollection = null;
  }

  /**
   * Initialize the service with database connection
   */
  async initialize() {
    try {
      if (!this.db) {
        this.db = mongoose.connection.db;
      }
      if (!this.inventoryItemsCollection) {
        this.inventoryItemsCollection = this.db.collection('inventoryitems');
      }
      return true;
    } catch (error) {
      console.error('Failed to initialize MedicationPricingService:', error);
      return false;
    }
  }

  /**
   * Get medication pricing from inventory
   */
  async getMedicationPrice(medicationName) {
    try {
      await this.initialize();
      
      if (!medicationName) {
        throw new Error('Medication name is required');
      }

      // Search for medication in inventory (case-insensitive)
      const inventoryItem = await this.inventoryItemsCollection.findOne({
        name: { $regex: new RegExp(medicationName, 'i') }
      });

      if (!inventoryItem) {
        console.warn(`Medication "${medicationName}" not found in inventory`);
        return null;
      }

      return {
        id: inventoryItem._id,
        name: inventoryItem.name,
        sellingPrice: inventoryItem.sellingPrice,
        costPrice: inventoryItem.costPrice,
        quantity: inventoryItem.quantity,
        category: inventoryItem.category,
        unit: inventoryItem.unit
      };
    } catch (error) {
      console.error('Error getting medication price:', error);
      return null;
    }
  }

  /**
   * Validate and correct medication pricing in invoice items
   */
  async validateAndCorrectPricing(items) {
    try {
      await this.initialize();
      
      if (!items || !Array.isArray(items)) {
        return { success: false, message: 'Items must be an array' };
      }

      const corrections = [];
      let hasErrors = false;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Check if this is a medication item
        if (this.isMedicationItem(item)) {
          const medicationName = this.extractMedicationName(item);
          
          if (medicationName) {
            const inventoryPrice = await this.getMedicationPrice(medicationName);
            
            if (inventoryPrice) {
              // Check for pricing issues
              if (!item.unitPrice || item.unitPrice <= 0) {
                item.unitPrice = inventoryPrice.sellingPrice;
                item.total = item.unitPrice * item.quantity;
                corrections.push({
                  itemIndex: i,
                  medicationName,
                  action: 'corrected_zero_price',
                  oldPrice: 0,
                  newPrice: inventoryPrice.sellingPrice,
                  message: `Corrected zero unit price for ${medicationName}`
                });
              } else if (Math.abs(item.unitPrice - inventoryPrice.sellingPrice) > 0.01) {
                const oldPrice = item.unitPrice;
                item.unitPrice = inventoryPrice.sellingPrice;
                item.total = item.unitPrice * item.quantity;
                corrections.push({
                  itemIndex: i,
                  medicationName,
                  action: 'corrected_price_mismatch',
                  oldPrice,
                  newPrice: inventoryPrice.sellingPrice,
                  message: `Corrected price mismatch for ${medicationName}: ${oldPrice} → ${inventoryPrice.sellingPrice}`
                });
              }

              // Validate quantity
              if (!item.quantity || item.quantity <= 0) {
                hasErrors = true;
                corrections.push({
                  itemIndex: i,
                  medicationName,
                  action: 'error',
                  message: `Invalid quantity for ${medicationName}: ${item.quantity}`
                });
              }

              // Validate total calculation
              const expectedTotal = item.unitPrice * item.quantity;
              if (Math.abs(item.total - expectedTotal) > 0.01) {
                item.total = expectedTotal;
                corrections.push({
                  itemIndex: i,
                  medicationName,
                  action: 'corrected_total',
                  oldTotal: item.total,
                  newTotal: expectedTotal,
                  message: `Corrected total calculation for ${medicationName}`
                });
              }
            } else {
              hasErrors = true;
              corrections.push({
                itemIndex: i,
                medicationName,
                action: 'error',
                message: `Medication "${medicationName}" not found in inventory`
              });
            }
          }
        }
      }

      return {
        success: !hasErrors,
        corrections,
        hasErrors
      };
    } catch (error) {
      console.error('Error validating medication pricing:', error);
      return {
        success: false,
        message: 'Failed to validate medication pricing',
        error: error.message
      };
    }
  }

  /**
   * Check if an item is a medication
   */
  isMedicationItem(item) {
    return (
      item.itemType === 'medication' ||
      (item.description && item.description.toLowerCase().includes('medication')) ||
      (item.serviceName && item.serviceName.toLowerCase().includes('medication')) ||
      (item.category && item.category.toLowerCase() === 'medication')
    );
  }

  /**
   * Extract medication name from item
   */
  extractMedicationName(item) {
    // Try different fields to extract medication name
    const possibleNames = [
      item.serviceName,
      item.description?.replace(/^medication:\s*/i, ''),
      item.name,
      item.medicationName
    ];

    for (const name of possibleNames) {
      if (name && typeof name === 'string' && name.trim()) {
        return name.trim();
      }
    }

    return null;
  }

  /**
   * Calculate medication quantity based on prescription details
   */
  calculateMedicationQuantity(prescription) {
    try {
      const { duration, frequency, dosage } = prescription;
      
      if (!duration || !frequency) {
        return 1; // Default to 1 if missing information
      }

      // Parse frequency to get doses per day
      let dosesPerDay = 1;
      
      if (typeof frequency === 'string') {
        const freq = frequency.toLowerCase();
        if (freq.includes('qd') || freq.includes('once daily') || freq.includes('daily')) {
          dosesPerDay = 1;
        } else if (freq.includes('bid') || freq.includes('twice daily') || freq.includes('2x')) {
          dosesPerDay = 2;
        } else if (freq.includes('tid') || freq.includes('thrice daily') || freq.includes('3x')) {
          dosesPerDay = 3;
        } else if (freq.includes('qid') || freq.includes('four times daily') || freq.includes('4x')) {
          dosesPerDay = 4;
        } else if (freq.includes('q6h') || freq.includes('every 6 hours')) {
          dosesPerDay = 4;
        } else if (freq.includes('q8h') || freq.includes('every 8 hours')) {
          dosesPerDay = 3;
        } else if (freq.includes('q12h') || freq.includes('every 12 hours')) {
          dosesPerDay = 2;
        } else if (freq.includes('q24h') || freq.includes('every 24 hours')) {
          dosesPerDay = 1;
        }
      } else if (typeof frequency === 'number') {
        dosesPerDay = frequency;
      }

      // Parse duration to get number of days - FIXED for single day calculation
      let days = 1; // Default to 1 day
      if (typeof duration === 'number') {
        days = Math.max(1, duration);
      } else if (typeof duration === 'string') {
        const durationMatch = duration.match(/(\d+)/);
        if (durationMatch) {
          days = parseInt(durationMatch[1]);
          if (duration.toLowerCase().includes('month')) days *= 30;
          else if (duration.toLowerCase().includes('week')) days *= 7;
        }
        days = Math.max(1, days);
      }

      // Calculate total quantity
      const totalQuantity = days * dosesPerDay;
      
      console.log(`🧮 [PRICING SERVICE] ${frequency} × ${duration} = ${dosesPerDay} doses/day × ${days} days = ${totalQuantity} total doses`);
      
      return Math.max(1, totalQuantity); // Ensure at least 1
    } catch (error) {
      console.error('Error calculating medication quantity:', error);
      return 1;
    }
  }

  /**
   * Generate medication description for invoice
   */
  generateMedicationDescription(medicationName, prescription) {
    try {
      const { duration, frequency, dosage } = prescription;
      
      let description = `Medication: ${medicationName}`;
      
      if (duration && frequency) {
        description += ` - ${duration} days, ${frequency}`;
      }
      
      if (dosage) {
        description += ` (${dosage})`;
      }
      
      return description;
    } catch (error) {
      console.error('Error generating medication description:', error);
      return `Medication: ${medicationName}`;
    }
  }

  /**
   * Create medication invoice item with correct pricing
   */
  async createMedicationInvoiceItem(medicationName, prescription, userId) {
    try {
      // Get pricing from inventory
      const pricing = await this.getMedicationPrice(medicationName);
      
      if (!pricing) {
        throw new Error(`Medication "${medicationName}" not found in inventory`);
      }

      // Calculate quantity
      const quantity = this.calculateMedicationQuantity(prescription);
      
      // Generate description
      const description = this.generateMedicationDescription(medicationName, prescription);
      
      // Create invoice item
      const invoiceItem = {
        itemType: 'medication',
        category: 'medication',
        description,
        quantity,
        unitPrice: pricing.sellingPrice,
        total: pricing.sellingPrice * quantity,
        inventoryItemId: pricing.id,
        addedBy: userId,
        addedAt: new Date(),
        metadata: {
          medicationName,
          prescription,
          inventoryPrice: pricing.sellingPrice,
          inventoryQuantity: pricing.quantity
        }
      };

      return {
        success: true,
        item: invoiceItem,
        pricing
      };
    } catch (error) {
      console.error('Error creating medication invoice item:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate complete invoice before saving
   */
  async validateInvoice(invoice) {
    try {
      const errors = [];
      const warnings = [];

      // Check if invoice has items
      if (!invoice.items || invoice.items.length === 0) {
        errors.push('Invoice must contain at least one item');
        return { success: false, errors, warnings };
      }

      // Validate each item
      for (let i = 0; i < invoice.items.length; i++) {
        const item = invoice.items[i];
        
        // Check for zero pricing
        if (!item.unitPrice || item.unitPrice <= 0) {
          errors.push(`Item ${i + 1} has invalid unit price: ${item.unitPrice}`);
        }
        
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`Item ${i + 1} has invalid quantity: ${item.quantity}`);
        }
        
        if (!item.total || item.total <= 0) {
          errors.push(`Item ${i + 1} has invalid total: ${item.total}`);
        }

        // Validate medication items specifically
        if (this.isMedicationItem(item)) {
          const medicationName = this.extractMedicationName(item);
          
          if (medicationName) {
            const pricing = await this.getMedicationPrice(medicationName);
            
            if (!pricing) {
              warnings.push(`Medication "${medicationName}" not found in inventory`);
            } else if (Math.abs(item.unitPrice - pricing.sellingPrice) > 0.01) {
              warnings.push(`Price mismatch for ${medicationName}: Invoice price ${item.unitPrice} vs Inventory price ${pricing.sellingPrice}`);
            }
          }
        }
      }

      // Validate invoice total
      const calculatedTotal = invoice.items.reduce((sum, item) => sum + item.total, 0);
      if (Math.abs(invoice.total - calculatedTotal) > 0.01) {
        errors.push(`Invoice total mismatch: Expected ${calculatedTotal}, Got ${invoice.total}`);
      }

      return {
        success: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error validating invoice:', error);
      return {
        success: false,
        errors: ['Invoice validation failed due to server error'],
        warnings: []
      };
    }
  }
}

// Create singleton instance
const medicationPricingService = new MedicationPricingService();

module.exports = medicationPricingService;
