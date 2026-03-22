const mongoose = require('mongoose');
require('dotenv').config();

async function checkInventory() {
  try {
    console.log('🔍 Checking current inventory items...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Import models after connection
    const InventoryItem = require('./models/InventoryItem');

    // Get all active inventory items
    const items = await InventoryItem.find({ isActive: true });

    console.log(`\n📦 Found ${items.length} active inventory items:`);
    items.forEach(item => {
      console.log(`  - ${item.name} (Qty: ${item.quantity}, ID: ${item._id})`);
    });

    // Check specifically for glucose items
    const glucoseItems = await InventoryItem.find({
      name: { $regex: /glucose/i },
      isActive: true
    });

    console.log(`\n🩸 Found ${glucoseItems.length} glucose-related items:`);
    glucoseItems.forEach(item => {
      console.log(`  - ${item.name} (Qty: ${item.quantity}, ID: ${item._id})`);
    });

    // Check lab test mapping
    console.log('\n🔬 Checking lab test inventory mapping...');
    const labTestInventoryMap = require('./config/labTestInventoryMap');

    console.log('Available lab test mappings:');
    Object.keys(labTestInventoryMap).slice(0, 10).forEach(testName => {
      const mapping = labTestInventoryMap[testName];
      console.log(`  - "${testName}" → ${mapping.itemName} (qty: ${mapping.quantity})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Check completed');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkInventory();
