const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const InventoryItem = require('../models/InventoryItem');
const User = require('../models/User');

async function addGlucoseTestStrips() {
  try {
    console.log('🧪 Adding Glucose Test Strips to Inventory...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to database\n');
    
    // Get a user for createdBy field
    const existingUser = await User.findOne();
    if (!existingUser) {
      throw new Error('No users found in database. Please create a user first.');
    }
    
    console.log('📊 Checking existing Glucose Test Strips...');
    
    // Check if glucose test strips already exist in laboratory category
    const existingLabStrips = await InventoryItem.findOne({
      name: 'Glucose Test Strips',
      category: 'laboratory'
    });
    
    if (existingLabStrips) {
      console.log(`✅ Glucose Test Strips already exist in laboratory category (Qty: ${existingLabStrips.quantity})`);
      return;
    }
    
    // Check if they exist in service category
    const existingServiceStrips = await InventoryItem.findOne({
      name: 'Glucose Test Strips',
      category: 'service'
    });
    
    if (existingServiceStrips) {
      console.log(`📋 Found in service category (Qty: ${existingServiceStrips.quantity}). Creating laboratory version...`);
    }
    
    console.log('\n🔧 Creating Glucose Test Strips in laboratory category...');
    
    // Create glucose test strips in laboratory category
    const glucoseTestStrips = new InventoryItem({
      itemCode: 'LAB-GLU-STRIP-001',
      name: 'Glucose Test Strips',
      description: 'Glucose test strips for blood glucose monitoring',
      category: 'laboratory',
      unit: 'strips',
      quantity: 100, // Initial stock
      minimumStockLevel: 10,
      reorderPoint: 20,
      costPrice: 2.50, // Cost per strip
      sellingPrice: 5.00, // Selling price per strip
      location: 'Laboratory',
      storageTemperature: 'Room temperature',
      specimenType: 'Whole Blood (Finger Prick)',
      testType: 'Blood Glucose Test',
      processTime: '1-2 minutes',
      manufacturer: 'Various',
      isActive: true,
      createdBy: existingUser._id,
      notes: 'Glucose test strips for point-of-care blood glucose testing'
    });
    
    await glucoseTestStrips.save();
    console.log(`✅ Created Glucose Test Strips in laboratory category:`);
    console.log(`   - Item Code: ${glucoseTestStrips.itemCode}`);
    console.log(`   - Quantity: ${glucoseTestStrips.quantity} strips`);
    console.log(`   - Cost Price: $${glucoseTestStrips.costPrice}`);
    console.log(`   - Selling Price: $${glucoseTestStrips.sellingPrice}`);
    console.log(`   - Storage: ${glucoseTestStrips.storageTemperature}`);
    
    console.log('\n📋 Updating lab test mapping...');
    
    // The mapping in labTestInventoryMap.js should already include glucose test strips
    // Let's verify the current mapping
    const labTestMap = require('../config/labTestInventoryMap');
    const glucoseStripMappings = Object.entries(labTestMap).filter(([key, value]) => 
      value.itemName === 'Glucose Test Strips'
    );
    
    console.log(`✅ Found ${glucoseStripMappings.length} glucose strip mappings in labTestInventoryMap.js`);
    glucoseStripMappings.forEach(([key, value]) => {
      console.log(`   - "${key}" -> ${value.itemName} (${value.category})`);
    });
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Glucose Test Strips are now available in laboratory category');
    console.log('2. They should appear in the lab test ordering interface');
    console.log('3. The system will automatically deduct inventory when tests are ordered');
    console.log('4. Consider adding them to the frontend lab test interface if not already visible');
    
    console.log('\n✅ Glucose Test Strips setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error adding Glucose Test Strips:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the script
if (require.main === module) {
  addGlucoseTestStrips()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = addGlucoseTestStrips;
