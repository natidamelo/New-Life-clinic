const mongoose = require('mongoose');
const MedicalInvoice = require('./models/MedicalInvoice');
const LabOrder = require('./models/LabOrder');

mongoose.connect('mongodb://localhost:27017/clinic-cms');

async function searchAllLabInvoices() {
  try {
    console.log('🔍 Searching for all lab invoices...');
    
    // Search for invoices with lab items
    const labInvoices = await MedicalInvoice.find({
      'items.itemType': 'lab'
    }).sort({ createdAt: -1 });
    
    console.log(`\n🔬 Found ${labInvoices.length} invoices with lab items:`);
    
    if (labInvoices.length > 0) {
      labInvoices.forEach((invoice, index) => {
        console.log(`\n${index + 1}. Invoice: ${invoice.invoiceNumber}`);
        console.log(`   Patient: ${invoice.patientName}`);
        console.log(`   Status: ${invoice.status}`);
        console.log(`   Total: ${invoice.total} ETB`);
        console.log(`   Amount Paid: ${invoice.amountPaid} ETB`);
        console.log(`   Balance: ${invoice.balance} ETB`);
        console.log(`   Type: ${invoice.type || 'undefined'}`);
        console.log(`   Created: ${invoice.createdAt}`);
        console.log(`   Issue Date: ${invoice.issueDate}`);
        
        if (invoice.items && invoice.items.length > 0) {
          console.log('   Lab Items:');
          invoice.items.forEach((item, itemIndex) => {
            if (item.itemType === 'lab') {
              console.log(`     ${itemIndex + 1}. ${item.serviceName}`);
              console.log(`         Description: ${item.description}`);
              console.log(`         Price: ${item.totalPrice} ETB`);
            }
          });
        }
        
        if (invoice.payments && invoice.payments.length > 0) {
          console.log('   Payments:');
          invoice.payments.forEach((payment, payIndex) => {
            console.log(`     ${payIndex + 1}. ${payment.amount} ETB - ${payment.method} - ${payment.date}`);
          });
        }
      });
    }
    
    // Also search for all lab orders
    const allLabOrders = await LabOrder.find({}).sort({ createdAt: -1 });
    console.log(`\n🧪 Total lab orders in system: ${allLabOrders.length}`);
    
    const paidLabOrders = await LabOrder.find({
      paymentStatus: { $in: ['paid', 'partially_paid'] }
    });
    console.log(`💰 Lab orders with payment status: ${paidLabOrders.length}`);
    
    if (paidLabOrders.length > 0) {
      console.log('\n📋 Lab Orders with Payments:');
      paidLabOrders.forEach((order, index) => {
        console.log(`\n${index + 1}. Lab Order: ${order._id}`);
        console.log(`   Patient ID: ${order.patientId}`);
        console.log(`   Test: ${order.testName}`);
        console.log(`   Payment Status: ${order.paymentStatus}`);
        console.log(`   Total Price: ${order.totalPrice} ETB`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Paid At: ${order.paidAt}`);
      });
    }
    
    // Search for any invoices with "lab" in the name or description
    const labRelatedInvoices = await MedicalInvoice.find({
      $or: [
        { patientName: { $regex: /lab/i } },
        { 'items.description': { $regex: /lab/i } },
        { 'items.serviceName': { $regex: /lab/i } }
      ]
    });
    
    console.log(`\n🔍 Invoices with "lab" in name/description: ${labRelatedInvoices.length}`);
    
    if (labRelatedInvoices.length > 0) {
      labRelatedInvoices.forEach((invoice, index) => {
        console.log(`\n${index + 1}. ${invoice.invoiceNumber}`);
        console.log(`   Patient: ${invoice.patientName}`);
        console.log(`   Status: ${invoice.status}`);
        console.log(`   Total: ${invoice.total} ETB`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

searchAllLabInvoices(); 
 