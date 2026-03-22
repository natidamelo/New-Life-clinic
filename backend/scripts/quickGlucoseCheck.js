const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');

async function quickGlucoseCheck() {
  try {
    console.log('🔍 Quick Glucose Check');
    console.log('=====================\n');

    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms');

    // Check glucose inventory
    const glucoseItem = await InventoryItem.findOne({
      _id: '68dbe045d23305b944814bec'
    });

    if (glucoseItem) {
      console.log(`📦 Glucose item found:`);
      console.log(`   Name: ${glucoseItem.name}`);
      console.log(`   Quantity: ${glucoseItem.quantity}`);
      console.log(`   Cost Price: $${glucoseItem.costPrice}`);
      console.log(`   Last Updated: ${glucoseItem.updatedAt}`);
    } else {
      console.log('❌ Glucose item not found');
    }

    // Check recent transactions
    const InventoryTransaction = require('../models/InventoryTransaction');
    const recentTransactions = await InventoryTransaction.find({
      item: '68dbe045d23305b944814bec',
      transactionType: 'medical-use',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).sort({ createdAt: -1 }).limit(5);

    console.log(`\n📋 Recent transactions (last 24h): ${recentTransactions.length}`);
    recentTransactions.forEach((tx, i) => {
      console.log(`  ${i + 1}. ${tx.quantity} units - ${tx.reason} (${tx.createdAt})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Check completed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

quickGlucoseCheck();
