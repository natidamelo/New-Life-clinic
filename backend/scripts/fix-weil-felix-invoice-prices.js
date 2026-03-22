/**
 * Fixes invoice line items for Weil-Felix Test that show 99.99 instead of 100.
 * Updates unitPrice and total on matching invoice items, then recalculates invoice totals.
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

let MONGO_URI;
try {
  const config = require('../config');
  MONGO_URI = config.MONGODB_URI || config.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URI;
} catch (error) {
  MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
}

if (!MONGO_URI) {
  console.error('MongoDB URI not found');
  process.exit(1);
}

const MedicalInvoice = require('../models/MedicalInvoice');

async function fixWeilFelixInvoicePrices() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB\n');

  const CORRECT_PRICE = 100;

  // Find all invoices that have a Weil-Felix line item priced at 99.99
  const invoices = await MedicalInvoice.find({
    'items.description': { $regex: /weil-felix/i },
    'items.unitPrice': { $gte: 99.98, $lte: 99.995 }
  });

  console.log(`Found ${invoices.length} invoice(s) with Weil-Felix priced at 99.99\n`);

  let updatedInvoices = 0;

  for (const invoice of invoices) {
    let changed = false;

    invoice.items.forEach(item => {
      if (/weil-felix/i.test(item.description) && item.unitPrice >= 99.98 && item.unitPrice <= 99.995) {
        const oldPrice = item.unitPrice;
        item.unitPrice = CORRECT_PRICE;
        item.total = item.quantity * CORRECT_PRICE;
        console.log(`  Invoice ${invoice._id}: updated item "${item.description}" from ${oldPrice} → ${CORRECT_PRICE} ETB`);
        changed = true;
      }
    });

    if (changed) {
      // Recalculate invoice totals
      invoice.subtotal = invoice.items.reduce((sum, item) => sum + (item.total || 0), 0);
      invoice.totalAmount = invoice.subtotal - (invoice.discountTotal || 0) + (invoice.taxTotal || 0);

      // Mark items array as modified so mongoose saves subdocument changes
      invoice.markModified('items');
      await invoice.save();
      updatedInvoices++;
      console.log(`  Invoice ${invoice._id}: subtotal recalculated to ${invoice.subtotal} ETB\n`);
    }
  }

  console.log(`\nDone. Updated ${updatedInvoices} invoice(s).`);
  await mongoose.connection.close();
}

fixWeilFelixInvoicePrices().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
