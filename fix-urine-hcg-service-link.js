/**
 * Script to check and fix Urine HCG service link to inventory
 * 
 * This script will:
 * 1. Find the Urine HCG service
 * 2. Find the Urine HCG inventory item in Laboratory category
 * 3. Link them together if not already linked
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms';

async function fixUrineHCGServiceLink() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Service = require('./backend/models/Service');
    const InventoryItem = require('./backend/models/InventoryItem');

    // Step 1: Find the Urine HCG service
    console.log('\n🔍 Step 1: Finding Urine HCG service...');
    const service = await Service.findOne({
      name: { $regex: /urine.*hcg/i }
    });

    if (!service) {
      console.log('❌ Urine HCG service not found!');
      console.log('   Please create the service first in Service Management.');
      process.exit(1);
    }

    console.log(`✅ Found service: ${service.name}`);
    console.log(`   ID: ${service._id}`);
    console.log(`   Category: ${service.category}`);
    console.log(`   Currently linked items: ${service.linkedInventoryItems?.length || 0}`);

    // Step 2: Find the Urine HCG inventory item in Laboratory category
    console.log('\n🔍 Step 2: Finding Urine HCG inventory item in Laboratory category...');
    const inventoryItem = await InventoryItem.findOne({
      name: { $regex: /urine.*hcg/i },
      category: 'laboratory',
      isActive: true
    });

    if (!inventoryItem) {
      console.log('❌ Urine HCG inventory item not found in Laboratory category!');
      console.log('   Please check if it exists in Stock Management.');
      process.exit(1);
    }

    console.log(`✅ Found inventory item: ${inventoryItem.name}`);
    console.log(`   ID: ${inventoryItem._id}`);
    console.log(`   Category: ${inventoryItem.category}`);
    console.log(`   Quantity: ${inventoryItem.quantity}`);
    console.log(`   Active: ${inventoryItem.isActive}`);

    // Step 3: Check if already linked
    console.log('\n🔍 Step 3: Checking if service is linked to inventory item...');
    const isLinked = service.linkedInventoryItems && 
                     service.linkedInventoryItems.length > 0 &&
                     service.linkedInventoryItems[0].toString() === inventoryItem._id.toString();

    if (isLinked) {
      console.log('✅ Service is already linked to inventory item!');
      console.log('   If deduction is not working, check:');
      console.log('   1. Service ID is passed when ordering service');
      console.log('   2. Service is active');
      console.log('   3. Inventory item is active');
      process.exit(0);
    }

    // Step 4: Link them together
    console.log('\n🔗 Step 4: Linking service to inventory item...');
    service.linkedInventoryItems = [inventoryItem._id];
    await service.save();

    console.log('✅ Successfully linked service to inventory item!');
    console.log(`   Service: ${service.name}`);
    console.log(`   Inventory Item: ${inventoryItem.name}`);
    console.log(`   Inventory Quantity: ${inventoryItem.quantity}`);

    // Step 5: Verify the link
    console.log('\n✅ Step 5: Verifying the link...');
    const updatedService = await Service.findById(service._id);
    if (updatedService.linkedInventoryItems && 
        updatedService.linkedInventoryItems[0].toString() === inventoryItem._id.toString()) {
      console.log('✅ Link verified successfully!');
      console.log('\n🎉 Next steps:');
      console.log('   1. Order the Urine HCG service for a patient');
      console.log('   2. Check Stock Management - quantity should decrease by 1');
      console.log('   3. Check Inventory Transactions for the deduction record');
    } else {
      console.log('❌ Link verification failed!');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
fixUrineHCGServiceLink();






