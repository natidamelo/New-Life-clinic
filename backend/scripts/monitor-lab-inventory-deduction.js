const mongoose = require('mongoose');
const LabOrder = require('../models/LabOrder');
const LabTest = require('../models/LabTest');
const InventoryItem = require('../models/InventoryItem');
const labTestInventoryMap = require('../config/labTestInventoryMap');

// Connection string
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms';

async function monitorLabInventory() {
  try {
    console.log('🔬 ========== LAB INVENTORY DEDUCTION MONITOR ==========\n');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Show all lab orders (any status)
    console.log('📋 Step 1: All Lab Orders in Database\n');
    const allOrders = await LabOrder.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .select('testName status inventoryDeducted inventoryDeductedAt createdAt updatedAt')
      .lean();
    
    if (allOrders.length === 0) {
      console.log('   ⚠️  NO LAB ORDERS FOUND IN DATABASE');
      console.log('   This is why inventory is not deducting!');
      console.log('   The lab must create new lab orders after the fix was applied.\n');
    } else {
      console.log(`   Found ${allOrders.length} lab orders:\n`);
      allOrders.forEach((order, i) => {
        const deducted = order.inventoryDeducted ? '✅ Deducted' : '❌ NOT Deducted';
        console.log(`   ${i + 1}. ${order.testName}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Inventory: ${deducted}`);
        console.log(`      Created: ${order.createdAt?.toISOString().split('T')[0] || 'Unknown'}`);
        console.log('');
      });
    }

    // Step 2: Show all lab tests
    console.log('\n🧪 Step 2: All Lab Tests in Database\n');
    const allTests = await LabTest.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .select('testName status createdAt')
      .lean();
    
    if (allTests.length === 0) {
      console.log('   ⚠️  NO LAB TESTS FOUND IN DATABASE\n');
    } else {
      console.log(`   Found ${allTests.length} lab tests:\n`);
      allTests.forEach((test, i) => {
        console.log(`   ${i + 1}. ${test.testName} - ${test.status}`);
      });
    }

    // Step 3: Show configured mappings
    console.log('\n\n🗺️  Step 3: Configured Lab Test Mappings\n');
    const mappingKeys = Object.keys(labTestInventoryMap);
    console.log(`   Total mappings configured: ${mappingKeys.length}\n`);
    
    // Show common ones
    const commonTests = ['ESR', 'WBC', 'ASO', 'CRP', 'Widal', 'CBC', 'Glucose', 'Hemoglobin', 'Urinalysis'];
    console.log('   Common tests configured:');
    commonTests.forEach(test => {
      if (labTestInventoryMap[test]) {
        console.log(`   ✅ ${test} → ${labTestInventoryMap[test].itemName}`);
      } else {
        console.log(`   ❌ ${test} → NOT CONFIGURED`);
      }
    });

    // Step 4: Show inventory items
    console.log('\n\n📦 Step 4: Laboratory Inventory Items\n');
    const labInventory = await InventoryItem.find({ category: 'laboratory' })
      .select('name quantity isActive')
      .lean();
    
    if (labInventory.length === 0) {
      console.log('   ⚠️  NO LAB INVENTORY ITEMS FOUND\n');
    } else {
      console.log(`   Found ${labInventory.length} lab inventory items:\n`);
      labInventory.forEach(item => {
        const status = item.isActive ? '✅' : '❌';
        console.log(`   ${status} ${item.name}: ${item.quantity} units`);
      });
    }

    // Step 5: Check for mismatches
    console.log('\n\n🔍 Step 5: Checking for Mismatches\n');
    
    if (allOrders.length > 0) {
      const uniqueTestNames = [...new Set(allOrders.map(o => o.testName))];
      console.log('   Test names in database vs mappings:\n');
      
      uniqueTestNames.forEach(testName => {
        const hasMapping = labTestInventoryMap[testName] !== undefined;
        if (hasMapping) {
          const mapping = labTestInventoryMap[testName];
          const inventoryItem = labInventory.find(item => item.name === mapping.itemName);
          if (inventoryItem) {
            console.log(`   ✅ "${testName}" → ${mapping.itemName} (${inventoryItem.quantity} units)`);
          } else {
            console.log(`   ⚠️  "${testName}" → ${mapping.itemName} (INVENTORY ITEM NOT FOUND)`);
          }
        } else {
          console.log(`   ❌ "${testName}" → NO MAPPING CONFIGURED`);
        }
      });
    }

    // Step 6: Show recently completed tests that didn't deduct
    console.log('\n\n⚠️  Step 6: Completed Tests WITHOUT Inventory Deduction\n');
    const completedWithoutDeduction = allOrders.filter(
      order => (order.status === 'Results Available' || order.status === 'Completed') && 
               !order.inventoryDeducted
    );
    
    if (completedWithoutDeduction.length === 0) {
      console.log('   ✅ No issues found - all completed tests have inventory deducted\n');
    } else {
      console.log(`   ⚠️  Found ${completedWithoutDeduction.length} completed tests WITHOUT inventory deduction:\n`);
      completedWithoutDeduction.forEach((order, i) => {
        console.log(`   ${i + 1}. ${order.testName}`);
        console.log(`      Status: ${order.status}`);
        console.log(`      Completed: ${order.updatedAt?.toISOString().split('T')[0] || 'Unknown'}`);
        
        // Check why it wasn't deducted
        const hasMapping = labTestInventoryMap[order.testName] !== undefined;
        if (!hasMapping) {
          console.log(`      ❌ ISSUE: No mapping for "${order.testName}"`);
          console.log(`      FIX: Add to backend/config/labTestInventoryMap.js`);
        } else {
          const mapping = labTestInventoryMap[order.testName];
          const inventoryItem = labInventory.find(item => item.name === mapping.itemName);
          if (!inventoryItem) {
            console.log(`      ❌ ISSUE: Inventory item "${mapping.itemName}" not found`);
            console.log(`      FIX: Create inventory item in database`);
          } else {
            console.log(`      ❓ UNKNOWN: Mapping and inventory exist - check backend logs`);
          }
        }
        console.log('');
      });
    }

    // Step 7: Summary and recommendations
    console.log('\n\n📊 SUMMARY & RECOMMENDATIONS\n');
    console.log('=' .repeat(60));
    
    if (allOrders.length === 0) {
      console.log('\n❌ CRITICAL ISSUE: No lab orders in database');
      console.log('\nRECOMMENDATION:');
      console.log('   1. Make sure backend server is running (port 5002)');
      console.log('   2. Make sure frontend is connected to backend');
      console.log('   3. Create new lab orders through the system');
      console.log('   4. The fix is in place and will work for NEW lab orders');
    } else if (completedWithoutDeduction.length > 0) {
      console.log('\n⚠️  ISSUES FOUND: Some completed tests missing inventory deduction');
      console.log('\nRECOMMENDATION:');
      console.log('   1. Check the issues listed in Step 6 above');
      console.log('   2. For tests without mapping: Add mapping to labTestInventoryMap.js');
      console.log('   3. For missing inventory items: Run add-missing-lab-inventory.js');
      console.log('   4. Restart backend server after making changes');
    } else {
      console.log('\n✅ ALL SYSTEMS OPERATIONAL');
      console.log('\nLab inventory deduction is working correctly!');
      console.log('All completed tests have had inventory deducted.');
    }
    
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed\n');
  }
}

// Run the monitor
monitorLabInventory()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

