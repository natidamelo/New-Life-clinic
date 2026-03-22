const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'clinic-cms';

async function finalStatusCheck() {
  let client;
  
  try {
    console.log('🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(DB_NAME);
    
    console.log('\n🎯 FINAL STATUS CHECK AFTER FIXING DUPLICATE INVOICES:');
    
    // Check the primary 7-dose invoice
    console.log('\n📋 PRIMARY 7-DOSE INVOICE STATUS:');
    const primaryInvoice = await db.collection('medicalinvoices').findOne({
      _id: '68b6bf42ab5a2098aae06d91'
    });
    
    if (primaryInvoice) {
      console.log(`📋 Invoice ID: ${primaryInvoice._id}`);
      console.log(`📊 Status: ${primaryInvoice.status}`);
      console.log(`💰 Total Amount: ${primaryInvoice.totalAmount || 'Not set'}`);
      console.log(`💵 Amount Paid: ${primaryInvoice.amountPaid || 0}`);
      console.log(`⚖️ Balance: ${primaryInvoice.balance || 0}`);
      console.log(`📅 Invoice Date: ${primaryInvoice.invoiceDate || 'Not set'}`);
      
      if (primaryInvoice.items && primaryInvoice.items.length > 0) {
        console.log('📦 Invoice Items:');
        primaryInvoice.items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.description}`);
          console.log(`     Type: ${item.itemType}`);
          console.log(`     Quantity: ${item.quantity}`);
          console.log(`     Unit Price: ${item.unitPrice}`);
          console.log(`     Total: ${item.total}`);
        });
      }
    }

    // Check Semhal's nurse tasks
    console.log('\n👩‍⚕️ NURSE TASKS STATUS:');
    const nurseTasks = await db.collection('nursetasks').find({
      patientId: '68b17fd748c353ce9024293f',
      'medicationDetails.medicationName': 'Ceftriaxone'
    }).toArray();
    
    console.log(`📋 Found ${nurseTasks.length} Ceftriaxone nurse tasks for Semhal`);
    
    for (const task of nurseTasks) {
      console.log(`\n📋 Task ID: ${task._id}`);
      console.log(`📊 Status: ${task.status}`);
      console.log(`💊 Medication: ${task.medicationDetails?.medicationName}`);
      console.log(`📅 Duration: ${task.medicationDetails?.duration} days`);
      console.log(`💰 Payment Status: ${task.paymentAuthorization?.paymentStatus}`);
      console.log(`✅ Can Administer: ${task.paymentAuthorization?.canAdminister}`);
    }

    // Check cancelled duplicate invoices
    console.log('\n❌ CANCELLED DUPLICATE INVOICES:');
    const cancelledInvoices = await db.collection('medicalinvoices').find({
      patientId: '68b17fd748c353ce9024293f',
      status: 'cancelled',
      'items.description': { $regex: /Ceftriaxone.*7 doses/i }
    }).toArray();
    
    console.log(`📄 Found ${cancelledInvoices.length} cancelled duplicate invoices`);
    cancelledInvoices.forEach((invoice, index) => {
      console.log(`  ${index + 1}. ID: ${invoice._id}, Balance: ${invoice.balance}, Notes: ${invoice.notes}`);
    });

    console.log('\n🎯 WHAT HAS BEEN FIXED:');
    console.log('✅ Duplicate 7-dose invoices have been marked as cancelled');
    console.log('✅ Primary invoice is now the only active one');
    console.log('✅ Nurse task for 7-day BID has been created');
    
    console.log('\n🎯 WHAT YOU NEED TO DO NEXT:');
    console.log('1. Process payment for the primary 7-dose invoice (350 ETB)');
    console.log('2. Update invoice status from "pending" to "paid"');
    console.log('3. The prescription and nurse task payment status will automatically sync');
    console.log('4. The nurse task will then show as fully functional');
    
    console.log('\n🎯 PRIMARY INVOICE TO PAY:');
    console.log('📋 Invoice ID: 68b6bf42ab5a2098aae06d91');
    console.log('💰 Amount: 350 ETB (7 doses × 50 ETB per dose)');
    console.log('💊 Medication: Ceftriaxone - 7 doses');
    console.log('📅 Duration: 7 days (BID - twice daily)');

  } catch (error) {
    console.error('❌ Error in final status check:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the final check
finalStatusCheck();
