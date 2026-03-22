const mongoose = require('mongoose');

async function fixLabOrdersUtility() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to database');
    
    const LabOrder = require('./backend/models/LabOrder');
    const MedicalInvoice = require('./backend/models/MedicalInvoice');
    
    console.log('\n=== FIXING LAB ORDERS UTILITY ===\n');
    
    // 1. Find lab orders that are paid but still have 'Pending Payment' status
    const problematicOrders = await LabOrder.find({
      status: 'Pending Payment',
      paymentStatus: { $in: ['paid', 'partially_paid'] }
    });
    
    console.log(`Found ${problematicOrders.length} lab orders with inconsistent status`);
    
    if (problematicOrders.length > 0) {
      console.log('\n=== FIXING INCONSISTENT ORDERS ===');
      
      for (const order of problematicOrders) {
        console.log(`Fixing order ${order._id} - ${order.testName}`);
        
        // Update status to 'Ordered' to make it visible in lab dashboard
        order.status = 'Ordered';
        order.updatedAt = new Date();
        
        await order.save();
        console.log(`✅ Fixed order ${order._id} - Status: ${order.status}, Payment: ${order.paymentStatus}`);
      }
    }
    
    // 2. Find lab orders that are paid but don't have invoice links
    const orphanedOrders = await LabOrder.find({
      paymentStatus: { $in: ['paid', 'partially_paid'] },
      $or: [
        { invoiceId: { $exists: false } },
        { invoiceId: null }
      ]
    });
    
    console.log(`\nFound ${orphanedOrders.length} paid lab orders without invoice links`);
    
    if (orphanedOrders.length > 0) {
      console.log('\n=== FIXING ORPHANED ORDERS ===');
      
      for (const order of orphanedOrders) {
        console.log(`Processing orphaned order ${order._id} - ${order.testName}`);
        
        // Try to find a matching invoice
        const matchingInvoice = await MedicalInvoice.findOne({
          'items.metadata.labOrderId': order._id
        });
        
        if (matchingInvoice) {
          order.invoiceId = matchingInvoice._id;
          order.updatedAt = new Date();
          await order.save();
          console.log(`✅ Linked order ${order._id} to invoice ${matchingInvoice.invoiceNumber}`);
        } else {
          console.log(`⚠️ No matching invoice found for order ${order._id}`);
        }
      }
    }
    
    // 3. Summary of current state
    const paidOrders = await LabOrder.find({ paymentStatus: 'paid' });
    const partiallyPaidOrders = await LabOrder.find({ paymentStatus: 'partially_paid' });
    const pendingOrders = await LabOrder.find({ paymentStatus: 'pending' });
    
    console.log('\n=== FINAL SUMMARY ===');
    console.log(`Paid orders: ${paidOrders.length}`);
    console.log(`Partially paid orders: ${partiallyPaidOrders.length}`);
    console.log(`Pending orders: ${pendingOrders.length}`);
    
    const visibleInLabDashboard = paidOrders.length + partiallyPaidOrders.length;
    console.log(`\nOrders visible in lab dashboard: ${visibleInLabDashboard}`);
    
    await mongoose.disconnect();
    console.log('\n=== UTILITY COMPLETE ===');
    
  } catch (error) {
    console.error('Error during utility execution:', error);
  }
}

// Run the utility
fixLabOrdersUtility();
