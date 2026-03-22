const mongoose = require('mongoose');
const InventoryTransaction = require('../models/InventoryTransaction');
const User = require('../models/User');

require('dotenv').config();

async function checkOrphanedTransactions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clinic-cms');
    console.log('✅ Connected to MongoDB\n');

    // Find transactions where item doesn't exist or is null
    const orphanedTransactions = await InventoryTransaction.find({
      $or: [
        { item: null },
        { item: { $exists: false } }
      ]
    })
      .populate('performedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`🔍 ========== ORPHANED TRANSACTIONS (No Item Reference) ==========\n`);
    console.log(`Found ${orphanedTransactions.length} transactions with missing item references\n`);

    if (orphanedTransactions.length > 0) {
      orphanedTransactions.forEach((tx, idx) => {
        console.log(`${idx + 1}. Transaction ID: ${tx._id}`);
        console.log(`   Created: ${new Date(tx.createdAt).toLocaleString()}`);
        console.log(`   Type: ${tx.transactionType}`);
        console.log(`   Quantity: ${tx.quantity}`);
        console.log(`   Reason: ${tx.reason}`);
        console.log(`   Status: ${tx.status}`);
        console.log(`   Document Ref: ${tx.documentReference || 'N/A'}`);
        console.log(`   Performed By: ${tx.performedBy ? `${tx.performedBy.firstName} ${tx.performedBy.lastName}` : 'N/A'}`);
        console.log(`   ${'='.repeat(80)}\n`);
      });

      console.log(`\n⚠️  These transactions have no linked inventory item!`);
      console.log(`   This could mean:`);
      console.log(`   1. The inventory item was deleted after the transaction`);
      console.log(`   2. The transaction was created with an invalid item reference`);
      console.log(`   3. There's a bug in the transaction creation code\n`);
    }

    // Check for transactions with invalid ObjectIds
    const allTransactions = await InventoryTransaction.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    console.log(`\n📊 ========== RECENT TRANSACTIONS (Last 50) ==========\n`);
    
    let invalidItemRefs = 0;
    for (const tx of allTransactions) {
      if (tx.item) {
        // Try to verify the item still exists
        const InventoryItem = require('../models/InventoryItem');
        const itemExists = await InventoryItem.findById(tx.item);
        if (!itemExists) {
          invalidItemRefs++;
          console.log(`⚠️  Transaction ${tx._id} references non-existent item: ${tx.item}`);
          console.log(`   Created: ${new Date(tx.createdAt).toLocaleString()}`);
          console.log(`   Reason: ${tx.reason}`);
          console.log(`   Quantity: ${tx.quantity}\n`);
        }
      }
    }

    console.log(`\nInvalid item references found: ${invalidItemRefs}`);
    console.log(`\n✅ Check complete\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

checkOrphanedTransactions();

