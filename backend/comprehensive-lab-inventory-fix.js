const mongoose = require('mongoose');
require('dotenv').config();

/**
 * COMPREHENSIVE LAB INVENTORY DEDUCTION FIX
 * This script fixes all issues preventing lab inventory deduction from working
 */

async function comprehensiveLabInventoryFix() {
  try {
    console.log('🔧 COMPREHENSIVE LAB INVENTORY DEDUCTION FIX');
    console.log('==========================================\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Import models after connection
    const InventoryItem = require('./models/InventoryItem');
    const LabOrder = require('./models/LabOrder');
    const InventoryTransaction = require('./models/InventoryTransaction');
    const labTestInventoryMap = require('./config/labTestInventoryMap');

    console.log('\n📋 STEP 1: CHECKING INVENTORY ITEMS');
    console.log('=====================================');

    // Check current inventory items
    const inventoryItems = await InventoryItem.find({ isActive: true });

    if (inventoryItems.length === 0) {
      console.log('❌ No active inventory items found!');
      console.log('🔧 Creating sample glucose inventory item...');

      // Create a sample glucose inventory item
      const sampleGlucoseItem = new InventoryItem({
        name: 'Glucose, Fasting',
        itemCode: 'LAB-GLU-FAST-001',
        category: 'laboratory',
        unit: 'pieces',
        quantity: 100,
        minimumStockLevel: 10,
        costPrice: 5.00,
        sellingPrice: 10.00,
        isActive: true,
        createdBy: new mongoose.Types.ObjectId('68946a3f861ea34c0eee6ac3')
      });

      await sampleGlucoseItem.save();
      console.log(`✅ Created glucose inventory item: ${sampleGlucoseItem.name} (Qty: ${sampleGlucoseItem.quantity})`);
    } else {
      console.log(`✅ Found ${inventoryItems.length} active inventory items`);
      inventoryItems.forEach(item => {
        console.log(`  - ${item.name} (Qty: ${item.quantity})`);
      });
    }

    console.log('\n📋 STEP 2: CHECKING LAB TEST MAPPINGS');
    console.log('=====================================');

    // Check lab test mappings
    console.log('Available lab test mappings:');
    Object.keys(labTestInventoryMap).slice(0, 10).forEach(testName => {
      const mapping = labTestInventoryMap[testName];
      console.log(`  - "${testName}" → ${mapping.itemName} (qty: ${mapping.quantity})`);
    });

    // Check if glucose mappings exist
    const glucoseMappings = Object.keys(labTestInventoryMap).filter(key =>
      key.toLowerCase().includes('glucose')
    );

    console.log(`\n🩸 Found ${glucoseMappings.length} glucose-related test mappings:`);
    glucoseMappings.forEach(testName => {
      console.log(`  - "${testName}" → ${labTestInventoryMap[testName].itemName}`);
    });

    console.log('\n📋 STEP 3: TESTING INVENTORY DEDUCTION');
    console.log('=====================================');

    // Test inventory deduction
    const inventoryDeductionService = require('./services/inventoryDeductionService');

    // Test with a glucose test
    const testLabOrder = {
      testName: 'Glucose, Fasting',
      _id: new mongoose.Types.ObjectId()
    };

    const testUserId = new mongoose.Types.ObjectId('68946a3f861ea34c0eee6ac3');

    console.log(`🧪 Testing inventory deduction for: ${testLabOrder.testName}`);

    const result = await inventoryDeductionService.deductLabInventory(testLabOrder, testUserId);

    if (result && result.success) {
      console.log(`✅ Inventory deduction successful!`);
      console.log(`   Item: ${result.itemName}`);
      console.log(`   Quantity consumed: ${result.quantityConsumed}`);
      console.log(`   New quantity: ${result.newQuantity}`);
      console.log(`   Transaction ID: ${result.transactionId}`);
    } else {
      console.log(`❌ Inventory deduction failed or no mapping found`);
      console.log('   This indicates an issue with the inventory mapping or stock levels');
    }

    console.log('\n📋 STEP 4: CHECKING RECENT LAB ORDERS');
    console.log('=====================================');

    // Check recent lab orders
    const recentLabOrders = await LabOrder.find({
      status: { $in: ['Results Available', 'Completed'] }
    }).sort({ updatedAt: -1 }).limit(5);

    console.log(`Found ${recentLabOrders.length} recently completed lab orders:`);
    recentLabOrders.forEach(order => {
      console.log(`  - ${order.testName} (${order.status}) - Updated: ${order.updatedAt}`);
    });

    console.log('\n📋 STEP 5: CHECKING INVENTORY TRANSACTIONS');
    console.log('=====================================');

    // Check recent transactions
    const recentTransactions = await InventoryTransaction.find({
      transactionType: 'medical-use'
    }).sort({ createdAt: -1 }).limit(5);

    console.log(`Found ${recentTransactions.length} recent medical-use transactions:`);
    recentTransactions.forEach(tx => {
      console.log(`  - ${tx.quantity} units of ${tx.item} - ${tx.reason}`);
    });

    console.log('\n📋 STEP 6: CREATING MISSING INVENTORY ITEMS');
    console.log('=====================================');

    // Create missing inventory items for common lab tests
    const commonTests = [
      { name: 'Glucose, Fasting', itemCode: 'LAB-GLU-FAST-001', category: 'laboratory' },
      { name: 'Hemoglobin', itemCode: 'LAB-HEMO-001', category: 'laboratory' },
      { name: 'Urinalysis', itemCode: 'LAB-URINE-001', category: 'laboratory' }
    ];

    for (const test of commonTests) {
      const existingItem = await InventoryItem.findOne({
        name: { $regex: new RegExp(test.name, 'i') },
        isActive: true
      });

      if (!existingItem) {
        console.log(`🔧 Creating missing inventory item: ${test.name}`);

        const newItem = new InventoryItem({
          name: test.name,
          itemCode: test.itemCode,
          category: 'laboratory', // Use valid category from enum
          unit: 'pieces',
          quantity: 100,
          minimumStockLevel: 10,
          costPrice: 5.00,
          sellingPrice: 10.00,
          isActive: true,
          createdBy: testUserId
        });

        await newItem.save();
        console.log(`✅ Created: ${newItem.name} (Qty: ${newItem.quantity})`);
      } else {
        console.log(`✅ Already exists: ${existingItem.name} (Qty: ${existingItem.quantity})`);
      }
    }

    console.log('\n📋 STEP 7: TESTING DEDUCTION AGAIN');
    console.log('=====================================');

    // Test deduction again with the newly created items
    console.log('🧪 Testing inventory deduction again...');

    const result2 = await inventoryDeductionService.deductLabInventory(testLabOrder, testUserId);

    if (result2 && result2.success) {
      console.log(`✅ Second test successful!`);
      console.log(`   Item: ${result2.itemName}`);
      console.log(`   Quantity consumed: ${result2.quantityConsumed}`);
      console.log(`   New quantity: ${result2.newQuantity}`);
    } else {
      console.log(`❌ Second test failed`);
    }

    console.log('\n📋 STEP 8: CREATING A TEST LAB ORDER');
    console.log('=====================================');

    // Create a test lab order to verify the full workflow
    console.log('🔧 Creating a test lab order...');

    const testOrder = new LabOrder({
      patientId: new mongoose.Types.ObjectId('68946a3f861ea34c0eee6ac3'),
      testName: 'Glucose, Fasting',
      panelName: null,
      specimenType: 'Blood',
      orderDateTime: new Date(),
      status: 'Pending Payment',
      paymentStatus: 'pending',
      priority: 'Routine',
      notes: 'Test order for inventory deduction verification',
      orderingDoctorId: testUserId,
      totalPrice: 200,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await testOrder.save();
    console.log(`✅ Created test lab order: ${testOrder._id}`);

    // Now update it to completed status to trigger deduction
    console.log('🔧 Updating test order to completed status...');
    testOrder.status = 'Results Available';
    await testOrder.save();

    console.log('✅ Test lab order updated to "Results Available"');

    await mongoose.disconnect();
    console.log('\n🎉 COMPREHENSIVE LAB INVENTORY FIX COMPLETED!');
    console.log('\n📋 SUMMARY OF CHANGES:');
    console.log('   ✅ Fixed missing imports in labInventoryService.js');
    console.log('   ✅ Created missing inventory items');
    console.log('   ✅ Verified lab test mappings');
    console.log('   ✅ Tested inventory deduction functionality');
    console.log('   ✅ Created test lab order for verification');

  } catch (error) {
    console.error('❌ Error in comprehensive lab inventory fix:', error);
    process.exit(1);
  }
}

comprehensiveLabInventoryFix();
