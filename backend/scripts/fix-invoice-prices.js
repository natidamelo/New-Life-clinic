/**
 * Script to fix invoices with incorrect prices for Weil-Felix Test (99.99 instead of 100)
 * This updates invoice items and recalculates totals
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

const MedicalInvoice = require('../models/MedicalInvoice');

async function fixInvoicePrices() {
  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    const correctPrice = 100;
    console.log(`📋 Correct price: ${correctPrice} ETB\n`);

    // Find all invoices with Weil-Felix Test items (check multiple fields)
    console.log('🔍 Searching for invoices with Weil-Felix Test...');
    const allInvoices = await MedicalInvoice.find({
      $or: [
        { 'items.serviceName': { $regex: /weil-felix/i } },
        { 'items.description': { $regex: /weil-felix/i } },
        { 'items.name': { $regex: /weil-felix/i } }
      ]
    });
    console.log(`   Found ${allInvoices.length} invoices with Weil-Felix Test items`);

    // Show sample invoice structure
    if (allInvoices.length > 0) {
      console.log('\n📋 Sample invoice item structure:');
      const sampleInvoice = allInvoices[0];
      const weilFelixItem = sampleInvoice.items.find(item => {
        const name = item.serviceName || item.description || item.name || '';
        return /weil-felix/i.test(name);
      });
      if (weilFelixItem) {
        console.log('   Item fields:', Object.keys(weilFelixItem));
        console.log('   Item data:', JSON.stringify(weilFelixItem, null, 2));
      }
      console.log('');
    }

    // Filter for invoices with incorrect price
    const invoices = allInvoices.filter(invoice => {
      return invoice.items.some(item => {
        const name = item.serviceName || item.description || item.name || '';
        if (/weil-felix/i.test(name)) {
          const price = item.unitPrice || item.totalPrice || item.total || 0;
          return price >= 99.98 && price <= 99.99;
        }
        return false;
      });
    });

    console.log(`🔍 Found ${invoices.length} invoices with incorrect Weil-Felix Test price (99.99)\n`);

    if (invoices.length === 0) {
      console.log('✅ No invoices need to be fixed');
      await mongoose.connection.close();
      return;
    }

    let updatedInvoices = 0;
    let totalPriceDifference = 0;

    for (const invoice of invoices) {
      try {
        let invoiceUpdated = false;
        let priceDifference = 0;

        // Update items with incorrect price
        invoice.items.forEach((item, index) => {
          const name = item.serviceName || item.description || item.name || '';
          if (/weil-felix/i.test(name)) {
            const currentPrice = item.unitPrice || item.totalPrice || 0;
            if (currentPrice >= 99.98 && currentPrice <= 99.99) {
              const oldPrice = currentPrice;
              const newPrice = correctPrice;
              const difference = newPrice - oldPrice;

              // Update the item directly
              invoice.items[index].unitPrice = newPrice;
              invoice.items[index].totalPrice = newPrice;
              invoice.items[index].total = newPrice;

              priceDifference += difference;
              invoiceUpdated = true;

              if (!invoiceUpdated || index === 0) {
                console.log(`   📝 Invoice ${invoice.invoiceNumber}:`);
              }
              console.log(`      Item: ${name}`);
              console.log(`      Price: ${oldPrice} → ${newPrice} ETB (difference: ${difference.toFixed(2)} ETB)`);
            }
          }
        });

        if (invoiceUpdated) {
          // Mark items array as modified for Mongoose
          invoice.markModified('items');

          // Recalculate invoice totals
          const oldSubtotal = invoice.subtotal;
          const oldTotal = invoice.total;

          invoice.subtotal = invoice.items.reduce((sum, item) => {
            return sum + (item.totalPrice || item.total || (item.unitPrice || 0) * (item.quantity || 1));
          }, 0);

          invoice.total = invoice.subtotal;

          // Recalculate balance (only if not fully paid)
          if (invoice.status !== 'paid') {
            const oldBalance = invoice.balance;
            invoice.balance = Math.max(0, invoice.total - (invoice.amountPaid || 0));
            
            // Update status if balance is now 0
            if (invoice.balance === 0 && invoice.amountPaid >= invoice.total) {
              invoice.status = 'paid';
            } else if (invoice.balance > 0 && invoice.amountPaid > 0) {
              invoice.status = 'partial';
            }

            console.log(`      Subtotal: ${oldSubtotal} → ${invoice.subtotal} ETB`);
            console.log(`      Total: ${oldTotal} → ${invoice.total} ETB`);
            console.log(`      Balance: ${oldBalance} → ${invoice.balance} ETB`);
            console.log(`      Status: ${invoice.status}`);
          } else {
            // For paid invoices, just update the totals for record-keeping
            console.log(`      Subtotal: ${oldSubtotal} → ${invoice.subtotal} ETB`);
            console.log(`      Total: ${oldTotal} → ${invoice.total} ETB`);
            console.log(`      Status: ${invoice.status} (already paid - totals updated for record)`);
          }

          await invoice.save();
          updatedInvoices++;
          totalPriceDifference += priceDifference;
          console.log(`      ✅ Invoice updated\n`);
        }
      } catch (error) {
        console.error(`   ❌ Error updating invoice ${invoice.invoiceNumber}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updatedInvoices} invoices`);
    console.log(`   💰 Total price difference: ${totalPriceDifference.toFixed(2)} ETB`);
    console.log(`   📝 Total processed: ${invoices.length} invoices`);

    await mongoose.connection.close();
    console.log('\n✅ Script completed successfully');
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
  fixInvoicePrices();
}

module.exports = fixInvoicePrices;

