const mongoose = require('mongoose');
require('dotenv').config();

async function checkIVFluidCategories() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
  
  const InventoryItem = require('./models/InventoryItem');
  
  // Find all IV fluids
  const ivFluids = await InventoryItem.find({
    $or: [
      { name: { $regex: /saline/i } },
      { name: { $regex: /ringer/i } },
      { name: { $regex: /lactate/i } },
      { name: { $regex: /dextrose/i } }
    ]
  });
  
  console.log('IV Fluids in database:');
  console.log('='.repeat(80));
  ivFluids.forEach(item => {
    console.log(`Name: ${item.name}`);
    console.log(`Category: ${item.category}`);
    console.log(`Quantity: ${item.quantity}`);
    console.log(`Is Active: ${item.isActive}`);
    console.log(`ID: ${item._id}`);
    console.log('-'.repeat(80));
  });
  
  // Check if we need to update categories
  const needsUpdate = ivFluids.filter(item => item.category !== 'medication');
  
  if (needsUpdate.length > 0) {
    console.log(`\n⚠️ Found ${needsUpdate.length} IV fluids NOT in "medication" category:`);
    needsUpdate.forEach(item => {
      console.log(`   - ${item.name}: Currently "${item.category}"`);
    });
    console.log('\n💡 These should be updated to category "medication" for proper filtering');
  } else {
    console.log('\n✅ All IV fluids are correctly categorized as "medication"');
  }
  
  await mongoose.disconnect();
}

checkIVFluidCategories();
