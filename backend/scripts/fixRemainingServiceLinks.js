const mongoose = require('mongoose');
const Service = require('../models/Service');
const InventoryItem = require('../models/InventoryItem');

/**
 * Script to fix remaining service inventory links
 */

async function fixRemainingServiceLinks() {
  try {
    console.log('🔧 Fixing remaining service inventory links...');
    console.log('=============================================\n');

    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms');

    // Fix Urinalysis service link
    console.log('🔍 Fixing Urinalysis service link...');
    const urinalysisService = await Service.findOne({
      name: { $regex: /urinalysis/i },
      category: 'lab'
    }).populate('linkedInventoryItems');

    if (urinalysisService && urinalysisService.linkedInventoryItems) {
      const linkedItem = urinalysisService.linkedInventoryItems[0];
      console.log(`  Current: ${linkedItem.name} (${linkedItem.category})`);

      // Find the correct laboratory category item
      const labUrinalysisItem = await InventoryItem.findOne({
        name: { $regex: /urinalysis.*dipstick/i },
        category: 'laboratory',
        isActive: true
      });

      if (labUrinalysisItem) {
        console.log(`  ✅ Found lab item: ${labUrinalysisItem.name} (${labUrinalysisItem.category})`);
        urinalysisService.linkedInventoryItems = [labUrinalysisItem._id];
        await urinalysisService.save();
        console.log(`  🔗 Fixed Urinalysis service link`);
      } else {
        console.log(`  ❌ No laboratory Urinalysis item found`);
      }
    }

    // Create laboratory category item for Stool Exam if it doesn't exist
    console.log('\n🔍 Checking Stool Exam items...');
    const stoolExamLabItem = await InventoryItem.findOne({
      name: { $regex: /stool.*exam/i },
      category: 'laboratory',
      isActive: true
    });

    if (!stoolExamLabItem) {
      console.log('  📦 Creating laboratory category Stool Exam item...');

      const newStoolItem = new InventoryItem({
        itemCode: `LAB-STOOL-${Date.now()}`,
        name: 'Stool Exam (Routine)',
        description: 'Routine stool examination for diagnostic purposes',
        category: 'laboratory',
        unit: 'pieces',
        quantity: 100,
        costPrice: 40,
        sellingPrice: 100,
        minimumStockLevel: 10,
        reorderPoint: 20,
        isActive: true,
        createdBy: new mongoose.Types.ObjectId('68946a3f861ea34c0eee6ac3'),
        updatedBy: new mongoose.Types.ObjectId('68946a3f861ea34c0eee6ac3')
      });

      await newStoolItem.save();
      console.log(`  ✅ Created Stool Exam laboratory item: ${newStoolItem._id}`);

      // Link the stool exam service to this new item
      const stoolExamService = await Service.findOne({
        name: { $regex: /stool.*exam/i },
        category: 'lab'
      });

      if (stoolExamService) {
        stoolExamService.linkedInventoryItems = [newStoolItem._id];
        await stoolExamService.save();
        console.log(`  🔗 Linked Stool Exam service to laboratory item`);
      }
    } else {
      console.log(`  ✅ Stool Exam laboratory item already exists: ${stoolExamLabItem.name}`);

      // Link the stool exam service to this existing item
      const stoolExamService = await Service.findOne({
        name: { $regex: /stool.*exam/i },
        category: 'lab'
      });

      if (stoolExamService && (!stoolExamService.linkedInventoryItems || stoolExamService.linkedInventoryItems.length === 0)) {
        stoolExamService.linkedInventoryItems = [stoolExamLabItem._id];
        await stoolExamService.save();
        console.log(`  🔗 Linked Stool Exam service to existing laboratory item`);
      }
    }

    // Final verification
    console.log('\n🔍 Final verification');
    console.log('===================');

    const labServices = await Service.find({
      category: 'lab',
      isActive: true,
      linkedInventoryItems: { $exists: true, $ne: [] }
    }).populate('linkedInventoryItems');

    let correctLinks = 0;
    let incorrectLinks = 0;

    labServices.forEach(service => {
      if (service.linkedInventoryItems && service.linkedInventoryItems.length > 0) {
        const item = service.linkedInventoryItems[0];
        if (item.category === 'laboratory') {
          correctLinks++;
          console.log(`  ✅ ${service.name} → ${item.name} (${item.category})`);
        } else {
          incorrectLinks++;
          console.log(`  ❌ ${service.name} → ${item.name} (${item.category})`);
        }
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`  ✅ Correct laboratory links: ${correctLinks}`);
    console.log(`  ❌ Incorrect links: ${incorrectLinks}`);

    await mongoose.connection.close();

  } catch (error) {
    console.error('❌ Error fixing remaining service links:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  fixRemainingServiceLinks();
}

module.exports = { fixRemainingServiceLinks };
