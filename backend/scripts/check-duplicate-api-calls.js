const mongoose = require('mongoose');
const InventoryTransaction = require('../models/InventoryTransaction');
const InventoryItem = require('../models/InventoryItem');

require('dotenv').config();

async function checkDuplicateAPICalls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms database\n');

    const depoItem = await InventoryItem.findOne({
      name: { $regex: /depo/i },
      isActive: true
    });

    if (!depoItem) {
      console.log('❌ No active Depo item found');
      return;
    }

    // Get all transactions for current Depo item
    const transactions = await InventoryTransaction.find({
      item: depoItem._id
    })
      .sort({ createdAt: 1 })
      .lean();

    console.log(`🔍 ========== ANALYZING TRANSACTIONS FOR DUPLICATE API CALLS ==========\n`);
    console.log(`Total transactions: ${transactions.length}\n`);

    // Check for transactions with same documentReference
    const byDocRef = {};
    transactions.forEach(tx => {
      const ref = tx.documentReference ? tx.documentReference.toString() : 'null';
      if (!byDocRef[ref]) {
        byDocRef[ref] = [];
      }
      byDocRef[ref].push(tx);
    });

    console.log(`Checking for duplicate API calls (same documentReference)...\n`);
    
    let duplicatesFound = 0;
    for (const [ref, txs] of Object.entries(byDocRef)) {
      if (txs.length > 1 && ref !== 'null') {
        duplicatesFound++;
        console.log(`⚠️  DUPLICATE #${duplicatesFound} - ${txs.length} transactions with same documentReference:`);
        console.log(`   Document Reference: ${ref}`);
        txs.forEach((tx, idx) => {
          console.log(`   Transaction ${idx + 1}:`);
          console.log(`      ID: ${tx._id}`);
          console.log(`      Time: ${new Date(tx.createdAt).toLocaleString()}.${new Date(tx.createdAt).getMilliseconds()}`);
          console.log(`      Quantity: ${tx.quantity}`);
          console.log(`      Previous: ${tx.previousQuantity} → New: ${tx.newQuantity}`);
          console.log(`      Reason: ${tx.reason}`);
        });
        console.log(``);
      }
    }

    if (duplicatesFound === 0) {
      console.log(`✅ NO DUPLICATES - Each task has only ONE transaction\n`);
      console.log(`This rules out double-click or duplicate API calls.\n`);
    }

    // Now let's analyze the mathematical discrepancy
    console.log(`\n🔍 ========== ANALYZING MATHEMATICAL DISCREPANCIES ==========\n`);
    
    let discrepancyCount = 0;
    transactions.forEach((tx, idx) => {
      const recordedChange = tx.quantity;
      const actualChange = tx.newQuantity - tx.previousQuantity;
      
      if (recordedChange !== actualChange) {
        discrepancyCount++;
        console.log(`⚠️  DISCREPANCY #${discrepancyCount}:`);
        console.log(`   Transaction ID: ${tx._id}`);
        console.log(`   Time: ${new Date(tx.createdAt).toLocaleString()}`);
        console.log(`   Recorded in transaction: ${tx.previousQuantity} + (${tx.quantity}) = ${tx.previousQuantity + tx.quantity}`);
        console.log(`   Actual in transaction: ${tx.previousQuantity} → ${tx.newQuantity} (change of ${actualChange})`);
        console.log(`   Difference: ${actualChange - recordedChange}`);
        console.log(``);
      }
    });

    if (discrepancyCount > 0) {
      console.log(`\n🚨 FOUND ${discrepancyCount} MATHEMATICAL DISCREPANCIES!\n`);
      console.log(`This means:`);
      console.log(`1. The transaction records one change (e.g., -1)`);
      console.log(`2. But the actual inventory changed by a different amount (e.g., -2)`);
      console.log(`3. This suggests ANOTHER deduction is happening that's NOT being recorded\n`);
      console.log(`Possible causes:`);
      console.log(`- A database trigger or hook`);
      console.log(`- Concurrent requests hitting the same item`);
      console.log(`- Code executing $inc twice in same request`);
      console.log(`- Frontend sending duplicate requests very quickly\n`);
    } else {
      console.log(`✅ NO DISCREPANCIES - All transaction math is correct\n`);
    }

    // Check the timing between transactions
    console.log(`\n🔍 ========== CHECKING TIMING PATTERNS ==========\n`);
    
    const deductionTransactions = transactions.filter(tx => tx.quantity < 0);
    console.log(`Total deductions: ${deductionTransactions.length}\n`);
    
    for (let i = 0; i < deductionTransactions.length - 1; i++) {
      const current = deductionTransactions[i];
      const next = deductionTransactions[i + 1];
      
      const timeDiff = (new Date(next.createdAt) - new Date(current.createdAt)) / 1000;
      
      console.log(`${i + 1}. ${new Date(current.createdAt).toLocaleString()}`);
      console.log(`   → ${timeDiff.toFixed(2)} seconds later`);
    }
    
    console.log(`${deductionTransactions.length}. ${new Date(deductionTransactions[deductionTransactions.length - 1].createdAt).toLocaleString()}`);

    console.log(`\n✅ Analysis complete\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkDuplicateAPICalls();

