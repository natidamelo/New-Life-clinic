/**
 * Fix Normal Saline Inventory - Manual Deduction
 * 
 * This script manually deducts 1 unit of Normal Saline from inventory
 * to correct the Oct 6, 2025 administration that didn't deduct automatically.
 */

const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic-cms', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const InventoryItem = require('./backend/models/InventoryItem');
const InventoryTransaction = require('./backend/models/InventoryTransaction');

const fixNormalSaline = async () => {
  try {
    console.log('\n🔧 FIXING NORMAL SALINE INVENTORY\n');
    console.log('═'.repeat(60));

    // Find Normal Saline in inventory
    const normalSaline = await InventoryItem.findOne({ 
      name: /normal saline/i,
      category: 'medication'
    });

    if (!normalSaline) {
      console.log('❌ Normal Saline not found in inventory');
      console.log('   Please add it via: Stock Management → Add Expense → New Inventory Item');
      return;
    }

    console.log('\n📦 Current Inventory Status:');
    console.log(`   Item: ${normalSaline.name}`);
    console.log(`   Current Quantity: ${normalSaline.quantity} ${normalSaline.unit || 'units'}`);
    console.log(`   Cost Price: ${normalSaline.costPrice} ETB`);
    console.log(`   Selling Price: ${normalSaline.sellingPrice} ETB`);

    // Check if we've already fixed this
    const existingTransaction = await InventoryTransaction.findOne({
      item: normalSaline._id,
      reason: /manual correction.*oct 6/i
    });

    if (existingTransaction) {
      console.log('\n⚠️  This inventory has already been corrected!');
      console.log(`   Transaction Date: ${existingTransaction.createdAt}`);
      console.log(`   Previous Qty: ${existingTransaction.previousQuantity}`);
      console.log(`   New Qty: ${existingTransaction.newQuantity}`);
      console.log('\n✅ No further action needed.');
      return;
    }

    // Deduct 1 unit
    const previousQuantity = normalSaline.quantity;
    normalSaline.quantity -= 1;
    await normalSaline.save();

    console.log('\n✅ Inventory Updated:');
    console.log(`   Previous Quantity: ${previousQuantity} ${normalSaline.unit || 'units'}`);
    console.log(`   New Quantity: ${normalSaline.quantity} ${normalSaline.unit || 'units'}`);

    // Create transaction record for audit trail
    const transaction = new InventoryTransaction({
      item: normalSaline._id,
      transactionType: 'medical-use',
      quantity: -1,
      unitCost: normalSaline.costPrice || 0,
      totalCost: normalSaline.costPrice || 0,
      previousQuantity: previousQuantity,
      newQuantity: normalSaline.quantity,
      reason: 'Manual correction for Oct 6, 2025 administration (inventory deduction was not automatic at that time)',
      notes: 'Correcting missed deduction from Samuel Debel administration by Semhal Melaku',
      documentReference: 'Manual-Correction-Oct6-2025',
      performedBy: normalSaline.updatedBy || normalSaline.createdBy,
      status: 'completed'
    });

    await transaction.save();

    console.log('\n📝 Transaction Record Created:');
    console.log(`   Transaction ID: ${transaction._id}`);
    console.log(`   Type: ${transaction.transactionType}`);
    console.log(`   Reason: ${transaction.reason}`);

    console.log('\n═'.repeat(60));
    console.log('✅ CORRECTION COMPLETE');
    console.log('═'.repeat(60));

    console.log('\n📋 Next Steps:');
    console.log('   1. ✅ Inventory corrected (100 → 99)');
    console.log('   2. 🔄 Restart backend server to enable automatic deduction');
    console.log('   3. 🧪 Test new administration to verify it works');
    console.log('\n   Run: cd backend && npm run dev');
    console.log('\n📚 See: NORMAL_SALINE_INVENTORY_FIX.md for full instructions\n');

  } catch (error) {
    console.error('\n❌ Error fixing inventory:', error);
    console.error('   Error message:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
  }
};

// Run the fix
connectDB().then(() => {
  fixNormalSaline();
});

