/**
 * Script to fix existing lab orders with incorrect prices (99.99 instead of 100)
 * This updates all lab orders for Weil-Felix Test that have 99.99 to 100
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Try to load config, fallback to environment variable
let MONGO_URI;
try {
  const config = require('../config');
  MONGO_URI = config.MONGODB_URI || config.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
} catch (error) {
  MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
}

if (!MONGO_URI) {
  console.error('❌ Error: MongoDB URI not found in config or environment variables');
  console.error('   Please ensure MONGODB_URI or MONGO_URI is set in your .env file or config.js');
  process.exit(1);
}

const InventoryItem = require('../models/InventoryItem');
const LabOrder = require('../models/LabOrder');
const MedicalInvoice = require('../models/MedicalInvoice');

async function fixExistingLabOrderPrices() {
  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Find Weil-Felix Test inventory item to get correct price
    const weilFelixItem = await InventoryItem.findOne({
      name: { $regex: /weil-felix/i },
      category: 'laboratory',
      isActive: true
    });

    if (!weilFelixItem) {
      console.log('❌ Weil-Felix Test inventory item not found');
      await mongoose.connection.close();
      return;
    }

    const correctPrice = Math.round(weilFelixItem.sellingPrice * 100) / 100;
    console.log(`📋 Correct price from inventory: ${correctPrice} ETB\n`);

    // Find all lab orders for Weil-Felix Test with price 99.99
    const incorrectOrders = await LabOrder.find({
      testName: { $regex: /weil-felix/i },
      totalPrice: { $gte: 99.98, $lte: 99.99 } // Find prices between 99.98 and 99.99
    });

    console.log(`🔍 Found ${incorrectOrders.length} lab orders with incorrect price (99.99)\n`);

    if (incorrectOrders.length === 0) {
      console.log('✅ No lab orders need to be fixed');
      await mongoose.connection.close();
      return;
    }

    // Show summary
    console.log('📋 Orders to be fixed:');
    incorrectOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. Order ID: ${order._id}`);
      console.log(`      Test: ${order.testName}`);
      console.log(`      Current Price: ${order.totalPrice} ETB`);
      console.log(`      Payment Status: ${order.paymentStatus}`);
      console.log(`      Created: ${order.createdAt}`);
      console.log('');
    });

    // Ask for confirmation (in a real scenario, you might want to add a --yes flag)
    console.log(`⚠️  This will update ${incorrectOrders.length} lab orders from 99.99 to ${correctPrice} ETB`);
    console.log('   Note: This will NOT update invoices that have already been paid.');
    console.log('   Only pending and partially paid orders will be updated.\n');

    // Update lab orders
    let updatedCount = 0;
    let skippedCount = 0;

    for (const order of incorrectOrders) {
      try {
        // Only update if payment is pending or partially paid
        if (order.paymentStatus === 'pending' || order.paymentStatus === 'partially_paid') {
          const oldPrice = order.totalPrice;
          order.totalPrice = correctPrice;
          await order.save();
          updatedCount++;
          console.log(`✅ Updated order ${order._id}: ${oldPrice} → ${correctPrice} ETB`);
        } else {
          skippedCount++;
          console.log(`⏭️  Skipped order ${order._id} (payment status: ${order.paymentStatus})`);
        }
      } catch (error) {
        console.error(`❌ Error updating order ${order._id}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} orders`);
    console.log(`   ⏭️  Skipped: ${skippedCount} orders (already paid)`);
    console.log(`   📝 Total processed: ${incorrectOrders.length} orders`);

    // Also check and update invoices if needed
    console.log('\n🔍 Checking invoices...');
    const invoicesWithIncorrectPrices = await MedicalInvoice.find({
      'items.serviceName': { $regex: /weil-felix/i },
      'items.unitPrice': { $gte: 99.98, $lte: 99.99 },
      status: { $in: ['pending', 'partial'] }
    });

    if (invoicesWithIncorrectPrices.length > 0) {
      console.log(`   Found ${invoicesWithIncorrectPrices.length} invoices with incorrect prices`);
      console.log('   ⚠️  Note: Invoice prices should be updated manually or through the billing system');
      console.log('   to ensure proper recalculation of totals and balances.\n');
    } else {
      console.log('   ✅ No pending invoices with incorrect prices found\n');
    }

    await mongoose.connection.close();
    console.log('✅ Script completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fixExistingLabOrderPrices();
}

module.exports = fixExistingLabOrderPrices;

