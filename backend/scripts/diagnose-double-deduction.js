const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const User = require('../models/User');

require('dotenv').config();

async function diagnoseDoubleDeduction() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 ========== RECENT INVENTORY TRANSACTIONS ANALYSIS ==========\n');

    // Get recent transactions from the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTransactions = await InventoryTransaction.find({
      createdAt: { $gte: oneDayAgo },
      transactionType: 'medical-use'
    })
      .populate('item', 'name category')
      .populate('performedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📊 Found ${recentTransactions.length} recent medical-use transactions\n`);

    // Group transactions by item
    const transactionsByItem = {};
    recentTransactions.forEach(tx => {
      // Skip transactions with no item populated
      if (!tx.item || !tx.item._id) {
        console.log(`⚠️  Skipping transaction with no item: ${tx._id}`);
        return;
      }
      
      const itemId = tx.item._id.toString();
      if (!transactionsByItem[itemId]) {
        transactionsByItem[itemId] = {
          itemName: tx.item.name,
          category: tx.item.category,
          transactions: []
        };
      }
      transactionsByItem[itemId].transactions.push(tx);
    });

    // Check for suspicious duplicates
    let duplicatesFound = 0;
    
    for (const [itemId, data] of Object.entries(transactionsByItem)) {
      console.log(`\n📦 ${data.itemName} (${data.category})`);
      console.log(`   Total transactions: ${data.transactions.length}`);

      // Sort by timestamp
      data.transactions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      // Check for duplicates within 30 seconds
      for (let i = 0; i < data.transactions.length - 1; i++) {
        const current = data.transactions[i];
        const next = data.transactions[i + 1];
        
        const timeDiff = (new Date(next.createdAt) - new Date(current.createdAt)) / 1000;
        
        if (timeDiff < 30 && current.quantity === next.quantity) {
          duplicatesFound++;
          console.log(`\n   ⚠️  POTENTIAL DUPLICATE #${duplicatesFound}:`);
          console.log(`      Transaction 1:`);
          console.log(`         Time: ${current.createdAt.toLocaleString()}`);
          console.log(`         Quantity: ${current.quantity}`);
          console.log(`         Reason: ${current.reason}`);
          console.log(`         Reference: ${current.documentReference || 'N/A'}`);
          console.log(`         By: ${current.performedBy ? `${current.performedBy.firstName} ${current.performedBy.lastName}` : 'N/A'}`);
          
          console.log(`      Transaction 2:`);
          console.log(`         Time: ${next.createdAt.toLocaleString()}`);
          console.log(`         Quantity: ${next.quantity}`);
          console.log(`         Reason: ${next.reason}`);
          console.log(`         Reference: ${next.documentReference || 'N/A'}`);
          console.log(`         By: ${next.performedBy ? `${next.performedBy.firstName} ${next.performedBy.lastName}` : 'N/A'}`);
          console.log(`      Time difference: ${timeDiff.toFixed(2)} seconds`);
          
          // Check if they have the same documentReference
          if (current.documentReference && next.documentReference) {
            if (current.documentReference.toString() === next.documentReference.toString()) {
              console.log(`      🚨 SAME DOCUMENT REFERENCE - This is a DEFINITE duplicate!`);
            } else {
              console.log(`      ℹ️  Different document references - May be legitimate`);
            }
          } else {
            console.log(`      ⚠️  Missing document reference - Cannot verify if duplicate`);
          }
        }
      }
    }

    console.log(`\n\n📊 ========== SUMMARY ==========`);
    console.log(`Total suspicious duplicates found: ${duplicatesFound}`);

    // Check inventory items with recent activity
    console.log(`\n\n📦 ========== CURRENT INVENTORY STATUS ==========\n`);
    
    const itemIds = Object.keys(transactionsByItem);
    const inventoryItems = await InventoryItem.find({
      _id: { $in: itemIds }
    }).lean();

    for (const item of inventoryItems) {
      const txData = transactionsByItem[item._id.toString()];
      const totalDeducted = txData.transactions.reduce((sum, tx) => sum + Math.abs(tx.quantity), 0);
      
      console.log(`📦 ${item.name}`);
      console.log(`   Current quantity: ${item.quantity}`);
      console.log(`   Total deducted (last 24h): ${totalDeducted}`);
      console.log(`   Transactions: ${txData.transactions.length}`);
      console.log(`   Category: ${item.category}`);
    }

    console.log(`\n✅ Diagnosis complete\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

diagnoseDoubleDeduction();

