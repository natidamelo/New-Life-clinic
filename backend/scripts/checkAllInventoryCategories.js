const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');

async function checkAllInventoryCategories() {
  try {
    console.log('🔍 Checking All Inventory Categories');
    console.log('===================================\n');

    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms');

    // Check all inventory items by category
    const categories = ['laboratory', 'medication', 'service', 'other'];

    for (const category of categories) {
      console.log(`\n📦 ${category.toUpperCase()} Items:`);
      console.log('==============================');

      const items = await InventoryItem.find({
        category: category,
        isActive: true
      }).sort({ name: 1 });

      if (items.length === 0) {
        console.log(`  No ${category} items found`);
        continue;
      }

      items.forEach(item => {
        console.log(`  ${item.name} (${item.itemCode})`);
        console.log(`    Quantity: ${item.quantity}`);
        console.log(`    Cost: $${item.costPrice}, Sell: $${item.sellingPrice}`);
        console.log(`    Last Updated: ${item.updatedAt}`);

        // Check if quantity seems reasonable (not obviously wrong)
        if (item.quantity < 0) {
          console.log(`    ⚠️ NEGATIVE QUANTITY DETECTED!`);
        } else if (item.quantity > 1000) {
          console.log(`    ⚠️ UNUSUALLY HIGH QUANTITY!`);
        }
        console.log('');
      });
    }

    // Check for duplicate items (same name, different categories)
    console.log('\n🔍 Duplicate Name Check');
    console.log('=======================');

    const allItems = await InventoryItem.find({ isActive: true });
    const nameGroups = {};

    allItems.forEach(item => {
      if (!nameGroups[item.name]) {
        nameGroups[item.name] = [];
      }
      nameGroups[item.name].push(item);
    });

    Object.keys(nameGroups).forEach(name => {
      if (nameGroups[name].length > 1) {
        console.log(`\n⚠️ DUPLICATE: "${name}"`);
        nameGroups[name].forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.category} - ID: ${item._id} - Qty: ${item.quantity}`);
        });
      }
    });

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAllInventoryCategories();
