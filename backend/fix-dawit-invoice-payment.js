const mongoose = require('mongoose');
const MedicalInvoice = require('./models/MedicalInvoice');
const LabOrder = require('./models/LabOrder');

mongoose.connect('mongodb://localhost:27017/clinic-cms');

async function fixDawitInvoicePayment() {
  try {
    console.log('🔧 Fixing Dawit\'s lab invoice payment...');
    
    // Find Dawit's lab invoice
    const labInvoice = await MedicalInvoice.findOne({
      invoiceNumber: 'INV-24-07-25-1389-vbn9'
    });
    
    if (!labInvoice) {
      console.log('❌ Lab invoice not found');
      return;
    }
    
    console.log(`\n📄 Found invoice: ${labInvoice.invoiceNumber}`);
    console.log(`   Current Status: ${labInvoice.status}`);
    console.log(`   Amount Paid: ${labInvoice.amountPaid} ETB`);
    console.log(`   Balance: ${labInvoice.balance} ETB`);
    console.log(`   Total: ${labInvoice.total} ETB`);
    
    // Add payment to the invoice
    const paymentData = {
      amount: labInvoice.total,
      method: 'cash',
      reference: 'LAB-PAYMENT-' + Date.now(),
      date: new Date(),
      notes: 'Lab tests payment',
      processedBy: '682461b58a2bfb0a7539984c' // Reception user
    };
    
    console.log('\n💰 Adding payment to invoice...');
    await labInvoice.addPayment(paymentData);
    
    // Update the invoice status
    labInvoice.status = 'paid';
    labInvoice.paidDate = new Date();
    labInvoice.amountPaid = labInvoice.total;
    labInvoice.balance = 0;
    
    await labInvoice.save();
    
    console.log(`   ✅ Payment added: ${paymentData.amount} ETB`);
    console.log(`   ✅ Status updated: ${labInvoice.status}`);
    console.log(`   ✅ Amount Paid: ${labInvoice.amountPaid} ETB`);
    console.log(`   ✅ Balance: ${labInvoice.balance} ETB`);
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    
    const updatedInvoice = await MedicalInvoice.findById(labInvoice._id);
    console.log(`\n📊 Final Invoice Status:`);
    console.log(`   📄 Invoice: ${updatedInvoice.invoiceNumber}`);
    console.log(`   💰 Total: ${updatedInvoice.total} ETB`);
    console.log(`   💳 Amount Paid: ${updatedInvoice.amountPaid} ETB`);
    console.log(`   ⚖️  Balance: ${updatedInvoice.balance} ETB`);
    console.log(`   📊 Status: ${updatedInvoice.status}`);
    console.log(`   📅 Paid Date: ${updatedInvoice.paidDate}`);
    console.log(`   💳 Payments: ${updatedInvoice.payments.length}`);
    
    if (updatedInvoice.payments.length > 0) {
      updatedInvoice.payments.forEach((payment, index) => {
        console.log(`\n   Payment ${index + 1}:`);
        console.log(`     Amount: ${payment.amount} ETB`);
        console.log(`     Method: ${payment.method}`);
        console.log(`     Date: ${payment.date}`);
        console.log(`     Reference: ${payment.reference}`);
      });
    }
    
    if (updatedInvoice.status === 'paid' && updatedInvoice.balance === 0) {
      console.log('\n🎉 SUCCESS: Dawit\'s lab invoice payment fixed!');
      console.log('   ✅ Payment properly recorded');
      console.log('   ✅ Invoice shows as fully paid');
      console.log('   ✅ Balance is zero');
      console.log('   ✅ Ready to appear in billing interface');
    } else {
      console.log('\n⚠️  WARNING: Some issues remain with the payment');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixDawitInvoicePayment(); 
 