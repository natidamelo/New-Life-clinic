const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const LabOrder = require('../models/LabOrder');
const InventoryItem = require('../models/InventoryItem');
const InventoryTransaction = require('../models/InventoryTransaction');

async function checkInventoryDeductionStatus() {
  try {
    console.log('🔍 Checking lab order inventory deduction status...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/clinic', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB\n');

    // Check completed lab orders without inventory deduction flag
    const completedWithoutFlag = await LabOrder.find({
      $or: [
        { status: 'Results Available' },
        { status: 'Completed' },
        { results: { $exists: true, $ne: null } }
      ],
      inventoryDeducted: { $ne: true }
    });

    console.log(`📋 Lab orders with results but NO inventory deduction flag: ${completedWithoutFlag.length}`);
    
    if (completedWithoutFlag.length > 0) {
      console.log('\n⚠️ These lab orders need backfilling:');
      completedWithoutFlag.forEach(order => {
        console.log(`   - ${order._id}: ${order.testName} (Status: ${order.status}, Result Date: ${order.resultDateTime || 'N/A'})`);
      });
    }

    // Check completed lab orders WITH inventory deduction flag
    const completedWithFlag = await LabOrder.find({
      $or: [
        { status: 'Results Available' },
        { status: 'Completed' },
        { results: { $exists: true, $ne: null } }
      ],
      inventoryDeducted: true
    });

    console.log(`\n✅ Lab orders with results AND inventory deduction flag: ${completedWithFlag.length}`);

    if (completedWithFlag.length > 0) {
      console.log('\n📊 Recent deductions:');
      const recentDeductions = completedWithFlag
        .sort((a, b) => new Date(b.inventoryDeductedAt) - new Date(a.inventoryDeductedAt))
        .slice(0, 5);
      
      recentDeductions.forEach(order => {
        console.log(`   - ${order.testName}: Deducted at ${order.inventoryDeductedAt}`);
      });
    }

    // Check glucose inventory item
    const glucoseItem = await InventoryItem.findOne({
      name: { $regex: /glucose.*fasting/i },
      category: 'laboratory',
      isActive: true
    });

    if (glucoseItem) {
      console.log(`\n🧪 Glucose Inventory Status:`);
      console.log(`   - Current Quantity: ${glucoseItem.quantity}`);
      console.log(`   - Last Updated: ${glucoseItem.updatedAt}`);
    }

    // Check recent glucose inventory transactions
    if (glucoseItem) {
      const recentTransactions = await InventoryTransaction.find({
        item: glucoseItem._id,
        transactionType: 'medical-use'
      })
      .sort({ createdAt: -1 })
      .limit(5);

      console.log(`\n📝 Recent Glucose Inventory Transactions (last 5):`);
      if (recentTransactions.length === 0) {
        console.log('   No transactions found');
      } else {
        recentTransactions.forEach(tx => {
          console.log(`   - ${tx.createdAt.toISOString()}: Quantity ${tx.quantity} (Reason: ${tx.reason})`);
        });
      }
    }

    console.log('\n✅ Status check complete!');

  } catch (error) {
    console.error('❌ Error in status check:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the check
if (require.main === module) {
  checkInventoryDeductionStatus();
}

module.exports = checkInventoryDeductionStatus;

