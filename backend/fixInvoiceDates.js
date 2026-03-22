const mongoose = require('mongoose');
const MedicalInvoice = require('./models/MedicalInvoice');

const MONGODB_URI = 'mongodb://localhost:27017/clinic-cms';

async function fixInvoiceDates() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('✅ Connected to MongoDB successfully');

    // Step 1: Migrate issueDate to dateIssued if needed
    const migrated = await MedicalInvoice.updateMany(
      { issueDate: { $exists: true }, dateIssued: { $exists: false } },
      [ { $set: { dateIssued: "$issueDate" } } ]
    );
    if (migrated.modifiedCount > 0) {
      console.log(`✅ Migrated ${migrated.modifiedCount} invoices from issueDate to dateIssued`);
    } else {
      console.log('✅ No invoices needed migration from issueDate to dateIssued');
    }

    // Step 2: Fix all invoices with today or future dateIssued
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const futureInvoices = await MedicalInvoice.find({
      dateIssued: { $gte: startOfToday }
    });
    console.log(`🔍 Found ${futureInvoices.length} invoices with today or future dateIssued`);
    if (futureInvoices.length > 0) {
      futureInvoices.forEach(invoice => {
        console.log(`  - Invoice ${invoice.invoiceNumber}: ${invoice.dateIssued.toISOString()}`);
      });
      const result = await MedicalInvoice.updateMany(
        { dateIssued: { $gte: startOfToday } },
        { $set: { dateIssued: now } }
      );
      console.log(`✅ Updated ${result.modifiedCount} invoices to today's date`);
    } else {
      console.log('✅ No invoices with today/future dateIssued found');
    }
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error fixing invoice dates:', error);
    process.exit(1);
  }
}

fixInvoiceDates(); 