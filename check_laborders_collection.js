const mongoose = require('mongoose');

async function checkLabOrdersCollection() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to database');
    
    const LabOrder = require('./backend/models/LabOrder');
    const Patient = require('./backend/models/Patient');
    const MedicalInvoice = require('./backend/models/MedicalInvoice');
    
    console.log('\n=== CHECKING LABORDERS COLLECTION ===\n');
    
    // 1. Check total lab orders
    const totalLabOrders = await LabOrder.countDocuments();
    console.log(`Total lab orders in database: ${totalLabOrders}`);
    
    if (totalLabOrders === 0) {
      console.log('\n❌ NO LAB ORDERS FOUND! This explains why the lab dashboard is empty.');
      console.log('\nPossible reasons:');
      console.log('1. No lab orders have been created yet');
      console.log('2. Lab orders are being created in a different collection');
      console.log('3. Database connection issues during lab order creation');
      console.log('4. Lab order creation is failing silently');
      
      await mongoose.disconnect();
      return;
    }
    
    // 2. Get recent lab orders
    const recentLabOrders = await LabOrder.find({})
      .populate('patient', 'firstName lastName patientId')
      .populate('orderingDoctorId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log('\n=== RECENT LAB ORDERS ===');
    recentLabOrders.forEach((order, index) => {
      console.log(`${index + 1}. ID: ${order._id}`);
      console.log(`   Patient: ${order.patient?.firstName} ${order.patient?.lastName} (${order.patient?.patientId})`);
      console.log(`   Test: ${order.testName}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Payment Status: ${order.paymentStatus}`);
      console.log(`   Total Price: ${order.totalPrice}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Paid At: ${order.paidAt || 'Not paid'}`);
      console.log('---');
    });
    
    // 3. Group by payment status
    const statusGroups = {};
    const allLabOrders = await LabOrder.find({});
    
    allLabOrders.forEach(order => {
      const status = order.paymentStatus || 'undefined';
      if (!statusGroups[status]) statusGroups[status] = [];
      statusGroups[status].push(order);
    });
    
    console.log('\n=== PAYMENT STATUS BREAKDOWN ===');
    Object.keys(statusGroups).forEach(status => {
      console.log(`${status}: ${statusGroups[status].length} orders`);
    });
    
    // 4. Check orders that should be visible in lab dashboard
    const visibleOrders = await LabOrder.find({
      $or: [
        { paymentStatus: 'paid' },
        { paymentStatus: 'partially_paid' }
      ]
    });
    
    console.log(`\nOrders that should be visible in lab dashboard: ${visibleOrders.length}`);
    
    if (visibleOrders.length > 0) {
      console.log('\n=== VISIBLE ORDERS ===');
      visibleOrders.forEach((order, index) => {
        console.log(`${index + 1}. ${order.testName} - ${order.patient?.firstName} ${order.patient?.lastName}`);
        console.log(`   Status: ${order.status}, Payment: ${order.paymentStatus}`);
      });
    } else {
      console.log('\n❌ NO ORDERS VISIBLE IN LAB DASHBOARD!');
      console.log('This means either:');
      console.log('1. No lab orders have been paid yet');
      console.log('2. Payment processing is not updating lab order status');
      console.log('3. Lab orders exist but have wrong payment status');
    }
    
    // 5. Check for orders with inconsistent status
    const inconsistentOrders = await LabOrder.find({
      status: 'Pending Payment',
      paymentStatus: { $in: ['paid', 'partially_paid'] }
    });
    
    console.log(`\nOrders with inconsistent status (Pending Payment but paid): ${inconsistentOrders.length}`);
    
    if (inconsistentOrders.length > 0) {
      console.log('\n=== INCONSISTENT ORDERS ===');
      inconsistentOrders.forEach((order, index) => {
        console.log(`${index + 1}. ${order.testName} - Status: ${order.status}, Payment: ${order.paymentStatus}`);
      });
    }
    
    // 6. Check recent invoices
    const recentInvoices = await MedicalInvoice.find({
      'items.itemType': 'lab'
    })
    .sort({ createdAt: -1 })
    .limit(5);
    
    console.log(`\nRecent lab invoices: ${recentInvoices.length}`);
    
    if (recentInvoices.length > 0) {
      console.log('\n=== RECENT LAB INVOICES ===');
      recentInvoices.forEach((invoice, index) => {
        const labItems = invoice.items.filter(item => item.itemType === 'lab');
        console.log(`${index + 1}. Invoice: ${invoice.invoiceNumber}`);
        console.log(`   Patient: ${invoice.patientName}`);
        console.log(`   Status: ${invoice.status}`);
        console.log(`   Amount Paid: ${invoice.amountPaid}/${invoice.total}`);
        console.log(`   Lab Items: ${labItems.length}`);
        labItems.forEach(item => {
          console.log(`     - ${item.serviceName}: ${item.totalPrice} ETB`);
        });
        console.log('---');
      });
    }
    
    await mongoose.disconnect();
    console.log('\n=== DIAGNOSIS COMPLETE ===');
    
  } catch (error) {
    console.error('Error during diagnosis:', error);
  }
}

checkLabOrdersCollection();
