const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkTransactions() {
  try {
    console.log('🔍 Checking Glucose Test Strip transactions...\n');
    
    const InventoryItem = require('../models/InventoryItem');
    const InventoryTransaction = require('../models/InventoryTransaction');
    
    // Find glucose items
    const glucoseItems = await InventoryItem.find({
      name: /glucose.*strip/i,
      isActive: true
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${glucoseItems.length} Glucose items:\n`);
    
    for (const item of glucoseItems) {
      console.log(`📦 Item: ${item.name}`);
      console.log(`   ID: ${item._id}`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Current Quantity: ${item.quantity}`);
      console.log(`   Unit: ${item.unit}\n`);
      
      // Get recent transactions (last 20)
      const transactions = await InventoryTransaction.find({
        item: item._id
      }).sort({ createdAt: -1 }).limit(20);
      
      console.log(`   📝 Last ${transactions.length} transactions:`);
      
      for (const tx of transactions) {
        const userName = tx.performedBy ? tx.performedBy.toString().substring(0, 8) : 'Unknown';
        console.log(`   - ${tx.createdAt.toLocaleString()}`);
        console.log(`     Type: ${tx.transactionType}`);
        console.log(`     Quantity: ${tx.quantity}`);
        console.log(`     Previous: ${tx.previousQuantity} → New: ${tx.newQuantity}`);
        console.log(`     Reason: ${tx.reason}`);
        console.log(`     Reference: ${tx.documentReference || 'N/A'}`);
        console.log(`     User: ${userName}`);
        console.log(`     Time diff from next: ${transactions.indexOf(tx) < transactions.length - 1 ? 
          Math.abs(new Date(tx.createdAt) - new Date(transactions[transactions.indexOf(tx) + 1].createdAt)) / 1000 + ' seconds' : 'N/A'}`);
        console.log('');
      }
      
      console.log('   🔍 Looking for duplicate patterns (within 10 seconds):\n');
      
      for (let i = 0; i < transactions.length - 1; i++) {
        const current = transactions[i];
        const next = transactions[i + 1];
        const timeDiff = Math.abs(new Date(current.createdAt) - new Date(next.createdAt)) / 1000;
        
        if (timeDiff <= 10 && current.quantity === next.quantity) {
          console.log(`   ⚠️ POTENTIAL DUPLICATE FOUND:`);
          console.log(`     Transaction 1: ${current._id} at ${current.createdAt.toLocaleString()}`);
          console.log(`     Transaction 2: ${next._id} at ${next.createdAt.toLocaleString()}`);
          console.log(`     Time difference: ${timeDiff.toFixed(2)} seconds`);
          console.log(`     Both deducted: ${current.quantity}`);
          console.log(`     Reason 1: ${current.reason}`);
          console.log(`     Reason 2: ${next.reason}`);
          console.log(`     Reference 1: ${current.documentReference || 'N/A'}`);
          console.log(`     Reference 2: ${next.documentReference || 'N/A'}`);
          console.log('');
        }
      }
      
      console.log('\n' + '='.repeat(80) + '\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  }
}

checkTransactions();

