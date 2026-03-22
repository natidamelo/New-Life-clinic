// Manual fix for Natan Kinfe's BID medication extension invoice
// This script can be run manually in the MongoDB shell or database tool

console.log('🔧 Manual fix for Natan Kinfe\'s BID medication extension invoice');
console.log('Copy and paste these commands into your MongoDB shell or database tool:');

console.log('\n1. First, find the invoice:');
console.log(`
db.medicalinvoices.findOne({
  invoiceNumber: { $regex: /1756132268415/ }
})
`);

console.log('\n2. If found, update the invoice with correct BID calculation:');
console.log(`
db.medicalinvoices.updateOne(
  { invoiceNumber: { $regex: /1756132268415/ } },
  {
    $set: {
      "items.0.quantity": 6,
      "items.0.total": 1800,
      "items.0.description": "Medication Extension - Dexamethasone (+3 days × 2 doses/day = 6 total doses)",
      "items.0.metadata.dosesPerDay": 2,
      "items.0.metadata.frequency": "BID (twice daily)",
      "items.0.metadata.additionalDoses": 6,
      "items.0.metadata.totalDoses": 6,
      "subtotal": 1800,
      "total": 1800,
      "balance": 1800,
      "status": "pending",
      "extensionDetails.dosesPerDay": 2,
      "extensionDetails.frequency": "BID (twice daily)",
      "extensionDetails.explicitAdditionalDoses": 6,
      "extensionDetails.totalDoses": 6,
      "extensionDetails.extensionType": "dose-based"
    }
  }
)
`);

console.log('\n3. Verify the fix:');
console.log(`
db.medicalinvoices.findOne(
  { invoiceNumber: { $regex: /1756132268415/ } },
  { 
    invoiceNumber: 1, 
    "items.description": 1, 
    "items.quantity": 1, 
    "items.total": 1, 
    total: 1, 
    balance: 1 
  }
)
`);

console.log('\n4. Alternative: Find all recent extension invoices and check for similar issues:');
console.log(`
db.medicalinvoices.find({
  isExtension: true,
  createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
}).sort({ createdAt: -1 }).limit(10).forEach(function(invoice) {
  print("Invoice: " + invoice.invoiceNumber);
  if (invoice.items && invoice.items.length > 0) {
    var item = invoice.items[0];
    print("  Description: " + item.description);
    print("  Quantity: " + item.quantity);
    print("  Total: " + item.total);
    if (item.metadata) {
      print("  Doses Per Day: " + item.metadata.dosesPerDay);
      print("  Frequency: " + item.metadata.frequency);
    }
  }
  print("---");
})
`);

console.log('\n5. Fix all BID calculation issues (if any found):');
console.log(`
db.medicalinvoices.updateMany(
  {
    isExtension: true,
    "items.metadata.extension": true,
    "items.description": { $regex: /1 dose\\/day/ }
  },
  {
    $set: {
      "items.0.quantity": { $multiply: ["$items.0.quantity", 2] },
      "items.0.total": { $multiply: ["$items.0.total", 2] },
      "items.0.metadata.dosesPerDay": 2,
      "items.0.metadata.frequency": "BID (twice daily)"
    }
  }
)
`);

console.log('\n✅ After running these commands, the invoice should show:');
console.log('   - Quantity: 6 doses (instead of 3)');
console.log('   - Total: ETB 1,800 (instead of ETB 900)');
console.log('   - Description: "Medication Extension - Dexamethasone (+3 days × 2 doses/day = 6 total doses)"');
console.log('   - Balance: ETB 1,800');

console.log('\n🔗 You can then view the corrected invoice at:');
console.log('   http://localhost:5175/app/billing/invoices/[invoice-id]');
