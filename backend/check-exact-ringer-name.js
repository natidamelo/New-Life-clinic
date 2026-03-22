const mongoose = require('mongoose');
require('dotenv').config();

async function checkRingerName() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
  
  const InventoryItem = require('./models/InventoryItem');
  
  // Find all items with "ringer" in the name
  const items = await InventoryItem.find({
    name: { $regex: /ringer/i }
  });
  
  console.log('Items matching "ringer":');
  items.forEach(item => {
    console.log(`  - Name: "${item.name}"`);
    console.log(`    Category: ${item.category}`);
    console.log(`    _id: ${item._id}`);
    console.log(`    Quantity: ${item.quantity}`);
    console.log(`    isActive: ${item.isActive}`);
    console.log('');
  });
  
  await mongoose.disconnect();
}

checkRingerName();
