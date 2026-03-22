/**
 * Auto Medication Pricing Monitor
 * 
 * This script runs automatically to prevent hardcoded prices and ensure
 * all medication pricing is properly managed in the database.
 */

const mongoose = require('mongoose');
const MedicationPricingService = require('../utils/medicationPricingService');
const BillableItem = require('../models/BillableItem');
const InventoryItem = require('../models/InventoryItem');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

class AutoMedicationPricingMonitor {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    this.lastCheck = null;
  }

  /**
   * Start the automatic monitoring
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ [AUTO MONITOR] Already running');
      return;
    }

    console.log('🚀 [AUTO MONITOR] Starting automatic medication pricing monitor...');
    this.isRunning = true;

    // Initial sync
    await this.performFullSync();

    // Set up periodic checks
    this.intervalId = setInterval(async () => {
      await this.performPeriodicCheck();
    }, this.checkInterval);

    console.log(`✅ [AUTO MONITOR] Monitor started. Checking every ${this.checkInterval / 1000 / 60} minutes`);
  }

  /**
   * Stop the automatic monitoring
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ [AUTO MONITOR] Not running');
      return;
    }

    console.log('🛑 [AUTO MONITOR] Stopping automatic medication pricing monitor...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('✅ [AUTO MONITOR] Monitor stopped');
  }

  /**
   * Perform full sync of all medication pricing
   */
  async performFullSync() {
    try {
      console.log('🔄 [AUTO MONITOR] Performing full medication pricing sync...');
      
      const result = await MedicationPricingService.syncInventoryPrices();
      
      console.log(`✅ [AUTO MONITOR] Full sync complete: ${result.synced} synced, ${result.errors} errors`);
      
      // Check for any medications without pricing
      await this.checkForMissingPricing();
      
      this.lastCheck = new Date();
      
    } catch (error) {
      console.error('❌ [AUTO MONITOR] Full sync failed:', error);
    }
  }

  /**
   * Perform periodic check for new medications or pricing changes
   */
  async performPeriodicCheck() {
    try {
      console.log('🔍 [AUTO MONITOR] Performing periodic medication pricing check...');
      
      // Check for new inventory items
      await this.checkForNewInventoryItems();
      
      // Check for pricing discrepancies
      await this.checkForPricingDiscrepancies();
      
      // Check for missing pricing
      await this.checkForMissingPricing();
      
      this.lastCheck = new Date();
      console.log('✅ [AUTO MONITOR] Periodic check complete');
      
    } catch (error) {
      console.error('❌ [AUTO MONITOR] Periodic check failed:', error);
    }
  }

  /**
   * Check for new inventory items that need BillableItems
   */
  async checkForNewInventoryItems() {
    try {
      const inventoryItems = await InventoryItem.find({
        category: 'medication',
        isActive: true,
        sellingPrice: { $gt: 0 }
      });

      for (const item of inventoryItems) {
        const existingBillableItem = await BillableItem.findOne({
          name: item.name,
          type: 'medication'
        });

        if (!existingBillableItem) {
          console.log(`🆕 [AUTO MONITOR] Creating BillableItem for new medication: ${item.name}`);
          await MedicationPricingService.ensureBillableItemExists(item.name, item.sellingPrice);
        }
      }
    } catch (error) {
      console.error('❌ [AUTO MONITOR] Error checking for new inventory items:', error);
    }
  }

  /**
   * Check for pricing discrepancies between inventory and BillableItems
   */
  async checkForPricingDiscrepancies() {
    try {
      const inventoryItems = await InventoryItem.find({
        category: 'medication',
        isActive: true,
        sellingPrice: { $gt: 0 }
      });

      for (const item of inventoryItems) {
        const billableItem = await BillableItem.findOne({
          name: item.name,
          type: 'medication'
        });

        if (billableItem && billableItem.unitPrice !== item.sellingPrice) {
          console.log(`⚠️ [AUTO MONITOR] Price discrepancy detected for ${item.name}:`);
          console.log(`   Inventory: ETB ${item.sellingPrice}`);
          console.log(`   BillableItem: ETB ${billableItem.unitPrice}`);
          
          // Auto-correct the BillableItem to match inventory
          billableItem.unitPrice = item.sellingPrice;
          billableItem.updatedAt = new Date();
          await billableItem.save();
          
          console.log(`✅ [AUTO MONITOR] Auto-corrected ${item.name} price to ETB ${item.sellingPrice}`);
        }
      }
    } catch (error) {
      console.error('❌ [AUTO MONITOR] Error checking for pricing discrepancies:', error);
    }
  }

  /**
   * Check for medications without any pricing
   */
  async checkForMissingPricing() {
    try {
      const billableItems = await BillableItem.find({
        type: 'medication',
        isActive: true
      });

      const missingPricing = [];

      for (const item of billableItems) {
        if (!item.unitPrice || item.unitPrice <= 0) {
          missingPricing.push(item.name);
        }
      }

      if (missingPricing.length > 0) {
        console.warn(`⚠️ [AUTO MONITOR] Found ${missingPricing.length} medications without pricing:`);
        missingPricing.forEach(name => console.warn(`   - ${name}`));
        console.warn('   Please add pricing for these medications in the inventory or BillableItems');
      } else {
        console.log('✅ [AUTO MONITOR] All medications have proper pricing');
      }
    } catch (error) {
      console.error('❌ [AUTO MONITOR] Error checking for missing pricing:', error);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: this.lastCheck,
      checkInterval: this.checkInterval,
      nextCheck: this.lastCheck ? new Date(this.lastCheck.getTime() + this.checkInterval) : null
    };
  }
}

// Create and export the monitor instance
const monitor = new AutoMedicationPricingMonitor();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 [AUTO MONITOR] Received SIGINT, shutting down gracefully...');
  monitor.stop();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 [AUTO MONITOR] Received SIGTERM, shutting down gracefully...');
  monitor.stop();
  await mongoose.connection.close();
  process.exit(0);
});

// Export for use in other parts of the application
module.exports = monitor;

// If this script is run directly, start the monitor
if (require.main === module) {
  monitor.start().catch(error => {
    console.error('❌ [AUTO MONITOR] Failed to start monitor:', error);
    process.exit(1);
  });
}

