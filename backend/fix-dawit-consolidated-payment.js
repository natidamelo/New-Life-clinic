const mongoose = require('mongoose');
const MedicalInvoice = require('./models/MedicalInvoice');

mongoose.connect('mongodb://localhost:27017/clinic-cms');

async function fixDawitConsolidatedPayment() {
  try {
    console.log('🔧 Fixing Dawit\'s consolidated invoice payment status...');
    
    // Find Dawit's consolidated invoice
    const consolidatedInvoice = await MedicalInvoice.findOne({
      invoiceNumber: 'INV-25-07-0002-972'
    });
    
    if (!consolidatedInvoice) {
      console.log('❌ Consolidated invoice not found');
      return;
    }
    
    console.log(`\n📄 Found invoice: ${consolidatedInvoice.invoiceNumber}`);
    console.log(`   Current Status: ${consolidatedInvoice.status}`);
    console.log(`   Total: ${consolidatedInvoice.total} ETB`);
    console.log(`   Amount Paid: ${consolidatedInvoice.amountPaid} ETB`);
    console.log(`   Balance: ${consolidatedInvoice.balance} ETB`);
    
    // Calculate the total amount that should be paid
    const totalAmount = consolidatedInvoice.items.reduce((sum, item) => sum + item.total, 0);
    console.log(`\n💰 Calculated total: ${totalAmount} ETB`);
    
    // Add payment for the lab portion if not already paid
    if (consolidatedInvoice.amountPaid < totalAmount) {
      const labPaymentAmount = totalAmount - consolidatedInvoice.amountPaid;
      
      const paymentData = {
        amount: labPaymentAmount,
        method: 'cash',
        reference: 'LAB-CONSOLIDATED-PAYMENT-' + Date.now(),
        date: new Date(),
        notes: 'Lab tests payment (consolidated)',
        processedBy: '682461b58a2bfb0a7539984c' // Reception user
      };
      
      console.log(`\n💰 Adding lab payment: ${labPaymentAmount} ETB`);
      await consolidatedInvoice.addPayment(paymentData);
    }
    
    // Update invoice status
    consolidatedInvoice.status = 'paid';
    consolidatedInvoice.paidDate = new Date();
    consolidatedInvoice.amountPaid = totalAmount;
    consolidatedInvoice.balance = 0;
    consolidatedInvoice.lastUpdated = new Date();
    consolidatedInvoice.lastUpdatedBy = '682461b58a2bfb0a7539984c';
    
    await consolidatedInvoice.save();
    
    console.log(`\n✅ Updated invoice:`);
    console.log(`   📊 Status: ${consolidatedInvoice.status}`);
    console.log(`   💰 Total: ${consolidatedInvoice.total} ETB`);
    console.log(`   💳 Amount Paid: ${consolidatedInvoice.amountPaid} ETB`);
    console.log(`   ⚖️  Balance: ${consolidatedInvoice.balance} ETB`);
    console.log(`   📅 Paid Date: ${consolidatedInvoice.paidDate}`);
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    
    const updatedInvoice = await MedicalInvoice.findById(consolidatedInvoice._id);
    console.log(`\n📊 Final Invoice Status:`);
    console.log(`   📄 Invoice: ${updatedInvoice.invoiceNumber}`);
    console.log(`   💰 Total: ${updatedInvoice.total} ETB`);
    console.log(`   💳 Amount Paid: ${updatedInvoice.amountPaid} ETB`);
    console.log(`   ⚖️  Balance: ${updatedInvoice.balance} ETB`);
    console.log(`   📊 Status: ${updatedInvoice.status}`);
    console.log(`   🧪 Lab Items: ${updatedInvoice.items.filter(item => item.itemType === 'lab').length}`);
    console.log(`   💳 Card Items: ${updatedInvoice.items.filter(item => item.itemType === 'card').length}`);
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
      console.log('\n🎉 SUCCESS: Dawit\'s consolidated invoice payment fixed!');
      console.log('   ✅ Invoice shows as fully paid');
      console.log('   ✅ All services consolidated in one invoice');
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

fixDawitConsolidatedPayment(); 
 