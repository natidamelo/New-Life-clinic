const mongoose = require('mongoose');
const Service = require('./models/Service');
const InventoryItem = require('./models/InventoryItem');
require('dotenv').config();

async function checkServices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    
    // Check services in Service collection
    const services = await Service.find({}).sort({ name: 1 });
    console.log('📋 Services in Service collection:', services.length);
    services.forEach(s => console.log('  -', s.name, '(' + s.category + ')'));
    
    // Check services in InventoryItem collection
    const inventoryServices = await InventoryItem.find({ category: 'service' }).sort({ name: 1 });
    console.log('\n📦 Services in InventoryItem collection:', inventoryServices.length);
    inventoryServices.forEach(s => console.log('  -', s.name, '(' + s.category + ')'));
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkServices();