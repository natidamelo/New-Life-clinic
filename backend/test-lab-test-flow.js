const mongoose = require('mongoose');
const Patient = require('./models/Patient');
const User = require('./models/User');
const LabOrder = require('./models/LabOrder');
const Notification = require('./models/Notification');

async function testLabTestFlow() {
  try {
    console.log('🧪 Testing Lab Test Flow: Doctor Dashboard → Reception Notifications');
    console.log('='.repeat(60));
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to database');
    
    // Step 1: Create a test patient
    console.log('\n👤 Step 1: Creating test patient...');
    const testPatient = new Patient({
      firstName: 'Test',
      lastName: 'Patient',
      patientId: 'P001',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      contactNumber: '1234567890',
      email: 'test@example.com',
      address: 'Test Address',
      assignedDoctorId: null,
      assignedNurseId: null
    });
    
    await testPatient.save();
    console.log(`✅ Created patient: ${testPatient.firstName} ${testPatient.lastName} (${testPatient._id})`);
    
    // Step 2: Create a test doctor
    console.log('\n👨‍⚕️ Step 2: Creating test doctor...');
    const testDoctor = new User({
      username: 'testdoctor',
      firstName: 'Test',
      lastName: 'Doctor',
      email: 'doctor@test.com',
      password: 'password123',
      role: 'doctor',
      specialization: 'Internal Medicine'
    });
    
    await testDoctor.save();
    console.log(`✅ Created doctor: ${testDoctor.firstName} ${testDoctor.lastName} (${testDoctor._id})`);
    
    // Step 3: Create a test lab order (simulating doctor dashboard)
    console.log('\n🧪 Step 3: Creating lab order from doctor dashboard...');
    const labOrderData = {
      patientId: testPatient._id,
      orderingDoctorId: testDoctor._id,
      testName: 'CBC (Complete Blood Count)',
      tests: [{ testName: 'CBC (Complete Blood Count)', price: 250 }],
      specimenType: 'Blood',
      status: 'Pending Payment',
      paymentStatus: 'pending',
      notes: 'Test lab order from doctor dashboard',
      priority: 'Routine',
      totalPrice: 250
    };
    
    const newLabOrder = new LabOrder(labOrderData);
    const savedLabOrder = await newLabOrder.save();
    console.log(`✅ Created lab order: ${savedLabOrder.testName} (${savedLabOrder._id})`);
    console.log(`   💰 Price: ${savedLabOrder.totalPrice} ETB`);
    console.log(`   📊 Status: ${savedLabOrder.status}`);
    console.log(`   💳 Payment Status: ${savedLabOrder.paymentStatus}`);
    
    // Step 4: Create notification for reception (simulating lab order controller)
    console.log('\n🔔 Step 4: Creating notification for reception...');
    const notificationData = {
      type: 'lab_payment_required',
      title: 'Lab Test Payment Required',
      message: `Payment required for lab test: ${savedLabOrder.testName}`,
      recipientRole: 'reception',
      senderRole: 'doctor',
      senderId: testDoctor._id.toString(),
      data: {
        labOrderIds: [savedLabOrder._id],
        patientId: testPatient._id,
        patientName: `${testPatient.firstName} ${testPatient.lastName}`,
        testName: savedLabOrder.testName,
        tests: [{
          testName: savedLabOrder.testName,
          price: savedLabOrder.totalPrice,
          labOrderId: savedLabOrder._id
        }],
        amount: savedLabOrder.totalPrice,
        totalAmount: savedLabOrder.totalPrice,
        itemCount: 1
      },
      priority: 'high',
      isRead: false
    };
    
    const newNotification = new Notification(notificationData);
    const savedNotification = await newNotification.save();
    console.log(`✅ Created notification: ${savedNotification._id}`);
    console.log(`   📋 Type: ${savedNotification.type}`);
    console.log(`   👥 Recipient: ${savedNotification.recipientRole}`);
    console.log(`   💰 Amount: ${savedNotification.data.amount} ETB`);
    
    // Step 5: Verify the data
    console.log('\n🔍 Step 5: Verifying data...');
    
    const labOrders = await LabOrder.find({});
    console.log(`📊 Total lab orders: ${labOrders.length}`);
    
    const notifications = await Notification.find({ type: 'lab_payment_required' });
    console.log(`📊 Total lab payment notifications: ${notifications.length}`);
    
    const pendingLabOrders = await LabOrder.find({ paymentStatus: 'pending' });
    console.log(`📊 Pending lab orders: ${pendingLabOrders.length}`);
    
    const unreadNotifications = await Notification.find({ 
      type: 'lab_payment_required', 
      read: false 
    });
    console.log(`📊 Unread lab payment notifications: ${unreadNotifications.length}`);
    
    // Step 6: Test the pending-for-reception endpoint
    console.log('\n🌐 Step 6: Testing pending-for-reception endpoint...');
    
    // Simulate the endpoint query
    const pendingForReception = await LabOrder.find({
      $and: [
        {
          $or: [
            { paymentStatus: { $in: ['pending', 'unpaid'] } },
            { paymentStatus: { $exists: false } },
            { 
              $and: [
                { status: { $in: ['Pending Payment', 'Ordered'] } },
                { paymentStatus: { $ne: 'paid' } }
              ]
            }
          ]
        }
      ]
    })
    .populate('patientId', 'firstName lastName patientId')
    .populate('orderingDoctorId', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(50);
    
    console.log(`📊 Pending lab orders for reception: ${pendingForReception.length}`);
    pendingForReception.forEach(order => {
      console.log(`   - ${order.testName}: ${order.totalPrice} ETB (${order.paymentStatus})`);
    });
    
    // Step 7: Test notification filtering
    console.log('\n🔍 Step 7: Testing notification filtering...');
    
    const receptionNotifications = await Notification.find({
      recipientRole: 'reception',
      read: false
    });
    
    console.log(`📊 All unread reception notifications: ${receptionNotifications.length}`);
    receptionNotifications.forEach(notif => {
      console.log(`   - ${notif.type}: ${notif.data?.patientName} - ${notif.data?.amount} ETB`);
    });
    
    console.log('\n🎉 SUCCESS: Lab test flow verification completed!');
    console.log('='.repeat(60));
    console.log('📋 SUMMARY:');
    console.log(`   ✅ Patient created: ${testPatient.firstName} ${testPatient.lastName}`);
    console.log(`   ✅ Doctor created: ${testDoctor.firstName} ${testDoctor.lastName}`);
    console.log(`   ✅ Lab order created: ${savedLabOrder.testName}`);
    console.log(`   ✅ Notification created: ${savedNotification.type}`);
    console.log(`   ✅ Pending lab orders for reception: ${pendingForReception.length}`);
    console.log(`   ✅ Unread reception notifications: ${receptionNotifications.length}`);
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('   1. Start the backend server: npm start');
    console.log('   2. Start the frontend: cd ../frontend && npm start');
    console.log('   3. Login as doctor and create lab orders');
    console.log('   4. Check reception dashboard for notifications');
    
  } catch (error) {
    console.error('❌ Error in lab test flow:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testLabTestFlow(); 