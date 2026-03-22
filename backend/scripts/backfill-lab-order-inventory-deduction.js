const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const LabOrder = require('../models/LabOrder');
const User = require('../models/User');

async function backfillLabOrderInventoryDeduction() {
  try {
    console.log('🔄 Starting backfill of lab order inventory deduction status...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Find lab orders that have results or are in "Results Available" status
    // but don't have inventoryDeducted marked as true
    const completedLabOrders = await LabOrder.find({
      $or: [
        { status: 'Results Available' },
        { status: 'Completed' },
        { results: { $exists: true, $ne: null } }
      ],
      inventoryDeducted: { $ne: true }
    });

    console.log(`📋 Found ${completedLabOrders.length} lab orders that need inventory deduction status backfilled`);

    if (completedLabOrders.length === 0) {
      console.log('✅ No lab orders need backfilling. All completed orders already have inventory deduction status marked.');
      return;
    }

    // Get a default admin user for the backfill operation
    let adminUser = await User.findOne({ role: 'admin' });

    if (!adminUser) {
      // Try to find any user as fallback
      adminUser = await User.findOne({});
    }

    if (!adminUser) {
      console.error('❌ No users found in database. Cannot proceed with backfill.');
      return;
    }

    console.log(`👤 Using admin user for backfill: ${adminUser.firstName} ${adminUser.lastName} (ID: ${adminUser._id})`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each lab order
    for (const labOrder of completedLabOrders) {
      try {
        console.log(`🔄 Processing lab order ${labOrder._id}: ${labOrder.testName} (Status: ${labOrder.status})`);

        // Check if this lab order should have inventory deducted based on the mapping
        const labTestInventoryMap = require('../config/labTestInventoryMap');
        const testMapping = labTestInventoryMap[labOrder.testName];

        if (!testMapping) {
          console.log(`⚠️ No inventory mapping found for ${labOrder.testName}, skipping inventory deduction marking`);
          skippedCount++;
          continue;
        }

        // Check if inventory item exists for this test
        const InventoryItem = require('../models/InventoryItem');
        let inventoryItem = null;

        // Use category from mapping if specified, otherwise default to laboratory for lab tests
        const preferredCategory = testMapping.category || 'laboratory';

        // First try to find the preferred category item
        inventoryItem = await InventoryItem.findOne({
          name: { $regex: new RegExp(testMapping.itemName, 'i') },
          category: preferredCategory,
          isActive: true
        });

        // If no preferred category item found, try other categories
        if (!inventoryItem) {
          const fallbackCategories = ['laboratory', 'medication', 'service', 'other'].filter(cat => cat !== preferredCategory);

          for (const category of fallbackCategories) {
            inventoryItem = await InventoryItem.findOne({
              name: { $regex: new RegExp(testMapping.itemName, 'i') },
              category: category,
              isActive: true
            });

            if (inventoryItem) {
              console.log(`🔍 Found item in fallback category: ${category}`);
              break;
            }
          }
        }

        // If still no item found, try general search
        if (!inventoryItem) {
          inventoryItem = await InventoryItem.findOne({
            name: { $regex: new RegExp(testMapping.itemName, 'i') },
            isActive: true
          });
        }

        if (!inventoryItem) {
          console.log(`⚠️ No inventory item found for ${testMapping.itemName}, skipping`);
          skippedCount++;
          continue;
        }

        // Mark inventory as deducted for this lab order
        labOrder.inventoryDeducted = true;
        labOrder.inventoryDeductedAt = labOrder.resultDateTime || labOrder.updatedAt || new Date();
        labOrder.inventoryDeductedBy = adminUser._id;

        await labOrder.save();

        console.log(`✅ Marked inventory as deducted for lab order ${labOrder._id}`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error processing lab order ${labOrder._id}:`, error);
        skippedCount++;
      }
    }

    console.log(`🎯 Backfill completed:`);
    console.log(`   ✅ Updated: ${updatedCount} lab orders`);
    console.log(`   ⚠️ Skipped: ${skippedCount} lab orders`);

  } catch (error) {
    console.error('❌ Error in backfill script:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the backfill script
if (require.main === module) {
  backfillLabOrderInventoryDeduction();
}

module.exports = backfillLabOrderInventoryDeduction;
