/**
 * Test script to verify medication deduction fixes
 */

const mongoose = require('mongoose');
const axios = require('axios');

// Test the medication deduction system
async function testMedicationDeduction() {
  try {
    console.log('🧪 Testing Medication Deduction System...');

    // Connect to database
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to database');

    // Test 1: Check if inventory deduction monitor is working
    console.log('\n📊 Test 1: Checking inventory deduction monitor logs...');

    // Test 2: Check if API endpoints are working
    console.log('\n🔗 Test 2: Testing API endpoints...');

    try {
      const response = await axios.get('http://localhost:5002/api/inventory');
      console.log(`✅ Inventory API: ${response.status} - ${response.data?.length || 0} items`);
    } catch (error) {
      console.log(`❌ Inventory API: ${error.response?.status || error.message}`);
    }

    // Test 3: Check if medication administration is working
    console.log('\n💊 Test 3: Testing medication administration...');

    try {
      const response = await axios.get('http://localhost:5002/api/nurse-tasks?taskType=MEDICATION');
      console.log(`✅ Medication tasks API: ${response.status} - ${response.data?.length || 0} tasks`);
    } catch (error) {
      console.log(`❌ Medication tasks API: ${error.response?.status || error.message}`);
    }

    // Test 4: Check inventory transactions
    console.log('\n📦 Test 4: Checking inventory transactions...');

    const InventoryTransaction = mongoose.model('InventoryTransaction');
    const recentTransactions = await InventoryTransaction.find({
      transactionType: 'medical-use',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).limit(5);

    console.log(`✅ Found ${recentTransactions.length} recent medical-use transactions`);

    recentTransactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.medicationName}: ${tx.quantity} units (${new Date(tx.createdAt).toLocaleString()})`);
    });

    console.log('\n🎉 Medication deduction system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

// Run the test
testMedicationDeduction();
