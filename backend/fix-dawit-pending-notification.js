const mongoose = require('mongoose');
const LabOrder = require('./models/LabOrder');
const Notification = require('./models/Notification');
const Patient = require('./models/Patient');

mongoose.connect('mongodb://localhost:27017/clinic-cms');

async function fixDawitPendingNotification() {
  try {
    console.log('🔧 Fixing Dawit\'s pending notification...');
    
    // Find Dawit's patient record
    const dawitPatient = await Patient.findOne({ patientId: 'P67925-7925' });
    
    if (!dawitPatient) {
      console.log('❌ Dawit patient not found');
      return;
    }
    
    console.log(`\n👤 Patient: ${dawitPatient.firstName} ${dawitPatient.lastName}`);
    
    // Get all lab orders for Dawit
    const dawitLabOrders = await LabOrder.find({ patientId: dawitPatient._id });
    console.log(`\n🧪 Found ${dawitLabOrders.length} lab orders for Dawit`);
    
    if (dawitLabOrders.length === 0) {
      console.log('❌ No lab orders found for Dawit');
      return;
    }
    
    // Calculate total amount
    const totalAmount = dawitLabOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    console.log(`   💰 Total Amount: ${totalAmount} ETB`);
    
    // Check if there's already a notification
    const existingNotification = await Notification.findOne({
      patientId: dawitPatient._id,
      type: 'lab_payment_required'
    });
    
    if (existingNotification) {
      console.log('\n🗑️  Removing existing notification...');
      await Notification.findByIdAndDelete(existingNotification._id);
      console.log('   ✅ Deleted existing notification');
    }
    
    // Create a new notification for pending payment
    console.log('\n🔔 Creating new pending notification...');
    
    const labOrderIds = dawitLabOrders.map(order => order._id);
    
    const newNotification = new Notification({
      title: 'Lab Payment Required',
      message: `Lab tests require payment for ${dawitPatient.firstName} ${dawitPatient.lastName}`,
      type: 'lab_payment_required',
      senderId: '682461b58a2bfb0a7539984c', // Reception user
      senderRole: 'reception',
      recipientRole: 'reception',
      priority: 'high',
      status: 'unread',
      amount: totalAmount,
      patientName: `${dawitPatient.firstName} ${dawitPatient.lastName}`,
      patientId: dawitPatient._id,
      data: {
        patientId: dawitPatient._id,
        patientName: `${dawitPatient.firstName} ${dawitPatient.lastName}`,
        labOrderIds: labOrderIds,
        tests: dawitLabOrders.map(order => ({
          testName: order.testName,
          price: order.totalPrice,
          labOrderId: order._id
        })),
        testNames: dawitLabOrders.map(order => order.testName),
        amount: totalAmount,
        totalAmount: totalAmount,
        itemCount: dawitLabOrders.length,
        paymentStatus: 'pending'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newNotification.save();
    console.log(`   ✅ Created notification: ${newNotification._id}`);
    console.log(`   💰 Amount: ${totalAmount} ETB`);
    console.log(`   🧪 Tests: ${dawitLabOrders.length}`);
    
    // Update lab orders to pending status
    console.log('\n🔄 Updating lab orders to pending status...');
    
    for (const order of dawitLabOrders) {
      order.paymentStatus = 'pending';
      order.status = 'Pending Payment';
      await order.save();
      console.log(`   ✅ Updated: ${order.testName} - ${order.paymentStatus}`);
    }
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    
    const updatedLabOrders = await LabOrder.find({ patientId: dawitPatient._id });
    const pendingOrders = updatedLabOrders.filter(order => order.paymentStatus === 'pending');
    const notifications = await Notification.find({
      patientId: dawitPatient._id,
      type: 'lab_payment_required'
    });
    
    console.log(`\n📊 Final Status:`);
    console.log(`   🧪 Total Lab Orders: ${updatedLabOrders.length}`);
    console.log(`   ⏳ Pending Orders: ${pendingOrders.length}`);
    console.log(`   🔔 Notifications: ${notifications.length}`);
    console.log(`   💰 Total Amount: ${totalAmount} ETB`);
    
    if (pendingOrders.length === dawitLabOrders.length && notifications.length === 1) {
      console.log('\n🎉 SUCCESS: Dawit\'s lab orders are now properly pending!');
      console.log('   ✅ All lab orders are pending payment');
      console.log('   ✅ Notification created for billing');
      console.log('   ✅ Ready for payment processing');
    } else {
      console.log('\n⚠️  WARNING: Some issues remain');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixDawitPendingNotification(); 
 