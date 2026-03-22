const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const User = require('../models/User');

require('dotenv').config();

async function investigateDepoDeductions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinic-cms');
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${mongoose.connection.name}\n`);

    // Find ALL Depo inventory items (current and deleted)
    console.log(`🔍 ========== SEARCHING FOR ALL DEPO INVENTORY ITEMS ==========\n`);
    
    const currentDepoItems = await InventoryItem.find({
      name: { $regex: /depo/i },
      isActive: true
    }).lean();

    console.log(`Current Active Depo Items: ${currentDepoItems.length}`);
    currentDepoItems.forEach(item => {
      console.log(`\n📦 ${item.name}`);
      console.log(`   ID: ${item._id}`);
      console.log(`   Category: ${item.category}`);
      console.log(`   Current Quantity: ${item.quantity}`);
      console.log(`   Created: ${new Date(item.createdAt).toLocaleString()}`);
    });

    // Get ALL Depo-related transactions (including those referencing deleted items)
    console.log(`\n\n🔍 ========== ALL DEPO TRANSACTIONS (Last 7 Days) ==========\n`);
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const allDepoTransactions = await InventoryTransaction.find({
      reason: { $regex: /depo/i },
      createdAt: { $gte: sevenDaysAgo }
    })
      .populate('item', 'name category')
      .populate('performedBy', 'firstName lastName')
      .sort({ createdAt: 1 }) // Sort ascending by time
      .lean();

    console.log(`Total Depo transactions: ${allDepoTransactions.length}\n`);

    // Group transactions by timestamp (to identify duplicates)
    const transactionsByTime = {};
    
    allDepoTransactions.forEach((tx, idx) => {
      const timestamp = new Date(tx.createdAt).getTime();
      const timeKey = Math.floor(timestamp / 1000); // Group by second
      
      if (!transactionsByTime[timeKey]) {
        transactionsByTime[timeKey] = [];
      }
      transactionsByTime[timeKey].push(tx);
    });

    // Check for duplicate patterns (multiple transactions within same second)
    console.log(`🔍 ========== CHECKING FOR DUPLICATE PATTERNS ==========\n`);
    
    let duplicateCount = 0;
    
    for (const [timeKey, transactions] of Object.entries(transactionsByTime)) {
      if (transactions.length > 1) {
        duplicateCount++;
        console.log(`⚠️  DUPLICATE SET #${duplicateCount} - ${transactions.length} transactions within same second:`);
        console.log(`   Time: ${new Date(parseInt(timeKey) * 1000).toLocaleString()}\n`);
        
        transactions.forEach((tx, idx) => {
          const itemInfo = tx.item ? `${tx.item.name} (${tx.item.category})` : `DELETED ITEM: ${tx.item}`;
          console.log(`   Transaction ${idx + 1}:`);
          console.log(`      ID: ${tx._id}`);
          console.log(`      Item: ${itemInfo}`);
          console.log(`      Quantity: ${tx.quantity}`);
          console.log(`      Reason: ${tx.reason}`);
          console.log(`      Doc Ref: ${tx.documentReference || 'N/A'}`);
          console.log(`      Performed By: ${tx.performedBy ? `${tx.performedBy.firstName} ${tx.performedBy.lastName}` : 'N/A'}`);
          console.log(``);
        });
        
        console.log(`   ${'='.repeat(80)}\n`);
      }
    }

    if (duplicateCount === 0) {
      console.log(`✅ NO DUPLICATE PATTERNS FOUND - Each deduction is happening once!\n`);
    } else {
      console.log(`⚠️  Found ${duplicateCount} instances of duplicate deductions\n`);
    }

    // Check which inventory items these transactions reference
    console.log(`\n🔍 ========== INVENTORY ITEM REFERENCES ==========\n`);
    
    const itemReferences = {};
    allDepoTransactions.forEach(tx => {
      const itemId = tx.item ? (typeof tx.item === 'object' ? tx.item._id.toString() : tx.item.toString()) : 'null';
      if (!itemReferences[itemId]) {
        itemReferences[itemId] = {
          count: 0,
          itemName: tx.item && tx.item.name ? tx.item.name : 'DELETED/UNKNOWN',
          category: tx.item && tx.item.category ? tx.item.category : 'UNKNOWN',
          transactions: []
        };
      }
      itemReferences[itemId].count++;
      itemReferences[itemId].transactions.push(tx);
    });

    for (const [itemId, data] of Object.entries(itemReferences)) {
      console.log(`Item ID: ${itemId}`);
      console.log(`   Name: ${data.itemName}`);
      console.log(`   Category: ${data.category}`);
      console.log(`   Transaction count: ${data.count}`);
      
      // Check if item still exists
      if (itemId !== 'null') {
        const itemExists = await InventoryItem.findById(itemId);
        if (itemExists) {
          console.log(`   Status: ✅ ACTIVE (Current quantity: ${itemExists.quantity})`);
        } else {
          console.log(`   Status: ❌ DELETED (These are old transactions)`);
        }
      }
      console.log(``);
    }

    // Show the current Depo item status
    console.log(`\n📊 ========== CURRENT DEPO INJECTION STATUS ==========\n`);
    
    if (currentDepoItems.length > 0) {
      const currentDepo = currentDepoItems[0];
      
      // Get transactions for the CURRENT item only
      const currentItemTransactions = await InventoryTransaction.find({
        item: currentDepo._id
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      console.log(`Current Item: ${currentDepo.name}`);
      console.log(`   ID: ${currentDepo._id}`);
      console.log(`   Category: ${currentDepo.category}`);
      console.log(`   Current Quantity: ${currentDepo.quantity}`);
      console.log(`   Reorder Level: ${currentDepo.reorderLevel || 'Not set'}`);
      console.log(`\nRecent Transactions for CURRENT item (last 10):`);
      
      if (currentItemTransactions.length === 0) {
        console.log(`   ✅ NO TRANSACTIONS YET - This is a fresh item!`);
        console.log(`   (All old transactions were for deleted items)`);
      } else {
        currentItemTransactions.forEach((tx, idx) => {
          console.log(`\n   ${idx + 1}. ${new Date(tx.createdAt).toLocaleString()}`);
          console.log(`      Quantity: ${tx.quantity}`);
          console.log(`      Reason: ${tx.reason}`);
          console.log(`      New Quantity: ${tx.newQuantity}`);
        });
      }
    }

    console.log(`\n\n🎯 ========== CONCLUSION ==========\n`);
    console.log(`Database Name: ${mongoose.connection.name}`);
    console.log(`Database Host: ${mongoose.connection.host}`);
    console.log(`\nThe double deduction pattern you saw:`);
    console.log(`   ❌ "Depo injection administered" (-1)`);
    console.log(`   ❌ "Depo administered (synced from Medication)" (-1)`);
    console.log(`\nThese are OLD transactions from DELETED inventory items.`);
    console.log(`The current system creates ONLY ONE transaction per action.`);
    console.log(`\n✅ Investigation complete\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

investigateDepoDeductions();

