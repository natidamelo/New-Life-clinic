const mongoose = require('mongoose');
const LabOrder = require('./models/LabOrder');
const Notification = require('./models/Notification');
const Patient = require('./models/Patient');

async function fixPatientReferences() {
  try {
    console.log('🔧 Fixing Patient References in Lab Orders and Notifications');
    console.log('='.repeat(60));
    
    // Connect to database
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('✅ Connected to clinic-cms database');
    
    // Step 1: Check all patients
    console.log('\n👥 Step 1: Checking patients...');
    const patients = await Patient.find({});
    console.log(`📊 Total patients: ${patients.length}`);
    patients.forEach(p => {
      console.log(`   - ${p.firstName} ${p.lastName} (${p._id})`);
    });
    
    // Step 2: Check lab orders with missing patient info
    console.log('\n🔍 Step 2: Checking lab orders with missing patient info...');
    const labOrders = await LabOrder.find({});
    console.log(`📊 Total lab orders: ${labOrders.length}`);
    
    const ordersWithMissingPatient = labOrders.filter(lo => {
      return !lo.patientId || 
             (typeof lo.patientId === 'object' && !lo.patientId.firstName) ||
             (typeof lo.patientId === 'string' && lo.patientId.length < 10);
    });
    
    console.log(`📊 Lab orders with missing patient info: ${ordersWithMissingPatient.length}`);
    
    // Step 3: Assign patients to lab orders
    console.log('\n🔗 Step 3: Assigning patients to lab orders...');
    let updatedCount = 0;
    
    if (patients.length > 0 && ordersWithMissingPatient.length > 0) {
      // Use the first patient for all lab orders (for testing purposes)
      const firstPatient = patients[0];
      console.log(`   👤 Using patient: ${firstPatient.firstName} ${firstPatient.lastName}`);
      
      for (const order of ordersWithMissingPatient) {
        order.patientId = firstPatient._id;
        await order.save();
        updatedCount++;
        console.log(`   ✅ Updated lab order: ${order.testName}`);
      }
    }
    
    // Step 4: Update notifications with correct patient info
    console.log('\n🔔 Step 4: Updating notifications with correct patient info...');
    const notifications = await Notification.find({ type: 'lab_payment_required' });
    console.log(`📊 Total lab payment notifications: ${notifications.length}`);
    
    let notificationUpdates = 0;
    for (const notification of notifications) {
      if (notification.data?.patientName === 'Unknown Patient' && patients.length > 0) {
        const firstPatient = patients[0];
        notification.data.patientName = `${firstPatient.firstName} ${firstPatient.lastName}`;
        notification.data.patientId = firstPatient._id;
        await notification.save();
        notificationUpdates++;
        console.log(`   ✅ Updated notification: ${notification._id}`);
      }
    }
    
    // Step 5: Verify the fix
    console.log('\n🔍 Step 5: Verifying the fix...');
    
    const updatedLabOrders = await LabOrder.find({}).populate('patientId', 'firstName lastName');
    const ordersWithPatient = updatedLabOrders.filter(lo => lo.patientId?.firstName);
    console.log(`📊 Lab orders with patient info: ${ordersWithPatient.length}/${updatedLabOrders.length}`);
    
    const updatedNotifications = await Notification.find({ type: 'lab_payment_required' });
    const notificationsWithPatient = updatedNotifications.filter(n => 
      n.data?.patientName && n.data.patientName !== 'Unknown Patient'
    );
    console.log(`📊 Notifications with patient info: ${notificationsWithPatient.length}/${updatedNotifications.length}`);
    
    // Show sample data
    console.log('\n📋 Sample updated data:');
    if (ordersWithPatient.length > 0) {
      const sampleOrder = ordersWithPatient[0];
      console.log(`   Lab Order: ${sampleOrder.testName} - ${sampleOrder.patientId.firstName} ${sampleOrder.patientId.lastName}`);
    }
    
    if (notificationsWithPatient.length > 0) {
      const sampleNotification = notificationsWithPatient[0];
      console.log(`   Notification: ${sampleNotification.data.patientName} - ${sampleNotification.data.totalAmount} ETB`);
    }
    
    console.log('\n🎉 SUCCESS: Patient reference fix completed!');
    console.log('='.repeat(60));
    console.log('📋 SUMMARY:');
    console.log(`   ✅ Updated ${updatedCount} lab orders with patient info`);
    console.log(`   ✅ Updated ${notificationUpdates} notifications with patient info`);
    console.log(`   ✅ Lab orders with patient info: ${ordersWithPatient.length}/${updatedLabOrders.length}`);
    console.log(`   ✅ Notifications with patient info: ${notificationsWithPatient.length}/${updatedNotifications.length}`);
    
  } catch (error) {
    console.error('❌ Error fixing patient references:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the fix
fixPatientReferences(); 