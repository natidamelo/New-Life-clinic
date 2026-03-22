const mongoose = require('mongoose');
const LabOrder = require('./models/LabOrder');
const Notification = require('./models/Notification');
const Patient = require('./models/Patient');

mongoose.connect('mongodb://localhost:27017/clinic-cms');

async function fixDawitNotification() {
  try {
    console.log('🔧 Fixing Dawit\'s notification...');
    
    // Find Dawit's patient record
    const dawitPatient = await Patient.findOne({ patientId: 'P67925-7925' });
    
    if (!dawitPatient) {
      console.log('❌ Dawit patient not found');
      return;
    }
    
    console.log(`\n👤 Found Dawit patient: ${dawitPatient.firstName} ${dawitPatient.lastName}`);
    
    // Get the notification
    const notification = await Notification.findById('6882231001f60e6e3e7c78b0');
    
    if (!notification) {
      console.log('❌ Notification not found');
      return;
    }
    
    console.log(`\n🔔 Found notification: ${notification._id}`);
    console.log(`   Type: ${notification.type}`);
    console.log(`   Patient: ${notification.patientName}`);
    console.log(`   Amount: ${notification.amount} ETB`);
    
    // Check if the lab orders from the notification exist
    const labOrderIds = notification.data.labOrderIds || [];
    console.log(`\n🧪 Checking ${labOrderIds.length} lab orders from notification...`);
    
    const existingLabOrders = [];
    const missingLabOrders = [];
    
    for (const orderId of labOrderIds) {
      const labOrder = await LabOrder.findById(orderId);
      if (labOrder) {
        existingLabOrders.push(labOrder);
        console.log(`✅ Found lab order: ${orderId} - ${labOrder.testName}`);
      } else {
        missingLabOrders.push(orderId);
        console.log(`❌ Missing lab order: ${orderId}`);
      }
    }
    
    // If we have missing lab orders, we need to create them
    if (missingLabOrders.length > 0) {
      console.log(`\n🔧 Creating ${missingLabOrders.length} missing lab orders...`);
      
      for (const orderId of missingLabOrders) {
        // Find the order data in the notification
        const orderData = notification.data.labOrders?.find(order => order._id === orderId);
        
        if (orderData) {
          const newLabOrder = new LabOrder({
            _id: orderId, // Use the same ID from notification
            patientId: dawitPatient._id,
            orderingDoctorId: orderData.orderingDoctorId?._id || '6823301cdefc7776bf7537b3',
            visitId: orderData.visitId || '688210535275aee8c93b0ee1',
            testName: orderData.testName,
            specimenType: orderData.specimenType || 'Blood',
            status: 'Pending Payment',
            paymentStatus: 'pending',
            tests: orderData.tests,
            totalPrice: orderData.totalPrice,
            notes: orderData.notes || '',
            priority: orderData.priority || 'Routine',
            sentToDoctor: false,
            orderDateTime: orderData.orderDateTime || new Date(),
            createdAt: orderData.createdAt || new Date(),
            updatedAt: orderData.updatedAt || new Date()
          });
          
          await newLabOrder.save();
          console.log(`✅ Created lab order: ${orderId} - ${orderData.testName}`);
        }
      }
    }
    
    // Update the notification to have proper fields
    notification.patientName = notification.data.patientName;
    notification.amount = notification.data.totalAmount;
    notification.status = 'unread';
    await notification.save();
    
    console.log(`\n✅ Updated notification with proper fields`);
    
    // Verify the fix
    const updatedLabOrders = await LabOrder.find({
      patientId: dawitPatient._id,
      _id: { $in: labOrderIds }
    });
    
    console.log(`\n📊 Verification: Found ${updatedLabOrders.length} lab orders for Dawit`);
    
    if (updatedLabOrders.length > 0) {
      updatedLabOrders.forEach((order, index) => {
        console.log(`\n${index + 1}. Lab Order: ${order._id}`);
        console.log(`   Test: ${order.testName}`);
        console.log(`   Payment Status: ${order.paymentStatus}`);
        console.log(`   Total Price: ${order.totalPrice} ETB`);
      });
    }
    
    console.log('\n✅ Dawit\'s notification should now be visible in the billing area!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixDawitNotification(); 
 