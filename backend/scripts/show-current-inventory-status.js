const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');

require('dotenv').config();

async function showCurrentInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinic-cms');
    console.log('✅ Connected to MongoDB\n');

    const items = await InventoryItem.find({ isActive: true })
      .sort({ category: 1, name: 1 })
      .lean();

    console.log(`📦 ========== CURRENT ACTIVE INVENTORY ==========\n`);
    console.log(`Total items: ${items.length}\n`);

    // Group by category
    const byCategory = {};
    items.forEach(item => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = [];
      }
      byCategory[item.category].push(item);
    });

    // Display by category
    for (const [category, categoryItems] of Object.entries(byCategory).sort()) {
      console.log(`\n📂 ${category.toUpperCase()} (${categoryItems.length} items)`);
      console.log(`${'='.repeat(80)}`);
      
      categoryItems.forEach((item, idx) => {
        const lowStock = item.reorderLevel && item.quantity <= item.reorderLevel ? ' ⚠️  LOW STOCK' : '';
        console.log(`${idx + 1}. ${item.name}`);
        console.log(`   Quantity: ${item.quantity} ${item.unit || 'units'}${lowStock}`);
        if (item.reorderLevel) {
          console.log(`   Reorder Level: ${item.reorderLevel}`);
        }
        if (item.costPrice) {
          console.log(`   Cost Price: $${item.costPrice.toFixed(2)}`);
        }
        if (item.sellingPrice) {
          console.log(`   Selling Price: $${item.sellingPrice.toFixed(2)}`);
        }
        console.log(`   Item ID: ${item._id}`);
        console.log(``);
      });
    }

    console.log(`\n✅ Inventory display complete\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

showCurrentInventory();

