/**
 * Check all inventory items to find the correct Normal Saline item
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

async function checkInventoryItems() {
  try {
    console.log('🔍 Checking all inventory items...\n');
    
    const InventoryItem = require('./models/InventoryItem');
    
    // Get all medication items
    const medicationItems = await InventoryItem.find({
      category: { $in: ['medication', 'service'] },
      isActive: true
    }).sort({ name: 1 });
    
    console.log(`📦 Found ${medicationItems.length} medication/service items:\n`);
    
    medicationItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}`);
      console.log(`   - Category: ${item.category}`);
      console.log(`   - Quantity: ${item.quantity}`);
      console.log(`   - Cost Price: ${item.costPrice}`);
      console.log(`   - Selling Price: ${item.sellingPrice}`);
      console.log(`   - ID: ${item._id}`);
      console.log('');
    });
    
    // Specifically look for saline-related items
    console.log('🔍 Searching for saline-related items...\n');
    const salineItems = await InventoryItem.find({
      $or: [
        { name: { $regex: /saline/i } },
        { name: { $regex: /normal/i } },
        { name: { $regex: /nacl/i } },
        { name: { $regex: /sodium chloride/i } }
      ],
      isActive: true
    });
    
    if (salineItems.length > 0) {
      console.log(`✅ Found ${salineItems.length} saline-related items:`);
      salineItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name} (${item.category}) - Qty: ${item.quantity}`);
      });
    } else {
      console.log('❌ No saline-related items found');
    }
    
  } catch (error) {
    console.error('❌ Error checking inventory items:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the check
if (require.main === module) {
  connectDB().then(() => {
    checkInventoryItems();
  });
}

module.exports = { checkInventoryItems };
