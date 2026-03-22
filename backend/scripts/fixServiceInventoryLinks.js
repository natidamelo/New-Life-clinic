const mongoose = require('mongoose');
const Service = require('../models/Service');
const InventoryItem = require('../models/InventoryItem');

/**
 * Script to fix service inventory links
 * This script will:
 * 1. Find lab services that are linked to service category inventory items
 * 2. Find the corresponding laboratory category inventory items
 * 3. Relink the services to the correct laboratory items
 */

async function fixServiceInventoryLinks() {
  try {
    console.log('🔧 Starting service inventory link fix...');
    console.log('=====================================\n');

    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms');

    // Find all lab services
    const labServices = await Service.find({
      category: 'lab',
      isActive: true,
      linkedInventoryItems: { $exists: true, $ne: [] }
    }).populate('linkedInventoryItems');

    console.log(`📋 Found ${labServices.length} lab services with linked inventory items`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;

    for (const service of labServices) {
      console.log(`\n🔍 Processing lab service: ${service.name}`);

      if (!service.linkedInventoryItems || service.linkedInventoryItems.length === 0) {
        console.log(`  ⏭️ No linked inventory items`);
        continue;
      }

      const linkedItem = service.linkedInventoryItems[0];
      console.log(`  📦 Currently linked to: ${linkedItem.name} (${linkedItem.category})`);

      // Check if it's linked to a service category item
      if (linkedItem.category === 'service') {
        console.log(`  ⚠️ Currently linked to SERVICE category item`);

        // Find the corresponding laboratory category item
        const labItem = await InventoryItem.findOne({
          name: { $regex: new RegExp(service.name, 'i') },
          category: 'laboratory',
          isActive: true
        });

        if (labItem) {
          console.log(`  ✅ Found laboratory category item: ${labItem.name} (ID: ${labItem._id})`);

          // Update the service to link to the laboratory item instead
          service.linkedInventoryItems = [labItem._id];
          await service.save();

          console.log(`  🔗 Successfully relinked service to laboratory item`);
          fixedCount++;
        } else {
          console.log(`  ❌ No laboratory category item found for: ${service.name}`);
        }
      } else if (linkedItem.category === 'laboratory') {
        console.log(`  ✅ Already correctly linked to laboratory category item`);
        alreadyCorrectCount++;
      } else {
        console.log(`  ❓ Linked to ${linkedItem.category} category item`);
      }
    }

    console.log(`\n🎉 Service inventory link fix completed!`);
    console.log(`  ✅ Fixed: ${fixedCount} services`);
    console.log(`  ✅ Already correct: ${alreadyCorrectCount} services`);

    // Check for any remaining issues
    console.log('\n🔍 Final verification');
    console.log('===================');

    const remainingServiceLinks = await Service.find({
      category: 'lab',
      isActive: true,
      linkedInventoryItems: { $exists: true, $ne: [] }
    }).populate('linkedInventoryItems');

    let correctLinks = 0;
    let incorrectLinks = 0;

    remainingServiceLinks.forEach(service => {
      if (service.linkedInventoryItems && service.linkedInventoryItems.length > 0) {
        const item = service.linkedInventoryItems[0];
        if (item.category === 'laboratory') {
          correctLinks++;
        } else {
          incorrectLinks++;
          console.log(`  ❌ Still incorrect: ${service.name} → ${item.name} (${item.category})`);
        }
      }
    });

    console.log(`  ✅ Correct laboratory links: ${correctLinks}`);
    console.log(`  ❌ Incorrect links: ${incorrectLinks}`);

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error fixing service inventory links:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  fixServiceInventoryLinks();
}

module.exports = { fixServiceInventoryLinks };