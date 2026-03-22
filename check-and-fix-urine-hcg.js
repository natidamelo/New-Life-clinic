/**
 * Quick script to check and fix Urine HCG service link
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

async function fixLink() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const Service = require('./backend/models/Service');
    const InventoryItem = require('./backend/models/InventoryItem');

    // Find service
    const service = await Service.findOne({ name: { $regex: /urine.*hcg/i } });
    if (!service) {
      console.log('❌ Service not found');
      process.exit(1);
    }
    console.log(`✅ Found service: ${service.name} (ID: ${service._id})`);

    // Find inventory item
    const invItem = await InventoryItem.findOne({ 
      name: { $regex: /urine.*hcg/i },
      category: 'laboratory',
      isActive: true
    });
    if (!invItem) {
      console.log('❌ Inventory item not found');
      process.exit(1);
    }
    console.log(`✅ Found inventory: ${invItem.name} (Qty: ${invItem.quantity})`);

    // Check if linked
    const isLinked = service.linkedInventoryItems?.length > 0 && 
                     service.linkedInventoryItems[0].toString() === invItem._id.toString();
    
    if (isLinked) {
      console.log('✅ Already linked!');
    } else {
      console.log('🔗 Linking...');
      service.linkedInventoryItems = [invItem._id];
      await service.save();
      console.log('✅ Linked successfully!');
    }

    await mongoose.connection.close();
    console.log('\n✅ Done! Now try ordering the service again.');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixLink();






