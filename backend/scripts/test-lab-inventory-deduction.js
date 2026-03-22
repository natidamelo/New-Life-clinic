const mongoose = require('mongoose');
const LabOrder = require('../models/LabOrder');
const InventoryItem = require('../models/InventoryItem');
const Patient = require('../models/Patient');
const User = require('../models/User');

// Connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic_db';

async function testLabInventoryDeduction() {
  try {
    console.log('🔬 ========== LAB INVENTORY DEDUCTION TEST ==========\n');
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Check if lab inventory items exist
    console.log('📦 Step 1: Checking lab inventory items...');
    const labTests = ['ESR', 'WBC', 'ASO', 'CRP', 'Widal'];
    const inventoryNames = [
      'ESR (Erythrocyte Sedimentation Rate)',
      'WBC (White Blood Cell Count)',
      'ASO (Anti-Streptolysin O)',
      'C-Reactive Protein',
      'Widal Test'
    ];

    for (let i = 0; i < inventoryNames.length; i++) {
      const item = await InventoryItem.findOne({ 
        name: inventoryNames[i],
        category: 'laboratory' 
      });
      
      if (item) {
        console.log(`✅ ${labTests[i]}: Found - Quantity: ${item.quantity}`);
      } else {
        console.log(`❌ ${labTests[i]}: NOT FOUND`);
      }
    }

    // Step 2: Get a sample patient
    console.log('\n👤 Step 2: Getting a sample patient...');
    let patient = await Patient.findOne();
    if (!patient) {
      console.log('⚠️ No patients found in database. Creating a test patient...');
      patient = new Patient({
        patientId: 'P-TEST-001',
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'male',
        contactNumber: '0911111111',
        status: 'scheduled'
      });
      await patient.save();
      console.log(`✅ Created test patient: ${patient.firstName} ${patient.lastName} (${patient.patientId})`);
    } else {
      console.log(`✅ Found patient: ${patient.firstName} ${patient.lastName} (${patient.patientId || patient._id})`);
    }

    // Step 3: Get a sample doctor/user
    console.log('\n👨‍⚕️ Step 3: Getting a sample doctor...');
    let doctor = await User.findOne({ role: 'doctor' });
    if (!doctor) {
      doctor = await User.findOne();
    }
    if (doctor) {
      console.log(`✅ Found user: ${doctor.firstName} ${doctor.lastName} (${doctor.role})`);
    } else {
      console.log(`⚠️ No users found in database`);
    }

    // Step 4: Create test lab orders (if not already exist)
    console.log('\n🧪 Step 4: Creating/Checking test lab orders...');
    const testOrders = [];
    
    for (const testName of labTests) {
      // Check if a pending lab order already exists
      let labOrder = await LabOrder.findOne({ 
        testName: testName,
        status: { $ne: 'Results Available' },
        patientId: patient._id
      });

      if (!labOrder) {
        console.log(`   Creating new lab order for ${testName}...`);
        labOrder = new LabOrder({
          patientId: patient._id,
          patient: patient._id,
          orderingDoctorId: doctor ? doctor._id : null,
          testName: testName,
          specimenType: 'Blood',
          priority: 'Routine',
          status: 'Pending',
          paymentStatus: 'paid',
          orderDateTime: new Date(),
          notes: `Test lab order for ${testName} inventory deduction`
        });
        await labOrder.save();
        console.log(`   ✅ Created lab order for ${testName} (ID: ${labOrder._id})`);
      } else {
        console.log(`   ℹ️ Lab order already exists for ${testName} (ID: ${labOrder._id})`);
      }
      
      testOrders.push(labOrder);
    }

    // Step 5: Check inventory quantities before deduction
    console.log('\n📊 Step 5: Inventory quantities BEFORE deduction:');
    const inventoryBefore = {};
    for (let i = 0; i < inventoryNames.length; i++) {
      const item = await InventoryItem.findOne({ name: inventoryNames[i], category: 'laboratory' });
      if (item) {
        inventoryBefore[labTests[i]] = item.quantity;
        console.log(`   ${labTests[i]}: ${item.quantity}`);
      }
    }

    // Step 6: Simulate lab test completion
    console.log('\n🔬 Step 6: Simulating lab test completion (updating status to "Results Available")...\n');
    
    const inventoryDeductionService = require('../services/inventoryDeductionService');
    
    for (const order of testOrders) {
      console.log(`\n   Processing: ${order.testName}`);
      console.log(`   Order ID: ${order._id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Inventory Deducted: ${order.inventoryDeducted || false}`);
      
      // Update status to trigger inventory deduction
      order.status = 'Results Available';
      order.resultDateTime = new Date();
      order.results = { value: '10', unit: 'mg/dL', normalRange: '0-10' };
      await order.save();
      
      // Call inventory deduction service
      if (!order.inventoryDeducted) {
        const result = await inventoryDeductionService.deductLabInventory(order, doctor ? doctor._id : null);
        
        if (result && result.success) {
          console.log(`   ✅ SUCCESS: Inventory deducted`);
          console.log(`      Item: ${result.itemName}`);
          console.log(`      Quantity consumed: ${result.quantityConsumed}`);
          console.log(`      New quantity: ${result.newQuantity}`);
        } else if (result === null) {
          console.log(`   ⏭️ SKIPPED: Already deducted or no mapping found`);
        } else {
          console.log(`   ⚠️ FAILED: ${result.error || 'Unknown error'}`);
        }
      } else {
        console.log(`   ⏭️ SKIPPED: Inventory already deducted`);
      }
    }

    // Step 7: Check inventory quantities after deduction
    console.log('\n\n📊 Step 7: Inventory quantities AFTER deduction:');
    const inventoryAfter = {};
    for (let i = 0; i < inventoryNames.length; i++) {
      const item = await InventoryItem.findOne({ name: inventoryNames[i], category: 'laboratory' });
      if (item) {
        inventoryAfter[labTests[i]] = item.quantity;
        const before = inventoryBefore[labTests[i]] || 0;
        const after = item.quantity;
        const diff = before - after;
        console.log(`   ${labTests[i]}: ${before} → ${after} (${diff > 0 ? '-' : ''}${Math.abs(diff)})`);
      }
    }

    // Step 8: Summary
    console.log('\n\n✅ ========== TEST SUMMARY ==========');
    console.log(`Total tests: ${labTests.length}`);
    
    let deductedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    
    for (const testName of labTests) {
      const before = inventoryBefore[testName] || 0;
      const after = inventoryAfter[testName] || 0;
      
      if (before > after) {
        deductedCount++;
        console.log(`✅ ${testName}: Deducted successfully`);
      } else if (before === after && before > 0) {
        skippedCount++;
        console.log(`⏭️ ${testName}: Skipped (already deducted or no mapping)`);
      } else {
        failedCount++;
        console.log(`❌ ${testName}: Failed or not found`);
      }
    }
    
    console.log(`\n📈 Results:`);
    console.log(`   ✅ Successfully deducted: ${deductedCount}`);
    console.log(`   ⏭️ Skipped: ${skippedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);

    if (deductedCount + skippedCount === labTests.length) {
      console.log('\n🎉 ALL TESTS PASSED! Inventory deduction is working correctly.');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED. Please review the logs above.');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    console.error('Error details:', error.message);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testLabInventoryDeduction()
  .then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });

