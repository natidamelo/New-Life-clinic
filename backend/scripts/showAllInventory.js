const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const InventoryItem = require('../models/InventoryItem');

async function showAllInventory() {
  try {
    console.log('📦 Fetching All Inventory Items...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to database\n');
    
    // Get all inventory items
    const inventoryItems = await InventoryItem.find({ isActive: true })
      .select('name itemCode category quantity costPrice sellingPrice location storageTemperature specimenType testType processTime')
      .sort({ category: 1, name: 1 });
    
    console.log(`📊 Total Active Inventory Items: ${inventoryItems.length}\n`);
    
    // Group by category
    const categories = {};
    inventoryItems.forEach(item => {
      if (!categories[item.category]) {
        categories[item.category] = [];
      }
      categories[item.category].push(item);
    });
    
    // Display by category
    Object.entries(categories).forEach(([category, items]) => {
      console.log(`\n🔹 ${category.toUpperCase()} (${items.length} items)`);
      console.log('='.repeat(60));
      
      items.forEach(item => {
        console.log(`📋 ${item.name}`);
        console.log(`   Code: ${item.itemCode}`);
        console.log(`   Quantity: ${item.quantity} units`);
        console.log(`   Cost: $${item.costPrice || 'N/A'}`);
        console.log(`   Price: $${item.sellingPrice || 'N/A'}`);
        if (item.location) console.log(`   Location: ${item.location}`);
        if (item.storageTemperature) console.log(`   Storage: ${item.storageTemperature}`);
        if (item.specimenType) console.log(`   Specimen: ${item.specimenType}`);
        if (item.testType) console.log(`   Test Type: ${item.testType}`);
        if (item.processTime) console.log(`   Process Time: ${item.processTime}`);
        console.log('');
      });
    });
    
    // Summary by category
    console.log('\n📈 INVENTORY SUMMARY BY CATEGORY');
    console.log('='.repeat(50));
    Object.entries(categories).forEach(([category, items]) => {
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = items.reduce((sum, item) => sum + (item.quantity * (item.costPrice || 0)), 0);
      console.log(`${category}: ${items.length} items, ${totalQuantity} units, $${totalValue.toFixed(2)} value`);
    });
    
    // Check for glucose test strips specifically
    console.log('\n🔍 GLUCOSE TEST STRIPS CHECK');
    console.log('='.repeat(40));
    const glucoseStrips = inventoryItems.filter(item => 
      item.name.toLowerCase().includes('glucose') && 
      item.name.toLowerCase().includes('strip')
    );
    
    if (glucoseStrips.length > 0) {
      console.log('✅ Glucose Test Strips found:');
      glucoseStrips.forEach(strip => {
        console.log(`   - ${strip.name} (${strip.category})`);
        console.log(`     Quantity: ${strip.quantity}`);
        console.log(`     Code: ${strip.itemCode}`);
      });
    } else {
      console.log('❌ No glucose test strips found in inventory');
    }
    
    console.log('\n✅ Inventory display completed!');
    
  } catch (error) {
    console.error('❌ Error fetching inventory:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the script
if (require.main === module) {
  showAllInventory()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = showAllInventory;
