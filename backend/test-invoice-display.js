const mongoose = require('mongoose');
const MedicalInvoice = require('./models/MedicalInvoice');

async function testInvoiceDisplay() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to database');
    console.log('🔍 Testing invoice display enhancements...\n');

    // Find the invoice for melody Natan
    const invoice = await MedicalInvoice.findOne({
      'patientName': { $regex: /melody/i }
    }).populate('patient');

    if (!invoice) {
      console.log('❌ No invoice found for melody Natan');
      return;
    }

    console.log('📋 Invoice Details:');
    console.log(`   Invoice Number: ${invoice.invoiceNumber}`);
    console.log(`   Patient: ${invoice.patientName}`);
    console.log(`   Total Amount: ETB ${invoice.total}`);
    console.log(`   Amount Paid: ETB ${invoice.amountPaid || 0}`);
    console.log(`   Balance: ETB ${invoice.balance || 0}`);
    console.log(`   Status: ${invoice.status}`);
    console.log(`   Is Consolidated: ${invoice.isConsolidated || false}`);
    console.log(`   Issue Date: ${new Date(invoice.issueDate).toLocaleString()}`);

    console.log('\n📦 Invoice Items:');
    invoice.items.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.description}`);
      console.log(`      Quantity: ${item.quantity}`);
      console.log(`      Unit Price: ETB ${item.unitPrice}`);
      console.log(`      Total: ETB ${item.total}`);
    });

    if (invoice.payments && invoice.payments.length > 0) {
      console.log('\n💰 Payment History:');
      invoice.payments.forEach((payment, index) => {
        console.log(`   ${index + 1}. ETB ${payment.amount} - ${payment.method} - ${new Date(payment.date).toLocaleString()}`);
        console.log(`      Reference: ${payment.reference}`);
        console.log(`      Notes: ${payment.notes || 'N/A'}`);
      });
    }

    console.log('\n🎯 Payment Status Analysis:');
    const totalAmount = invoice.total || 0;
    const amountPaid = invoice.amountPaid || 0;
    const balance = invoice.balance || 0;
    const paymentPercentage = totalAmount > 0 ? Math.round((amountPaid / totalAmount) * 100) : 0;

    console.log(`   Total Amount: ETB ${totalAmount}`);
    console.log(`   Amount Paid: ETB ${amountPaid}`);
    console.log(`   Balance Due: ETB ${balance}`);
    console.log(`   Payment Percentage: ${paymentPercentage}%`);

    if (invoice.status === 'paid') {
      console.log('   ✅ Invoice Status: FULLY PAID');
    } else if (invoice.status === 'partial') {
      console.log('   ⚠️ Invoice Status: PARTIALLY PAID');
      console.log(`   📊 ${paymentPercentage}% of total amount has been paid`);
    } else {
      console.log('   ❌ Invoice Status: UNPAID');
    }

    console.log('\n🎉 Invoice display test completed!');
    console.log('💡 The frontend should now show:');
    console.log('   - Clear payment status for each item');
    console.log('   - Visual indicators (✓ for paid items)');
    console.log('   - Payment status badges (Fully Paid/Partially Paid/Unpaid)');
    console.log('   - Payment summary section for partial payments');
    console.log('   - Enhanced status display at the top');

  } catch (error) {
    console.error('❌ Error testing invoice display:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testInvoiceDisplay(); 