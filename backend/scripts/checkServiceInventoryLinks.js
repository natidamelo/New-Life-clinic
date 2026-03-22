const mongoose = require('mongoose');
const Service = require('../models/Service');
const InventoryItem = require('../models/InventoryItem');

async function checkServiceInventoryLinks() {
  try {
    console.log('🔍 Checking Service Inventory Links');
    console.log('==================================\n');

    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms');

    // Check services and their linked inventory items
    const services = await Service.find({ isActive: true }).populate('linkedInventoryItems');

    console.log(`📋 Found ${services.length} active services:`);

    services.forEach(service => {
      console.log(`\n${service.name} (${service.category})`);
      console.log(`  Price: $${service.price}`);

      if (service.linkedInventoryItems && service.linkedInventoryItems.length > 0) {
        console.log(`  ✅ Linked inventory items: ${service.linkedInventoryItems.length}`);
        service.linkedInventoryItems.forEach((item, index) => {
          console.log(`    ${index + 1}. ${item.name} (Qty: ${item.quantity})`);
        });
      } else {
        console.log(`  ❌ No linked inventory items`);
      }
    });

    // Check for inventory items that should be linked to services but aren't
    console.log('\n🔍 Inventory Items Without Service Links');
    console.log('=========================================');

    const inventoryItems = await InventoryItem.find({ isActive: true, category: 'service' });

    for (const item of inventoryItems) {
      const linkedServices = await Service.find({ linkedInventoryItems: item._id });

      if (linkedServices.length === 0) {
        console.log(`⚠️ Service inventory item not linked to any service:`);
        console.log(`  ${item.name} (ID: ${item._id}, Qty: ${item.quantity})`);
      }
    }

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkServiceInventoryLinks();
