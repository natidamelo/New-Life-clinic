/**
 * Centralized Medication Cost Calculator
 * 
 * This is the SINGLE SOURCE OF TRUTH for all medication cost calculations.
 * All parts of the system MUST use this utility to ensure consistency.
 */

const mongoose = require('mongoose');

class MedicationCalculator {
  
  /**
   * Parse frequency string to doses per day
   * @param {string} frequency - Frequency string (e.g., "BID", "TID", "Three times daily")
   * @returns {number} Number of doses per day
   */
  static parseFrequencyToDosesPerDay(frequency) {
    if (!frequency) return 1;
    
    const freq = frequency.toLowerCase().trim();
    
    // Prioritize explicit frequency terms and common variations
    if (freq.includes('qid') || freq.includes('four times') || freq.includes('4x')) {
      return 4;
    } else if (freq.includes('tid') || freq.includes('three times') || freq.includes('thrice') || freq.includes('3x')) {
      return 3;
    } else if (freq.includes('bid') || freq.includes('twice') || freq.includes('2x')) {
      return 2;
    } else if (freq.includes('qd') || freq.includes('once') || freq.includes('daily') || freq.includes('1x')) {
      return 1;
    }
    
    // Try to extract number of doses directly from patterns like "X dose/day" or "X doses daily"
    const doseMatch = freq.match(/(\d+)\s*(?:dose|doses)\/day/);
    if (doseMatch) {
      return parseInt(doseMatch[1], 10);
    }

    // Fallback: Try to extract a number followed by "times" or "x" which implies frequency
    const timesMatch = freq.match(/(\d+)\s*times?/);
    if (timesMatch) {
      return parseInt(timesMatch[1], 10);
    }
    
    // Default to once daily if no clear pattern
    console.warn(`⚠️ Unknown frequency pattern: "${frequency}", defaulting to 1 dose/day`);
    return 1;
  }
  
  /**
   * Parse duration string to number of days
   * @param {string} duration - Duration string (e.g., "5 days", "1 week")
   * @returns {number} Number of days
   */
  static parseDurationToDays(duration) {
    if (!duration) return null;
    
    if (typeof duration === 'number') {
      return Math.max(1, duration);
    }
    
    const dur = duration.toLowerCase().trim();
    
    // Handle explicit day patterns - FIXED for single day calculation
    const dayMatch = dur.match(/(\d+)\s*days?/);
    if (dayMatch) {
      const days = parseInt(dayMatch[1], 10);
      console.log(`📅 [DURATION PARSE] "${duration}" → ${days} days`);
      return Math.max(1, days);
    }
    
    // Handle week patterns
    const weekMatch = dur.match(/(\d+)\s*weeks?/);
    if (weekMatch) {
      const weeks = parseInt(weekMatch[1], 10);
      const days = weeks * 7;
      console.log(`📅 [DURATION PARSE] "${duration}" → ${weeks} weeks = ${days} days`);
      return Math.max(1, days);
    }
    
    // Handle month patterns
    const monthMatch = dur.match(/(\d+)\s*months?/);
    if (monthMatch) {
      const months = parseInt(monthMatch[1], 10);
      const days = months * 30;
      console.log(`📅 [DURATION PARSE] "${duration}" → ${months} months = ${days} days`);
      return Math.max(1, days);
    }
    
    // Try to extract any number
    const numberMatch = dur.match(/(\d+)/);
    if (numberMatch) {
      return Math.max(1, parseInt(numberMatch[1], 10));
    }
    
    // Unknown/unparsable duration → do not assume 1 day. Return null so callers can decide.
    console.warn(`⚠️ Unknown duration pattern: "${duration}", not defaulting to 1 day`);
    return null;
  }
  
  /**
   * Get medication price from inventory
   * @param {string} medicationName - Name of the medication
   * @returns {Promise<number>} Price per dose in ETB
   */
  static async getMedicationPriceFromInventory(medicationName) {
    if (!medicationName) return null; // No medication name provided
    
    try {
      const InventoryItem = require('../models/InventoryItem');
      
      const inventoryItem = await InventoryItem.findOne({
        name: { $regex: new RegExp(medicationName, 'i') }
      });
      
      if (inventoryItem) {
        // Use sellingPrice if available, otherwise unitPrice, fallback to default
        const price = inventoryItem.sellingPrice || inventoryItem.unitPrice;
        console.log(`💰 [MedicationCalculator] Found inventory price for ${medicationName}: ETB ${price}`);
        return price;
      } else {
        console.warn(`⚠️ [MedicationCalculator] ${medicationName} not found in inventory`);
        return null;
      }
    } catch (error) {
      console.error(`❌ [MedicationCalculator] Error getting inventory price for ${medicationName}:`, error);
      return null; // No price available on error
    }
  }
  
  /**
   * Get medication price from inventory by ID
   * @param {string} inventoryItemId - MongoDB ObjectId of inventory item
   * @returns {Promise<number>} Price per dose in ETB
   */
  static async getMedicationPriceById(inventoryItemId) {
    if (!inventoryItemId) return null;
    
    try {
      const InventoryItem = require('../models/InventoryItem');
      
      const inventoryItem = await InventoryItem.findById(inventoryItemId);
      
      if (inventoryItem) {
        const price = inventoryItem.sellingPrice || inventoryItem.unitPrice;
        console.log(`💰 [MedicationCalculator] Found inventory price by ID ${inventoryItemId}: ETB ${price}`);
        return price;
      } else {
        console.warn(`⚠️ [MedicationCalculator] Inventory item ${inventoryItemId} not found`);
        return null;
      }
    } catch (error) {
      console.error(`❌ [MedicationCalculator] Error getting inventory price by ID ${inventoryItemId}:`, error);
      return null;
    }
  }
  
  /**
   * Calculate total medication cost - THE AUTHORITATIVE CALCULATION
   * @param {Object} medicationData - Medication details
   * @param {string} medicationData.name - Medication name
   * @param {string} medicationData.frequency - Frequency (e.g., "BID", "Three times daily")
   * @param {string} medicationData.duration - Duration (e.g., "5 days", "1 week")
   * @param {string} [medicationData.inventoryItemId] - Inventory item ID (preferred)
   * @param {number} [medicationData.pricePerDose] - Manual price override
   * @returns {Promise<Object>} Detailed cost breakdown
   */
  static async calculateMedicationCost(medicationData) {
    const { name, frequency, duration, inventoryItemId, pricePerDose } = medicationData;
    
    // Calculate doses
    const dosesPerDay = this.parseFrequencyToDosesPerDay(frequency);
    const days = this.parseDurationToDays(duration);
    const totalDoses = (days == null) ? null : (dosesPerDay * days);
    
    // Get price per dose
    let costPerDose = pricePerDose; // Use manual override if provided
    
    if (!costPerDose) {
      if (inventoryItemId) {
        costPerDose = await this.getMedicationPriceById(inventoryItemId);
      } else if (name) {
        costPerDose = await this.getMedicationPriceFromInventory(name);
      } else {
        costPerDose = null; // No price available
      }
    }
    
    // Calculate total cost
    const totalCost = (totalDoses == null || costPerDose == null) ? 0 : (totalDoses * costPerDose);
    
    const result = {
      medicationName: name,
      frequency,
      duration,
      dosesPerDay,
      days,
      totalDoses,
      costPerDose,
      totalCost,
      calculatedAt: new Date()
    };
    
    console.log(`📊 [MedicationCalculator] Calculated cost for ${name}:`, {
      frequency: `${frequency} (${dosesPerDay} doses/day)`,
      duration: `${duration} (${days} days)`,
      totalDoses,
      costPerDose: `ETB ${costPerDose}`,
      totalCost: `ETB ${totalCost}`
    });
    
    return result;
  }
  
  /**
   * Calculate costs for multiple medications
   * @param {Array<Object>} medications - Array of medication objects
   * @returns {Promise<Object>} Combined cost breakdown
   */
  static async calculateMultipleMedicationsCost(medications) {
    const results = [];
    let grandTotal = 0;
    
    for (const med of medications) {
      const calculation = await this.calculateMedicationCost(med);
      results.push(calculation);
      grandTotal += calculation.totalCost;
    }
    
    return {
      medications: results,
      grandTotal,
      calculatedAt: new Date()
    };
  }
  
  /**
   * Validate calculation parameters
   * @param {Object} medicationData - Medication data to validate
   * @returns {Object} Validation result
   */
  static validateMedicationData(medicationData) {
    const errors = [];
    const warnings = [];
    
    if (!medicationData.name && !medicationData.inventoryItemId) {
      errors.push('Either medication name or inventory item ID is required');
    }
    
    if (!medicationData.frequency) {
      warnings.push('No frequency provided, defaulting to once daily');
    }
    
    if (!medicationData.duration) {
      warnings.push('No duration provided, defaulting to 5 days');
    }
    
    const dosesPerDay = this.parseFrequencyToDosesPerDay(medicationData.frequency);
    const days = this.parseDurationToDays(medicationData.duration);
    
    if (dosesPerDay > 6) {
      warnings.push(`Unusually high frequency: ${dosesPerDay} doses/day`);
    }
    
    if (days > 90) {
      warnings.push(`Unusually long duration: ${days} days`);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = MedicationCalculator;