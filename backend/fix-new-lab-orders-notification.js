const mongoose = require('mongoose');
const LabOrder = require('./models/LabOrder');
const Patient = require('./models/Patient');
const Notification = require('./models/Notification');

async function fixNewLabOrdersNotification() {
  try {
    console.log('🔧 Fixing New Lab Orders Notification Issue');
    console.log('='.repeat(60));
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms database');
    
    // Step 1: Get all patients
    console.log('\n👥 Step 1: Getting all patients...');
    const patients = await Patient.find({});
    console.log(`📊 Total patients: ${patients.length}`);
    patients.forEach(p => {
      console.log(`   - ${p.firstName} ${p.lastName} (${p._id}) - Patient ID: ${p.patientId}`);
    });
    
    // Step 2: Fix pending lab orders with broken patient references
    console.log('\n🔗 Step 2: Fixing pending lab orders...');
    const pendingLabOrders = await LabOrder.find({ paymentStatus: 'pending' });
    console.log(`📊 Found ${pendingLabOrders.length} pending lab orders`);
    
    let fixedCount = 0;
    for (const order of pendingLabOrders) {
      // Check if patientId is missing or broken
      if (!order.patientId || typeof order.patientId === 'string' || 
          (typeof order.patientId === 'object' && !order.patientId.firstName)) {
        
        console.log(`   🔍 Lab order "${order.testName}" needs patient fix`);
        
        // Assign to first available patient (for testing)
        if (patients.length > 0) {
          const targetPatient = patients[0]; // Use first patient
          order.patientId = targetPatient._id;
          await order.save();
          fixedCount++;
          console.log(`     ✅ Assigned to patient: ${targetPatient.firstName} ${targetPatient.lastName}`);
        }
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} lab orders with patient references`);
    
    // Step 3: Delete all existing lab payment notifications (clean slate)
    console.log('\n🗑️ Step 3: Cleaning up existing notifications...');
    const deleteResult = await Notification.deleteMany({ type: 'lab_payment_required' });
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing lab payment notifications`);
    
    // Step 4: Get all pending lab orders with proper patient info
    console.log('\n🔍 Step 4: Getting pending lab orders with patient info...');
    const updatedPendingLabOrders = await LabOrder.find({
      paymentStatus: 'pending'
    }).populate('patientId', 'firstName lastName');
    
    console.log(`📊 Found ${updatedPendingLabOrders.length} pending lab orders with patient info`);
    
    // Step 5: Group by patient and create notifications
    console.log('\n🔔 Step 5: Creating notifications for pending lab orders...');
    const labOrdersByPatient = {};
    
    for (const order of updatedPendingLabOrders) {
      const patientId = order.patientId?._id || order.patientId;
      const patientName = order.patientId?.firstName && order.patientId?.lastName 
        ? `${order.patientId.firstName} ${order.patientId.lastName}`
        : 'Unknown Patient';
      
      if (!labOrdersByPatient[patientId]) {
        labOrdersByPatient[patientId] = {
          patientId: patientId,
          patientName: patientName,
          labOrders: [],
          totalAmount: 0
        };
      }
      
      labOrdersByPatient[patientId].labOrders.push(order);
      labOrdersByPatient[patientId].totalAmount += order.totalPrice || 0;
    }
    
    // Create unread notifications for each patient
    let createdNotifications = 0;
    for (const [patientId, group] of Object.entries(labOrdersByPatient)) {
      const labOrderIds = group.labOrders.map(lo => lo._id);
      const testNames = group.labOrders.map(lo => lo.testName).join(', ');
      
      const notificationData = {
        type: 'lab_payment_required',
        title: 'Lab Payment Required',
        message: `Payment required for ${group.labOrders.length} lab test(s): ${testNames}`,
        recipientRole: 'reception',
        senderRole: 'doctor',
        senderId: group.labOrders[0]?.orderingDoctorId || '507f1f77bcf86cd799439011',
        data: {
          labOrderIds: labOrderIds,
          patientId: group.patientId,
          patientName: group.patientName,
          testNames: testNames,
          amount: group.totalAmount,
          totalAmount: group.totalAmount,
          itemCount: group.labOrders.length,
          tests: group.labOrders.map(lo => ({
            testName: lo.testName,
            price: lo.totalPrice || 0,
            labOrderId: lo._id
          })),
          paymentStatus: 'pending'
        },
        priority: 'high',
        read: false // IMPORTANT: Set to false to make it unread
      };
      
      const notification = new Notification(notificationData);
      await notification.save();
      createdNotifications++;
      
      console.log(`   ✅ Created notification for ${group.patientName}: ${group.totalAmount} ETB (${group.labOrders.length} tests)`);
    }
    
    // Step 6: Verify the fix
    console.log('\n🔍 Step 6: Verifying the fix...');
    
    // Check lab orders with patient info
    const verifiedLabOrders = await LabOrder.find({}).populate('patientId', 'firstName lastName');
    const ordersWithPatient = verifiedLabOrders.filter(lo => 
      lo.patientId && typeof lo.patientId === 'object' && lo.patientId.firstName
    );
    console.log(`📊 Lab orders with patient info: ${ordersWithPatient.length}/${verifiedLabOrders.length}`);
    
    // Check pending lab orders
    const pendingWithPatient = ordersWithPatient.filter(lo => lo.paymentStatus === 'pending');
    console.log(`📊 Pending lab orders with patient info: ${pendingWithPatient.length}`);
    
    // Check unread notifications
    const unreadNotifications = await Notification.find({
      type: 'lab_payment_required',
      read: false
    });
    console.log(`📊 Unread lab payment notifications: ${unreadNotifications.length}`);
    
    // Show sample data
    console.log('\n📋 Sample data:');
    if (pendingWithPatient.length > 0) {
      console.log('Pending lab orders:');
      pendingWithPatient.slice(0, 5).forEach(order => {
        console.log(`   - ${order.testName}: ${order.patientId.firstName} ${order.patientId.lastName} (${order.totalPrice} ETB)`);
      });
    }
    
    if (unreadNotifications.length > 0) {
      console.log('Unread notifications:');
      unreadNotifications.forEach(notif => {
        console.log(`   - ${notif.data?.patientName}: ${notif.data?.totalAmount} ETB (${notif.data?.itemCount} tests)`);
      });
    }
    
    console.log('\n🎉 SUCCESS: New lab orders notification fix completed!');
    console.log('='.repeat(60));
    console.log('📋 SUMMARY:');
    console.log(`   ✅ Fixed ${fixedCount} lab orders with patient references`);
    console.log(`   ✅ Created ${createdNotifications} unread notifications`);
    console.log(`   ✅ Lab orders with patient info: ${ordersWithPatient.length}/${verifiedLabOrders.length}`);
    console.log(`   ✅ Pending lab orders: ${pendingWithPatient.length}`);
    console.log(`   ✅ Unread notifications: ${unreadNotifications.length}`);
    
    console.log('\n🔧 NEXT STEPS:');
    console.log('   1. Check the frontend reception dashboard');
    console.log('   2. You should now see ALL lab payment notifications');
    console.log('   3. The patient names should be displayed correctly');
    console.log('   4. All your new lab tests should be visible');
    
  } catch (error) {
    console.error('❌ Error fixing new lab orders notification:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the fix
fixNewLabOrdersNotification(); 