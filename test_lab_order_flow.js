const mongoose = require('mongoose');

async function testLabOrderFlow() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to database');
    
    const LabOrder = require('./backend/models/LabOrder');
    const Patient = require('./backend/models/Patient');
    const User = require('./backend/models/User');
    
    console.log('\n=== TESTING LAB ORDER FLOW ===\n');
    
    // 1. Find a patient to test with
    const patient = await Patient.findOne({});
    if (!patient) {
      console.log('❌ No patients found in database. Please create a patient first.');
      await mongoose.disconnect();
      return;
    }
    
    console.log(`Using patient: ${patient.firstName} ${patient.lastName} (${patient.patientId})`);
    
    // 2. Find a doctor to test with
    const doctor = await User.findOne({ role: 'doctor' });
    if (!doctor) {
      console.log('❌ No doctors found in database. Please create a doctor first.');
      await mongoose.disconnect();
      return;
    }
    
    console.log(`Using doctor: ${doctor.firstName} ${doctor.lastName}`);
    
    // 3. Create a test lab order
    const testLabOrder = new LabOrder({
      patientId: patient._id,
      patient: patient._id,
      orderingDoctorId: doctor._id,
      testName: 'Complete Blood Count (CBC)',
      specimenType: 'Blood',
      status: 'Pending Payment',
      paymentStatus: 'pending',
      totalPrice: 150,
      priority: 'Routine',
      orderDateTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    const savedOrder = await testLabOrder.save();
    console.log(`✅ Created test lab order: ${savedOrder._id}`);
    console.log(`   Test: ${savedOrder.testName}`);
    console.log(`   Status: ${savedOrder.status}`);
    console.log(`   Payment Status: ${savedOrder.paymentStatus}`);
    console.log(`   Price: ${savedOrder.totalPrice} ETB`);
    
    // 4. Simulate payment processing
    console.log('\n=== SIMULATING PAYMENT PROCESSING ===');
    
    savedOrder.status = 'Ordered';
    savedOrder.paymentStatus = 'paid';
    savedOrder.paidAt = new Date();
    savedOrder.updatedAt = new Date();
    
    await savedOrder.save();
    console.log(`✅ Updated lab order after payment:`);
    console.log(`   Status: ${savedOrder.status}`);
    console.log(`   Payment Status: ${savedOrder.paymentStatus}`);
    console.log(`   Paid At: ${savedOrder.paidAt}`);
    
    // 5. Test if the order would be visible in lab dashboard
    const visibleOrders = await LabOrder.find({
      $or: [
        { paymentStatus: 'paid' },
        { paymentStatus: 'partially_paid' }
      ]
    });
    
    console.log(`\n=== LAB DASHBOARD VISIBILITY TEST ===`);
    console.log(`Orders visible in lab dashboard: ${visibleOrders.length}`);
    
    const ourOrder = visibleOrders.find(order => order._id.toString() === savedOrder._id.toString());
    if (ourOrder) {
      console.log(`✅ Our test order IS visible in lab dashboard`);
      console.log(`   Order ID: ${ourOrder._id}`);
      console.log(`   Test: ${ourOrder.testName}`);
      console.log(`   Patient: ${ourOrder.patient?.firstName} ${ourOrder.patient?.lastName}`);
    } else {
      console.log(`❌ Our test order is NOT visible in lab dashboard`);
    }
    
    // 6. Clean up - delete the test order
    console.log('\n=== CLEANING UP ===');
    await LabOrder.findByIdAndDelete(savedOrder._id);
    console.log(`✅ Deleted test lab order: ${savedOrder._id}`);
    
    await mongoose.disconnect();
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testLabOrderFlow();
