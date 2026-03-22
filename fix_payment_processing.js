const mongoose = require('mongoose');

async function fixPaymentProcessing() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to database');
    
    const MedicalInvoice = require('./backend/models/MedicalInvoice');
    const LabOrder = require('./backend/models/LabOrder');
    
    console.log('\n=== FIXING PAYMENT PROCESSING ISSUES ===\n');
    
    // 1. Find the problematic invoice
    const invoiceId = '68bd8e3359c71438dadab0f5';
    const invoice = await MedicalInvoice.findById(invoiceId);
    
    if (!invoice) {
      console.log(`❌ Invoice ${invoiceId} not found`);
      await mongoose.disconnect();
      return;
    }
    
    console.log(`Found invoice: ${invoice.invoiceNumber}`);
    console.log(`Patient: ${invoice.patientName}`);
    console.log(`Total: ${invoice.total} ETB`);
    console.log(`Amount Paid: ${invoice.amountPaid || 0} ETB`);
    console.log(`Balance: ${invoice.balance} ETB`);
    console.log(`Status: ${invoice.status}`);
    
    // 2. Check for data inconsistencies
    const totalPayments = (invoice.payments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const calculatedAmountPaid = Math.max(0, invoice.amountPaid || 0);
    const actualAmountPaid = Math.max(totalPayments, calculatedAmountPaid);
    const expectedBalance = Math.max(0, invoice.total - actualAmountPaid);
    
    console.log('\n=== DATA CONSISTENCY CHECK ===');
    console.log(`Payments array total: ${totalPayments} ETB`);
    console.log(`Stored amount paid: ${calculatedAmountPaid} ETB`);
    console.log(`Actual amount paid: ${actualAmountPaid} ETB`);
    console.log(`Stored balance: ${invoice.balance} ETB`);
    console.log(`Expected balance: ${expectedBalance} ETB`);
    
    const hasInconsistency = Math.abs(invoice.balance - expectedBalance) > 0.01;
    console.log(`Has inconsistency: ${hasInconsistency}`);
    
    if (hasInconsistency) {
      console.log('\n=== FIXING DATA INCONSISTENCY ===');
      invoice.amountPaid = actualAmountPaid;
      invoice.balance = expectedBalance;
      
      // Update status based on balance
      if (expectedBalance <= 0.01) {
        invoice.status = 'paid';
      } else if (actualAmountPaid > 0) {
        invoice.status = 'partial';
      } else {
        invoice.status = 'pending';
      }
      
      await invoice.save();
      console.log(`✅ Fixed invoice data inconsistency`);
      console.log(`New balance: ${invoice.balance} ETB`);
      console.log(`New status: ${invoice.status}`);
    }
    
    // 3. Check if this is a lab invoice
    const labItems = invoice.items.filter(item => item.itemType === 'lab');
    console.log(`\n=== LAB ITEMS CHECK ===`);
    console.log(`Lab items in invoice: ${labItems.length}`);
    
    if (labItems.length > 0) {
      console.log('Lab items:');
      labItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.serviceName}: ${item.totalPrice} ETB`);
        if (item.metadata && item.metadata.labOrderId) {
          console.log(`     Lab Order ID: ${item.metadata.labOrderId}`);
        }
      });
      
      // 4. Check corresponding lab orders
      const labOrderIds = labItems
        .filter(item => item.metadata && item.metadata.labOrderId)
        .map(item => item.metadata.labOrderId);
      
      if (labOrderIds.length > 0) {
        console.log(`\n=== LAB ORDERS CHECK ===`);
        const labOrders = await LabOrder.find({ _id: { $in: labOrderIds } });
        console.log(`Found ${labOrders.length} lab orders`);
        
        labOrders.forEach((order, index) => {
          console.log(`  ${index + 1}. ${order.testName}`);
          console.log(`     Status: ${order.status}`);
          console.log(`     Payment Status: ${order.paymentStatus}`);
          console.log(`     Total Price: ${order.totalPrice} ETB`);
          console.log(`     Paid At: ${order.paidAt || 'Not paid'}`);
        });
        
        // 5. Fix lab order status if needed
        const needsUpdate = labOrders.filter(order => 
          order.status === 'Pending Payment' && 
          (order.paymentStatus === 'paid' || order.paymentStatus === 'partially_paid')
        );
        
        if (needsUpdate.length > 0) {
          console.log(`\n=== FIXING LAB ORDER STATUS ===`);
          for (const order of needsUpdate) {
            order.status = 'Ordered';
            order.updatedAt = new Date();
            await order.save();
            console.log(`✅ Updated lab order ${order.testName} status to 'Ordered'`);
          }
        }
      }
    }
    
    // 6. Test payment processing
    console.log(`\n=== PAYMENT PROCESSING TEST ===`);
    console.log(`Current balance: ${invoice.balance} ETB`);
    console.log(`You can now try to process a payment for up to ${invoice.balance} ETB`);
    
    if (invoice.balance > 0) {
      console.log(`\nTo test payment processing:`);
      console.log(`1. Go to the billing/invoices page`);
      console.log(`2. Find invoice ${invoice.invoiceNumber}`);
      console.log(`3. Try to pay ${invoice.balance} ETB or less`);
      console.log(`4. Check if the lab order appears in the lab dashboard`);
    } else {
      console.log(`\n✅ Invoice is already fully paid!`);
      console.log(`Lab orders should be visible in the lab dashboard.`);
    }
    
    await mongoose.disconnect();
    console.log('\n=== FIX COMPLETE ===');
    
  } catch (error) {
    console.error('Error during fix:', error);
  }
}

fixPaymentProcessing();
