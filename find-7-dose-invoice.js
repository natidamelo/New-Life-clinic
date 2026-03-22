const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'clinic-cms';

async function find7DoseInvoice() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    
    // Find the specific 7-dose invoice for Semhal
    console.log('\n🔍 FINDING 7-DOSE INVOICE FOR SEMHAL:');
    const sevenDoseInvoices = await db.collection('medicalinvoices').find({
      patientId: '68b17fd748c353ce9024293f',
      'items.quantity': 7,
      'items.description': { $regex: /Ceftriaxone.*7 doses/i }
    }).toArray();
    
    console.log(`📄 Found ${sevenDoseInvoices.length} invoices with 7 doses of Ceftriaxone`);
    
    for (const invoice of sevenDoseInvoices) {
      console.log(`\n📋 Invoice ID: ${invoice._id}`);
      console.log(`📊 Invoice Status: ${invoice.status}`);
      console.log(`💰 Total Amount: ${invoice.totalAmount || 'Not set'}`);
      console.log(`💵 Amount Paid: ${invoice.amountPaid || 0}`);
      console.log(`⚖️ Balance: ${invoice.balance || 0}`);
      console.log(`📅 Invoice Date: ${invoice.invoiceDate || 'Not set'}`);
      
      if (invoice.items && invoice.items.length > 0) {
        console.log('📦 Invoice Items:');
        invoice.items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.description}`);
          console.log(`     Type: ${item.itemType}`);
          console.log(`     Quantity: ${item.quantity}`);
          console.log(`     Unit Price: ${item.unitPrice}`);
          console.log(`     Total: ${item.total}`);
          if (item.metadata && item.metadata.prescriptionId) {
            console.log(`     Prescription ID: ${item.metadata.prescriptionId}`);
          }
        });
      }
      
      // Check if this invoice has any payments
      const payments = await db.collection('payments').find({
        invoiceId: invoice._id
      }).toArray();
      
      if (payments.length > 0) {
        console.log(`💳 Found ${payments.length} payment records for this invoice`);
        payments.forEach(payment => {
          console.log(`  - Amount: ${payment.amount}, Status: ${payment.status}, Date: ${payment.paymentDate}`);
        });
      } else {
        console.log('💳 No payment records found for this invoice');
      }
    }

    // Also check for any invoice with exactly 350 ETB total (7 doses × 50 ETB)
    console.log('\n🔍 CHECKING FOR INVOICES WITH 350 ETB TOTAL:');
    const invoicesWith350 = await db.collection('medicalinvoices').find({
      patientId: '68b17fd748c353ce9024293f',
      $or: [
        { totalAmount: 350 },
        { balance: 350 },
        { 'items.total': 350 }
      ]
    }).toArray();
    
    console.log(`📄 Found ${invoicesWith350.length} invoices with 350 ETB total`);
    
    for (const invoice of invoicesWith350) {
      console.log(`\n📋 Invoice ID: ${invoice._id}`);
      console.log(`📊 Status: ${invoice.status}`);
      console.log(`💰 Total: ${invoice.totalAmount || 'Not set'}`);
      console.log(`💵 Paid: ${invoice.amountPaid || 0}`);
      console.log(`⚖️ Balance: ${invoice.balance || 0}`);
    }

    console.log('\n🎯 SOLUTION:');
    console.log('To fix the payment status mismatch, you need to:');
    console.log('1. Find the 7-dose invoice (350 ETB) for Semhal');
    console.log('2. Process payment for that invoice');
    console.log('3. The prescription and nurse task payment status will then sync');

  } catch (error) {
    console.error('❌ Error finding 7-dose invoice:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the search
find7DoseInvoice();
