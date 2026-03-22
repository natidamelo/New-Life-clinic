const mongoose = require('mongoose');
const Service = require('../models/Service');
const InventoryItem = require('../models/InventoryItem');
require('dotenv').config();

async function migrateServices() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    // Find all services in InventoryItem collection
    const inventoryServices = await InventoryItem.find({ category: 'service' });
    console.log(`🔍 Found ${inventoryServices.length} services in InventoryItem collection`);

    if (inventoryServices.length === 0) {
      console.log('✅ No services to migrate');
      return;
    }

    // Get existing services to avoid duplicates
    const existingServices = await Service.find({});
    const existingServiceNames = new Set(existingServices.map(s => s.name.toLowerCase()));

    let migratedCount = 0;
    let skippedCount = 0;

    for (const item of inventoryServices) {
      // Check if service already exists in Service collection
      if (existingServiceNames.has(item.name.toLowerCase())) {
        console.log(`⏭️  Skipping "${item.name}" - already exists in Service collection`);
        skippedCount++;
        continue;
      }

      // Map category from InventoryItem to Service collection
      const categoryMap = {
        'service': 'other', // Map 'service' to 'other' since 'service' is not valid in Service model
        'consultation': 'consultation',
        'procedure': 'procedure',
        'lab': 'lab',
        'imaging': 'imaging',
        'injection': 'injection',
        'ultrasound': 'ultrasound',
        'blood_test': 'blood_test',
        'rbs': 'rbs',
        'vital_signs': 'vital_signs'
      };

      // Create new service in Service collection
      const newService = new Service({
        name: item.name,
        code: item.itemCode,
        category: categoryMap[item.category] || 'other',
        price: item.unitPrice || 0,
        unit: item.unit,
        description: item.description,
        isActive: item.isActive !== false,
        // Map additional fields if needed
        serviceDuration: item.serviceDuration,
        serviceRequirements: item.serviceRequirements,
        serviceEquipment: item.serviceEquipment,
        serviceStaffRequired: item.serviceStaffRequired,
        servicePreparation: item.servicePreparation,
        serviceFollowUp: item.serviceFollowUp,
        serviceContraindications: item.serviceContraindications,
        serviceIndications: item.serviceIndications,
        serviceStorageTemperature: item.serviceStorageTemperature,
        serviceSpecimenType: item.serviceSpecimenType,
        serviceTestType: item.serviceTestType,
        // Preserve timestamps
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      });

      await newService.save();
      console.log(`✅ Migrated "${item.name}" to Service collection`);
      migratedCount++;
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   - Total services found: ${inventoryServices.length}`);
    console.log(`   - Successfully migrated: ${migratedCount}`);
    console.log(`   - Skipped (duplicates): ${skippedCount}`);

    // Optional: Remove services from InventoryItem collection after successful migration
    if (migratedCount > 0) {
      console.log('\n🗑️  Removing services from InventoryItem collection...');
      await InventoryItem.deleteMany({ category: 'service' });
      console.log('✅ Services removed from InventoryItem collection');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateServices()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateServices;
