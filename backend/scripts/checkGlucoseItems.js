const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');

async function checkGlucoseItems() {
  try {
    console.log('🔍 Checking Glucose Inventory Items');
    console.log('==================================\n');

    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms');

    // Find all glucose items
    const glucoseItems = await InventoryItem.find({
      name: { $regex: /glucose/i },
      isActive: true
    });

    console.log(`📦 Found ${glucoseItems.length} glucose items:`);

    glucoseItems.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name}`);
      console.log(`   ID: ${item._id}`);
      console.log(`   Item Code: ${item.itemCode}`);
      console.log(`   Quantity: ${item.quantity}`);
      console.log(`   Cost Price: $${item.costPrice}`);
      console.log(`   Selling Price: $${item.sellingPrice}`);
      console.log(`   Category: ${item.category}`);
    });

    // Check lab test mapping
    console.log('\n📋 Lab Test Inventory Mapping');
    console.log('=============================');

    const labTestInventoryMap = require('../config/labTestInventoryMap');

    const glucoseMappings = Object.keys(labTestInventoryMap).filter(key =>
      key.toLowerCase().includes('glucose')
    );

    glucoseMappings.forEach(mapping => {
      const mapData = labTestInventoryMap[mapping];
      console.log(`"${mapping}" → "${mapData.itemName}" (qty: ${mapData.quantity})`);

      // Check if this mapped item exists
      const mappedItem = glucoseItems.find(item =>
        item.name.toLowerCase().includes(mapData.itemName.toLowerCase())
      );

      if (mappedItem) {
        console.log(`   ✅ Found matching item: ${mappedItem.name} (ID: ${mappedItem._id})`);
      } else {
        console.log(`   ❌ No matching item found for: ${mapData.itemName}`);
      }
    });

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkGlucoseItems();
