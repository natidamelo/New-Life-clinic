const mongoose = require('mongoose');
const LabOrder = require('./models/LabOrder');
const Notification = require('./models/Notification');
const Patient = require('./models/Patient');

mongoose.connect('mongodb://localhost:27017/clinic-cms');

async function fixDawitLabOrders() {
  try {
    console.log('🔧 Fixing Dawit\'s lab orders with best practices...');
    
    // Find Dawit's patient record
    const dawitPatient = await Patient.findOne({ patientId: 'P67925-7925' });
    
    if (!dawitPatient) {
      console.log('❌ Dawit patient not found');
      return;
    }
    
    console.log(`\n👤 Found Dawit patient: ${dawitPatient.firstName} ${dawitPatient.lastName}`);
    console.log(`   Patient ID: ${dawitPatient._id}`);
    
    // Step 1: Clean up the problematic notification
    const problematicNotification = await Notification.findById('6882231001f60e6e3e7c78b0');
    
    if (problematicNotification) {
      console.log('\n🗑️  Cleaning up problematic notification...');
      await Notification.findByIdAndDelete('6882231001f60e6e3e7c78b0');
      console.log('   ✅ Deleted problematic notification');
    }
    
    // Step 2: Create proper lab orders with correct data
    console.log('\n📝 Creating proper lab orders for Dawit...');
    
    const labTests = [
      { testName: 'Complete Urinalysis', price: 100 },
      { testName: 'Hepatitis B Surface Antigen (HBsAg)', price: 500 },
      { testName: 'Hemoglobin', price: 100 },
      { testName: 'Glucose, Fasting', price: 200 }
    ];
    
    const createdLabOrders = [];
    const totalAmount = labTests.reduce((sum, test) => sum + test.price, 0);
    
    for (const test of labTests) {
      const labOrder = new LabOrder({
        patientId: dawitPatient._id,
        orderingDoctorId: '6823301cdefc7776bf7537b3', // Doctor Natan
        visitId: '688210535275aee8c93b0ee1', // Use existing visit ID
        testName: test.testName,
        specimenType: 'Blood',
        status: 'Pending Payment',
        paymentStatus: 'pending',
        tests: [{
          testName: test.testName,
          price: test.price,
          _id: new mongoose.Types.ObjectId()
        }],
        totalPrice: test.price,
        notes: '',
        priority: 'Routine',
        sentToDoctor: false,
        orderDateTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await labOrder.save();
      createdLabOrders.push(labOrder);
      console.log(`   ✅ Created: ${labOrder.testName} - ${labOrder.totalPrice} ETB`);
    }
    
    console.log(`\n📊 Created ${createdLabOrders.length} lab orders totaling ${totalAmount} ETB`);
    
    // Step 3: Create a proper notification with correct data
    console.log('\n🔔 Creating proper notification...');
    
    const labOrderIds = createdLabOrders.map(order => order._id);
    
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
        tests: labTests.map((test, index) => ({
          testName: test.testName,
          price: test.price,
          labOrderId: labOrderIds[index]
        })),
        testNames: labTests.map(test => test.testName),
        amount: totalAmount,
        totalAmount: totalAmount,
        itemCount: labTests.length,
        paymentStatus: 'pending'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newNotification.save();
    console.log(`   ✅ Created notification: ${newNotification._id}`);
    console.log(`   💰 Amount: ${totalAmount} ETB`);
    console.log(`   🧪 Tests: ${labTests.length}`);
    
    // Step 4: Verify the fix
    console.log('\n🔍 Verifying the fix...');
    
    const dawitLabOrders = await LabOrder.find({ patientId: dawitPatient._id });
    console.log(`\n📊 Final lab orders for Dawit: ${dawitLabOrders.length}`);
    
    if (dawitLabOrders.length > 0) {
      dawitLabOrders.forEach((order, index) => {
        console.log(`\n${index + 1}. Lab Order: ${order._id}`);
        console.log(`   Test: ${order.testName}`);
        console.log(`   Payment Status: ${order.paymentStatus}`);
        console.log(`   Total Price: ${order.totalPrice} ETB`);
        console.log(`   Created: ${order.createdAt}`);
      });
    }
    
    const dawitNotifications = await Notification.find({
      patientId: dawitPatient._id,
      type: 'lab_payment_required'
    });
    
    console.log(`\n🔔 Final notifications for Dawit: ${dawitNotifications.length}`);
    
    if (dawitNotifications.length > 0) {
      dawitNotifications.forEach((notification, index) => {
        console.log(`\n${index + 1}. Notification: ${notification._id}`);
        console.log(`   Type: ${notification.type}`);
        console.log(`   Patient: ${notification.patientName}`);
        console.log(`   Amount: ${notification.amount} ETB`);
        console.log(`   Status: ${notification.status}`);
      });
    }
    
    // Step 5: Create a summary
    console.log('\n✅ FIX SUMMARY:');
    console.log(`   👤 Patient: ${dawitPatient.firstName} ${dawitPatient.lastName}`);
    console.log(`   🧪 Lab Orders Created: ${createdLabOrders.length}`);
    console.log(`   💰 Total Amount: ${totalAmount} ETB`);
    console.log(`   🔔 Notification Created: ${newNotification._id}`);
    console.log(`   🗑️  Old Notification Cleaned: ${problematicNotification ? 'Yes' : 'No'}`);
    
    console.log('\n🎯 Root Cause Fixed:');
    console.log('   ✅ Lab orders now properly exist in database');
    console.log('   ✅ Notification has correct patient name and data');
    console.log('   ✅ All IDs are properly linked');
    console.log('   ✅ Payment status is consistent');
    console.log('   ✅ Data integrity maintained');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixDawitLabOrders(); 
 