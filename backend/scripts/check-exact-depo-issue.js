const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');

require('dotenv').config();

async function checkExactDepoIssue() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms database\n');

    const depoItem = await InventoryItem.findOne({
      name: { $regex: /depo/i },
      isActive: true
    });

    console.log(`📦 Current Depo Injection: ${depoItem.name}`);
    console.log(`   Current Quantity: ${depoItem.quantity}`);
    console.log(`   Item ID: ${depoItem._id}\n`);

    // Get the EXACT transaction at 5:05:07 PM today
    console.log(`🔍 ========== CHECKING TRANSACTION AT 5:05 PM ==========\n`);

    const targetTime = new Date('2025-10-09T17:05:07');
    const oneMinuteBefore = new Date(targetTime.getTime() - 60000);
    const oneMinuteAfter = new Date(targetTime.getTime() + 60000);

    // Check ALL transactions around that time (not just for current item)
    const allTransactionsNearTime = await InventoryTransaction.find({
      createdAt: {
        $gte: oneMinuteBefore,
        $lte: oneMinuteAfter
      }
    })
      .populate('item', 'name category')
      .sort({ createdAt: 1 })
      .lean();

    console.log(`Found ${allTransactionsNearTime.length} transactions around 5:05 PM\n`);

    allTransactionsNearTime.forEach((tx, idx) => {
      const itemName = tx.item ? tx.item.name : 'DELETED ITEM';
      console.log(`${idx + 1}. ${new Date(tx.createdAt).toLocaleString()}.${new Date(tx.createdAt).getMilliseconds()}`);
      console.log(`   Item: ${itemName} (${tx.item ? tx.item._id : 'null'})`);
      console.log(`   Quantity: ${tx.quantity}`);
      console.log(`   Previous: ${tx.previousQuantity} → New: ${tx.newQuantity}`);
      console.log(`   Reason: ${tx.reason}`);
      console.log(`   Transaction ID: ${tx._id}`);
      console.log(``);
    });

    // Get ALL recent transactions for current Depo item
    console.log(`\n📋 ========== ALL TRANSACTIONS FOR CURRENT DEPO ITEM ==========\n`);

    const allDepoTransactions = await InventoryTransaction.find({
      item: depoItem._id
    })
      .sort({ createdAt: 1 })
      .lean();

    console.log(`Total transactions: ${allDepoTransactions.length}\n`);

    allDepoTransactions.forEach((tx, idx) => {
      const actualChange = tx.newQuantity - tx.previousQuantity;
      const discrepancy = actualChange !== tx.quantity ? '⚠️  DISCREPANCY' : '✅';
      
      console.log(`${idx + 1}. ${new Date(tx.createdAt).toLocaleString()}`);
      console.log(`   Recorded change: ${tx.quantity}`);
      console.log(`   Actual change: ${actualChange} (${tx.previousQuantity} → ${tx.newQuantity})`);
      console.log(`   ${discrepancy}`);
      console.log(`   Reason: ${tx.reason}`);
      console.log(``);
    });

    // Check for transactions within 1 second of each other
    console.log(`\n🔍 ========== CHECKING FOR SIMULTANEOUS TRANSACTIONS ==========\n`);

    for (let i = 0; i < allDepoTransactions.length - 1; i++) {
      const current = allDepoTransactions[i];
      const next = allDepoTransactions[i + 1];
      
      const timeDiff = (new Date(next.createdAt) - new Date(current.createdAt)) / 1000;
      
      if (timeDiff < 1) {
        console.log(`⚠️  Two transactions within ${timeDiff.toFixed(3)} seconds:`);
        console.log(`   Transaction 1: ${current.reason}`);
        console.log(`      Time: ${new Date(current.createdAt).toLocaleString()}.${new Date(current.createdAt).getMilliseconds()}`);
        console.log(`      Change: ${current.quantity}`);
        console.log(`      ID: ${current._id}`);
        console.log(`   Transaction 2: ${next.reason}`);
        console.log(`      Time: ${new Date(next.createdAt).toLocaleString()}.${new Date(next.createdAt).getMilliseconds()}`);
        console.log(`      Change: ${next.quantity}`);
        console.log(`      ID: ${next._id}`);
        console.log(``);
      }
    }

    // Calculate what the quantity SHOULD be
    console.log(`\n📊 ========== INVENTORY AUDIT ==========\n`);

    let calculatedQuantity = 0;
    allDepoTransactions.forEach((tx, idx) => {
      if (idx === 0) {
        calculatedQuantity = tx.previousQuantity || 0;
      }
      calculatedQuantity += tx.quantity;
      console.log(`${idx + 1}. Start: ${idx === 0 ? tx.previousQuantity : calculatedQuantity - tx.quantity}, Change: ${tx.quantity}, Running total: ${calculatedQuantity}`);
    });

    console.log(`\nFinal calculated quantity: ${calculatedQuantity}`);
    console.log(`Actual current quantity: ${depoItem.quantity}`);
    
    if (calculatedQuantity === depoItem.quantity) {
      console.log(`✅ MATCH - Transactions are consistent with inventory`);
    } else {
      console.log(`❌ MISMATCH - Difference of ${depoItem.quantity - calculatedQuantity}`);
      console.log(`\n⚠️  This suggests there might be:`);
      console.log(`   1. A transaction not recorded in the database`);
      console.log(`   2. A direct inventory update bypassing transaction log`);
      console.log(`   3. A bug in the deduction code`);
    }

    console.log(`\n✅ Investigation complete\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkExactDepoIssue();

