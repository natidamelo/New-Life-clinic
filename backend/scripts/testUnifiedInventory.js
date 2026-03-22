const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const LabOrder = require('../models/LabOrder');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { deductLabInventory } = require('../services/inventoryDeductionService');

async function testUnifiedInventory() {
  try {
    console.log('🧪 Testing Unified Inventory Solution...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to database\n');
    
    // Check current inventory
    console.log('📊 Current Inventory Status:');
    const serviceItem = await InventoryItem.findOne({ 
      name: 'Glucose Test Strips', 
      category: 'service' 
    });
    const labItem = await InventoryItem.findOne({ 
      name: 'Glucose Test Strips', 
      category: 'laboratory' 
    });
    
    if (serviceItem) {
      console.log(`   Service Category: ${serviceItem.currentQuantity} strips`);
    } else {
      console.log('   Service Category: Not found');
    }
    
    if (labItem) {
      console.log(`   Laboratory Category: ${labItem.currentQuantity} strips`);
    } else {
      console.log('   Laboratory Category: Not found');
    }
    
    // Store initial quantities for comparison
    const initialServiceQuantity = serviceItem ? serviceItem.currentQuantity : 0;
    const initialLabQuantity = labItem ? labItem.currentQuantity : 0;
    
    console.log('\n🔬 Creating test lab order...');
    
    // Get existing patient and user IDs
    const existingPatient = await Patient.findOne();
    const existingUser = await User.findOne();
    
    if (!existingPatient || !existingUser) {
      throw new Error('No existing patients or users found in database');
    }
    
    // Create a test lab order
    const testLabOrder = new LabOrder({
      patientId: existingPatient._id,
      orderingDoctorId: existingUser._id,
      source: 'reception', // Service order
      createdBy: existingUser._id,
      testName: 'Glucose Test Strips',
      panelName: 'Glucose Test Strips',
      specimenType: 'Blood',
      orderDateTime: new Date(),
      status: 'Ordered',
      paymentStatus: 'paid',
      totalPrice: 100,
      notes: 'Test order for unified inventory verification',
      priority: 'Routine',
      sentToDoctor: false,
      inventoryDeducted: false
    });
    
    await testLabOrder.save();
    console.log(`✅ Test lab order created: ${testLabOrder._id}`);
    
    // Update status to completed to trigger inventory deduction
    console.log('\n🔄 Updating lab order to completed...');
    testLabOrder.status = 'Results Available';
    testLabOrder.resultDateTime = new Date();
    testLabOrder.results = {
      results: '95',
      normalRange: '70-140 mg/dL'
    };
    // Ensure inventoryDeducted is false for testing
    testLabOrder.inventoryDeducted = false;
    await testLabOrder.save();
    
    console.log('✅ Lab order marked as completed');
    
    // Call inventory deduction
    console.log('\n💰 Testing inventory deduction...');
    console.log('🔍 Lab Order Details:');
    console.log('   Test Name:', testLabOrder.testName);
    console.log('   Panel Name:', testLabOrder.panelName);
    console.log('   Status:', testLabOrder.status);
    
    const deductionResult = await deductLabInventory(testLabOrder, existingUser._id.toString());
    
    console.log('📊 Deduction result:', deductionResult);
    
    // Check inventory after deduction
    console.log('\n📊 Inventory After Deduction:');
    const serviceItemAfter = await InventoryItem.findOne({ 
      name: 'Glucose Test Strips', 
      category: 'service' 
    });
    const labItemAfter = await InventoryItem.findOne({ 
      name: 'Glucose Test Strips', 
      category: 'laboratory' 
    });
    
    if (serviceItemAfter) {
      console.log(`   Service Category: ${serviceItemAfter.currentQuantity} strips`);
      console.log(`   Change: ${initialServiceQuantity} → ${serviceItemAfter.currentQuantity} (${serviceItemAfter.currentQuantity - initialServiceQuantity})`);
    } else {
      console.log('   Service Category: Not found');
    }
    
    if (labItemAfter) {
      console.log(`   Laboratory Category: ${labItemAfter.currentQuantity} strips`);
      console.log(`   Change: ${initialLabQuantity} → ${labItemAfter.currentQuantity} (${labItemAfter.currentQuantity - initialLabQuantity})`);
    } else {
      console.log('   Laboratory Category: Not found');
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
testUnifiedInventory();
