const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');

require('dotenv').config();

async function verifyDepoStatus() {
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

    console.log(`📦 ========== CURRENT DEPO INJECTION STATUS ==========\n`);
    console.log(`Item: ${depoItem.name}`);
    console.log(`Current Quantity: ${depoItem.quantity}`);
    console.log(`Item ID: ${depoItem._id}`);
    console.log(`Created: ${new Date(depoItem.createdAt).toLocaleString()}\n`);

    // Get transactions for this specific item
    const transactions = await InventoryTransaction.find({
      item: depoItem._id
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Total transactions for THIS item: ${transactions.length}\n`);

    // Calculate expected quantity
    const startQuantity = transactions.length > 0 ? transactions[transactions.length - 1].previousQuantity || 29 : 29;
    const totalDeducted = transactions.filter(t => t.quantity < 0).reduce((sum, t) => sum + Math.abs(t.quantity), 0);
    const totalAdded = transactions.filter(t => t.quantity > 0).reduce((sum, t) => sum + t.quantity, 0);
    
    const expectedQuantity = startQuantity - totalDeducted + totalAdded;

    console.log(`📊 ========== CALCULATION ==========\n`);
    console.log(`Starting quantity: ${startQuantity}`);
    console.log(`Total deducted: ${totalDeducted}`);
    console.log(`Total added: ${totalAdded}`);
    console.log(`Expected quantity: ${expectedQuantity}`);
    console.log(`Actual quantity: ${depoItem.quantity}`);
    
    if (expectedQuantity === depoItem.quantity) {
      console.log(`\n✅ PERFECT MATCH - Inventory is accurate!`);
    } else {
      console.log(`\n⚠️  MISMATCH - Difference: ${depoItem.quantity - expectedQuantity}`);
    }

    console.log(`\n📋 ========== RECENT TRANSACTIONS ==========\n`);
    transactions.slice(0, 10).forEach((tx, idx) => {
      console.log(`${idx + 1}. ${new Date(tx.createdAt).toLocaleString()}`);
      console.log(`   Action: ${tx.reason}`);
      console.log(`   Change: ${tx.quantity > 0 ? '+' : ''}${tx.quantity}`);
      console.log(`   Result: ${tx.previousQuantity} → ${tx.newQuantity}`);
      console.log(``);
    });

    // Check for ANY duplicate patterns in THIS item
    console.log(`\n🔍 ========== CHECKING FOR DUPLICATES IN CURRENT ITEM ==========\n`);
    
    let hasDuplicates = false;
    for (let i = 0; i < transactions.length - 1; i++) {
      const current = transactions[i];
      const next = transactions[i + 1];
      const timeDiff = Math.abs(new Date(current.createdAt) - new Date(next.createdAt)) / 1000;
      
      if (timeDiff < 2 && current.quantity === next.quantity) {
        hasDuplicates = true;
        console.log(`⚠️  Potential duplicate:`);
        console.log(`   Transaction 1: ${current.reason} at ${new Date(current.createdAt).toLocaleString()}`);
        console.log(`   Transaction 2: ${next.reason} at ${new Date(next.createdAt).toLocaleString()}`);
        console.log(`   Time difference: ${timeDiff.toFixed(2)} seconds\n`);
      }
    }

    if (!hasDuplicates) {
      console.log(`✅ NO DUPLICATES FOUND - Each transaction is unique!`);
      console.log(`\n🎉 Your current Depo Injection inventory is working PERFECTLY!`);
    }

    console.log(`\n✅ Verification complete\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

verifyDepoStatus();

