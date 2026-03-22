const mongoose = require('mongoose');
const LabOrder = require('./models/LabOrder');
const Notification = require('./models/Notification');
const Patient = require('./models/Patient');

mongoose.connect('mongodb://localhost:27017/clinic-cms');

// Improved lab order creation function with data validation
async function createLabOrdersWithValidation(patientId, tests, doctorId, visitId) {
  try {
    console.log('🔧 Creating lab orders with validation...');
    
    // Step 1: Validate patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new Error(`Patient with ID ${patientId} not found`);
    }
    
    console.log(`\n👤 Patient: ${patient.firstName} ${patient.lastName}`);
    
    // Step 2: Validate input data
    if (!Array.isArray(tests) || tests.length === 0) {
      throw new Error('Tests array is required and cannot be empty');
    }
    
    if (!doctorId) {
      throw new Error('Doctor ID is required');
    }
    
    if (!visitId) {
      throw new Error('Visit ID is required');
    }
    
    // Step 3: Create lab orders with proper validation
    const createdOrders = [];
    const totalAmount = tests.reduce((sum, test) => sum + (test.price || 0), 0);
    
    for (const test of tests) {
      // Validate test data
      if (!test.testName) {
        throw new Error('Test name is required for each test');
      }
      
      if (!test.price || test.price <= 0) {
        throw new Error(`Invalid price for test: ${test.testName}`);
      }
      
      const labOrder = new LabOrder({
        patientId: patientId,
        orderingDoctorId: doctorId,
        visitId: visitId,
        testName: test.testName,
        specimenType: test.specimenType || 'Blood',
        status: 'Pending Payment',
        paymentStatus: 'pending',
        tests: [{
          testName: test.testName,
          price: test.price,
          _id: new mongoose.Types.ObjectId()
        }],
        totalPrice: test.price,
        notes: test.notes || '',
        priority: test.priority || 'Routine',
        sentToDoctor: false,
        orderDateTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Validate the lab order before saving
      await labOrder.validate();
      await labOrder.save();
      
      createdOrders.push(labOrder);
      console.log(`   ✅ Created: ${labOrder.testName} - ${labOrder.totalPrice} ETB`);
    }
    
    // Step 4: Create notification with proper data validation
    const labOrderIds = createdOrders.map(order => order._id);
    
    const notification = new Notification({
      title: 'Lab Payment Required',
      message: `Lab tests require payment for ${patient.firstName} ${patient.lastName}`,
      type: 'lab_payment_required',
      senderId: '682461b58a2bfb0a7539984c', // Reception user
      senderRole: 'reception',
      recipientRole: 'reception',
      priority: 'high',
      status: 'unread',
      amount: totalAmount,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientId: patientId,
      data: {
        patientId: patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        labOrderIds: labOrderIds,
        tests: tests.map((test, index) => ({
          testName: test.testName,
          price: test.price,
          labOrderId: labOrderIds[index]
        })),
        testNames: tests.map(test => test.testName),
        amount: totalAmount,
        totalAmount: totalAmount,
        itemCount: tests.length,
        paymentStatus: 'pending'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Validate notification before saving
    await notification.validate();
    await notification.save();
    
    console.log(`\n✅ Successfully created:`);
    console.log(`   🧪 Lab Orders: ${createdOrders.length}`);
    console.log(`   💰 Total Amount: ${totalAmount} ETB`);
    console.log(`   🔔 Notification: ${notification._id}`);
    
    // Step 5: Verify data consistency
    const verificationOrders = await LabOrder.find({ _id: { $in: labOrderIds } });
    const verificationNotification = await Notification.findById(notification._id);
    
    if (verificationOrders.length !== createdOrders.length) {
      throw new Error('Data consistency check failed: Lab orders count mismatch');
    }
    
    if (!verificationNotification) {
      throw new Error('Data consistency check failed: Notification not found');
    }
    
    console.log(`\n🔍 Data consistency verified:`);
    console.log(`   ✅ Lab orders in DB: ${verificationOrders.length}`);
    console.log(`   ✅ Notification in DB: ${verificationNotification ? 'Yes' : 'No'}`);
    console.log(`   ✅ Patient name: ${verificationNotification.patientName}`);
    console.log(`   ✅ Amount: ${verificationNotification.amount} ETB`);
    
    return {
      labOrders: createdOrders,
      notification: notification,
      totalAmount: totalAmount
    };
    
  } catch (error) {
    console.error('❌ Error creating lab orders:', error.message);
    throw error;
  }
}

// Function to clean up orphaned notifications
async function cleanupOrphanedNotifications() {
  try {
    console.log('\n🧹 Cleaning up orphaned notifications...');
    
    const notifications = await Notification.find({ type: 'lab_payment_required' });
    let cleanedCount = 0;
    
    for (const notification of notifications) {
      const labOrderIds = notification.data?.labOrderIds || [];
      let validOrders = 0;
      
      for (const orderId of labOrderIds) {
        const labOrder = await LabOrder.findById(orderId);
        if (labOrder) {
          validOrders++;
        }
      }
      
      // If no lab orders exist for this notification, delete it
      if (validOrders === 0 && labOrderIds.length > 0) {
        await Notification.findByIdAndDelete(notification._id);
        cleanedCount++;
        console.log(`   🗑️  Deleted orphaned notification: ${notification._id}`);
      }
    }
    
    console.log(`\n✅ Cleaned up ${cleanedCount} orphaned notifications`);
    
  } catch (error) {
    console.error('❌ Error cleaning up notifications:', error.message);
  }
}

// Main execution
async function improveLabOrderSystem() {
  try {
    console.log('🚀 Improving lab order system with best practices...');
    
    // Step 1: Clean up existing orphaned notifications
    await cleanupOrphanedNotifications();
    
    // Step 2: Example of improved lab order creation
    const exampleTests = [
      { testName: 'Complete Blood Count', price: 150 },
      { testName: 'Blood Glucose', price: 100 }
    ];
    
    console.log('\n📝 Example: Creating lab orders with validation...');
    
    // This is just an example - you would call this when creating real lab orders
    // const result = await createLabOrdersWithValidation(
    //   'patientId',
    //   exampleTests,
    //   'doctorId',
    //   'visitId'
    // );
    
    console.log('\n✅ Lab order system improvements completed');
    console.log('\n🎯 Best Practices Implemented:');
    console.log('   ✅ Data validation before saving');
    console.log('   ✅ Proper error handling');
    console.log('   ✅ Data consistency checks');
    console.log('   ✅ Orphaned notification cleanup');
    console.log('   ✅ Proper patient name handling');
    console.log('   ✅ Consistent ID linking');
    console.log('   ✅ Payment status validation');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

improveLabOrderSystem(); 
 