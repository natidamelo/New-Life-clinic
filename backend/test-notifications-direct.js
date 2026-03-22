const mongoose = require('mongoose');
const Notification = require('./models/Notification');

async function testNotifications() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to database');

    // Test the exact query that the frontend uses
    const filter = {
      recipientRole: 'reception',
      read: false
    };

    console.log('🔍 Testing notifications with filter:', JSON.stringify(filter, null, 2));

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    console.log(`📊 Found ${notifications.length} notifications for reception role`);

    // Filter for lab payment notifications specifically
    const labPaymentNotifications = notifications.filter(n => n.type === 'lab_payment_required');
    console.log(`🔬 Found ${labPaymentNotifications.length} lab payment notifications`);

    labPaymentNotifications.forEach((notification, index) => {
      console.log(`\n--- Notification ${index + 1} ---`);
      console.log('ID:', notification._id);
      console.log('Type:', notification.type);
      console.log('Patient Name:', notification.data?.patientName);
      console.log('Amount:', notification.data?.amount);
      console.log('Payment Status:', notification.data?.paymentStatus);
      console.log('Read:', notification.read);
      console.log('Created:', notification.createdAt);
      console.log('Recipient Role:', notification.recipientRole);
    });

    // Test the frontend filtering logic
    console.log('\n🔍 Testing frontend filtering logic...');
    
    const processedIds = []; // Empty for this test
    
    const activeNotifications = labPaymentNotifications.filter((n) => {
      const amount = n.data?.amount ?? n.data?.totalAmount ?? 0;
      const isPaid = n.data?.paymentStatus === 'paid';
      const isPartiallyPaid = n.data?.paymentStatus === 'partially_paid';
      const isRead = n.read;
      const isProcessed = processedIds.includes(n._id.toString());
      
      const shouldShow = !isProcessed && !isPaid && !isPartiallyPaid && amount > 0;
      
      console.log(`\nFiltering notification for ${n.data?.patientName}:`);
      console.log('- Amount:', amount);
      console.log('- Is Paid:', isPaid);
      console.log('- Is Partially Paid:', isPartiallyPaid);
      console.log('- Is Read:', isRead);
      console.log('- Is Processed:', isProcessed);
      console.log('- Should Show:', shouldShow);
      
      return shouldShow;
    });

    console.log(`\n✅ After frontend filtering: ${activeNotifications.length} notifications should be visible`);

    await mongoose.disconnect();
    console.log('Disconnected from database');

  } catch (error) {
    console.error('Error testing notifications:', error);
    await mongoose.disconnect();
  }
}

testNotifications(); 