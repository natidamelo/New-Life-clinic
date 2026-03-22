const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');
const User = require('../models/User');

require('dotenv').config();

async function checkSpecificItemHistory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinic-cms');
    console.log('✅ Connected to MongoDB\n');

    // Get all inventory items to show user
    const items = await InventoryItem.find({}).sort({ updatedAt: -1 }).limit(20).lean();
    
    console.log(`📦 ========== RECENT INVENTORY ITEMS (showing last 20) ==========\n`);
    items.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.name} - Quantity: ${item.quantity} - Category: ${item.category}`);
    });

    // Get all transactions from the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const allTransactions = await InventoryTransaction.find({
      createdAt: { $gte: sevenDaysAgo }
    })
      .populate('item', 'name category')
      .populate('performedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`\n📊 ========== TRANSACTION ANALYSIS (Last 7 Days) ==========\n`);
    console.log(`Total transactions: ${allTransactions.length}\n`);

    // Group by item and check for suspicious patterns
    const itemMap = {};
    const duplicatePatterns = [];

    allTransactions.forEach(tx => {
      if (!tx.item) return;
      
      const itemId = tx.item._id.toString();
      if (!itemMap[itemId]) {
        itemMap[itemId] = {
          name: tx.item.name,
          category: tx.item.category,
          transactions: []
        };
      }
      itemMap[itemId].transactions.push(tx);
    });

    // Analyze each item for suspicious patterns
    for (const [itemId, data] of Object.entries(itemMap)) {
      // Sort by time
      data.transactions.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      // Check for duplicates within 60 seconds with same documentReference
      for (let i = 0; i < data.transactions.length - 1; i++) {
        const current = data.transactions[i];
        const next = data.transactions[i + 1];
        
        const timeDiff = (new Date(next.createdAt) - new Date(current.createdAt)) / 1000;
        
        // Check multiple conditions for potential duplicates
        const isSuspicious = (
          timeDiff < 60 &&
          current.quantity === next.quantity &&
          Math.abs(current.quantity) > 0 // Deduction (negative quantity)
        );

        if (isSuspicious) {
          const sameDocRef = (
            current.documentReference && next.documentReference &&
            current.documentReference.toString() === next.documentReference.toString()
          );

          duplicatePatterns.push({
            itemName: data.name,
            category: data.category,
            transaction1: {
              id: current._id,
              time: current.createdAt,
              quantity: current.quantity,
              reason: current.reason,
              docRef: current.documentReference || 'N/A',
              by: current.performedBy ? `${current.performedBy.firstName} ${current.performedBy.lastName}` : 'N/A'
            },
            transaction2: {
              id: next._id,
              time: next.createdAt,
              quantity: next.quantity,
              reason: next.reason,
              docRef: next.documentReference || 'N/A',
              by: next.performedBy ? `${next.performedBy.firstName} ${next.performedBy.lastName}` : 'N/A'
            },
            timeDiffSeconds: timeDiff,
            sameDocRef,
            severity: sameDocRef ? '🚨 DEFINITE DUPLICATE' : '⚠️  POSSIBLE DUPLICATE'
          });
        }
      }
    }

    // Display duplicate patterns
    if (duplicatePatterns.length > 0) {
      console.log(`🚨 ========== FOUND ${duplicatePatterns.length} SUSPICIOUS PATTERNS ==========\n`);
      
      duplicatePatterns.forEach((pattern, idx) => {
        console.log(`\n${idx + 1}. ${pattern.severity} - ${pattern.itemName} (${pattern.category})`);
        console.log(`   Time difference: ${pattern.timeDiffSeconds.toFixed(2)} seconds`);
        console.log(`   Same document reference: ${pattern.sameDocRef ? 'YES ❌' : 'NO ✅'}`);
        console.log(`\n   Transaction 1:`);
        console.log(`      ID: ${pattern.transaction1.id}`);
        console.log(`      Time: ${new Date(pattern.transaction1.time).toLocaleString()}`);
        console.log(`      Quantity: ${pattern.transaction1.quantity}`);
        console.log(`      Reason: ${pattern.transaction1.reason}`);
        console.log(`      Doc Ref: ${pattern.transaction1.docRef}`);
        console.log(`      By: ${pattern.transaction1.by}`);
        console.log(`\n   Transaction 2:`);
        console.log(`      ID: ${pattern.transaction2.id}`);
        console.log(`      Time: ${new Date(pattern.transaction2.time).toLocaleString()}`);
        console.log(`      Quantity: ${pattern.transaction2.quantity}`);
        console.log(`      Reason: ${pattern.transaction2.reason}`);
        console.log(`      Doc Ref: ${pattern.transaction2.docRef}`);
        console.log(`      By: ${pattern.transaction2.by}`);
        console.log(`\n   ${'='.repeat(80)}`);
      });
    } else {
      console.log(`✅ No suspicious duplicate patterns found in the last 7 days\n`);
    }

    // Show top deductions
    console.log(`\n📊 ========== TOP DEDUCTIONS (Last 7 Days) ==========\n`);
    const deductionSummary = Object.entries(itemMap)
      .map(([itemId, data]) => {
        const totalDeducted = data.transactions
          .filter(tx => tx.quantity < 0)
          .reduce((sum, tx) => sum + Math.abs(tx.quantity), 0);
        
        return {
          name: data.name,
          category: data.category,
          totalDeducted,
          transactionCount: data.transactions.filter(tx => tx.quantity < 0).length
        };
      })
      .filter(item => item.totalDeducted > 0)
      .sort((a, b) => b.totalDeducted - a.totalDeducted)
      .slice(0, 10);

    deductionSummary.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.name} (${item.category})`);
      console.log(`   Total deducted: ${item.totalDeducted}`);
      console.log(`   Number of deduction transactions: ${item.transactionCount}`);
    });

    console.log(`\n✅ Analysis complete\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkSpecificItemHistory();

