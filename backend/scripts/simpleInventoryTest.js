const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const LabOrder = require('../models/LabOrder');
const InventoryItem = require('../models/InventoryItem');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { deductLabInventory } = require('../services/inventoryDeductionService');

async function simpleInventoryTest() {
  try {
    console.log('🧪 Simple Inventory Test...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to database\n');
    
    // Check current inventory
    console.log('📊 Current Inventory Status:');
    const serviceItem = await InventoryItem.findOne({ 
      name: 'Glucose Test Strips', 
      category: 'service' 
    });
    
    if (serviceItem) {
      console.log(`   Service Category: ${serviceItem.currentQuantity} strips`);
    } else {
      console.log('   Service Category: Not found');
    }
    
    // Get existing patient and user IDs
    const existingPatient = await Patient.findOne();
    const existingUser = await User.findOne();
    
    if (!existingPatient || !existingUser) {
      throw new Error('No existing patients or users found in database');
    }
    
    console.log('\n🔬 Creating test lab order...');
    
    // Create a test lab order with inventoryDeducted explicitly set to false
    const testLabOrder = new LabOrder({
      patientId: existingPatient._id,
      orderingDoctorId: existingUser._id,
      source: 'reception', // Service order
      createdBy: existingUser._id,
      testName: 'Glucose Test Strips',
      panelName: 'Glucose Test Strips',
      specimenType: 'Blood',
      orderDateTime: new Date(),
      status: 'Results Available',
      paymentStatus: 'paid',
      totalPrice: 100,
      notes: 'Test order for unified inventory verification',
      priority: 'Routine',
      sentToDoctor: false,
      inventoryDeducted: false, // Explicitly set to false
      resultDateTime: new Date(),
      results: {
        results: '95',
        normalRange: '70-140 mg/dL'
      }
    });
    
    await testLabOrder.save();
    console.log(`✅ Test lab order created: ${testLabOrder._id}`);
    console.log(`   Inventory Deducted: ${testLabOrder.inventoryDeducted}`);
    
    // Verify the lab order was saved correctly
    const savedLabOrder = await LabOrder.findById(testLabOrder._id);
    console.log(`✅ Lab order verified: inventoryDeducted = ${savedLabOrder.inventoryDeducted}`);
    
    // Call inventory deduction
    console.log('\n💰 Testing inventory deduction...');
    const deductionResult = await deductLabInventory(testLabOrder, existingUser._id.toString());
    
    console.log('📊 Deduction result:', deductionResult);
    
    // Check inventory after deduction
    console.log('\n📊 Inventory After Deduction:');
    const serviceItemAfter = await InventoryItem.findOne({ 
      name: 'Glucose Test Strips', 
      category: 'service' 
    });
    
    if (serviceItemAfter) {
      console.log(`   Service Category: ${serviceItemAfter.currentQuantity} strips`);
      if (serviceItem) {
        console.log(`   Change: ${serviceItem.currentQuantity} → ${serviceItemAfter.currentQuantity} (${serviceItemAfter.currentQuantity - serviceItem.currentQuantity})`);
      }
    } else {
      console.log('   Service Category: Not found');
    }
    
    // Check if lab order was marked as deducted
    const updatedLabOrder = await LabOrder.findById(testLabOrder._id);
    console.log(`\n🏷️ Lab Order Status:`);
    console.log(`   Inventory Deducted: ${updatedLabOrder.inventoryDeducted}`);
    console.log(`   Deducted At: ${updatedLabOrder.inventoryDeductedAt}`);
    console.log(`   Deducted By: ${updatedLabOrder.inventoryDeductedBy}`);
    
    // Clean up - delete test lab order
    console.log('\n🧹 Cleaning up test data...');
    await LabOrder.findByIdAndDelete(testLabOrder._id);
    console.log('✅ Test lab order deleted');
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Database connection closed');
  }
}

// Run the test
simpleInventoryTest();
