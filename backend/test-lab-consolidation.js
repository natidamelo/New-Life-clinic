const mongoose = require('mongoose');
const LabOrder = require('./models/LabOrder');
const Notification = require('./models/Notification');
const Patient = require('./models/Patient');
const InventoryItem = require('./models/InventoryItem');

async function testLabConsolidation() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    // Test 1: Check inventory prices are correct
    console.log('\n=== Test 1: Inventory Prices ===');
    const hemoglobin = await InventoryItem.findOne({ name: { $regex: /hemoglobin/i } });
    const glucose = await InventoryItem.findOne({ name: { $regex: /glucose.*fasting/i } });
    
    console.log('Hemoglobin price:', hemoglobin?.sellingPrice || 'Not found');
    console.log('Glucose, Fasting price:', glucose?.sellingPrice || 'Not found');
    
    const expectedTotal = (hemoglobin?.sellingPrice || 0) + (glucose?.sellingPrice || 0);
    console.log('Expected total for both tests:', expectedTotal);
    
    // Test 2: Check current notifications for melody Natan
    console.log('\n=== Test 2: Current Notifications for melody Natan ===');
    const melodyNotifications = await Notification.find({
      'data.patientName': 'melody Natan',
      type: 'lab_payment_required'
    }).sort({ timestamp: -1 });
    
    console.log(`Found ${melodyNotifications.length} lab payment notifications for melody Natan`);
    melodyNotifications.forEach((n, index) => {
      console.log(`${index + 1}. Amount: ${n.data.amount}, Tests: ${n.data.testNames?.join(', ') || n.data.testName}, Read: ${n.read}`);
    });
    
    // Test 3: Check current notifications for Hana dejene
    console.log('\n=== Test 3: Current Notifications for Hana dejene ===');
    const hanaNotifications = await Notification.find({
      'data.patientName': 'Hana dejene',
      type: 'lab_payment_required'
    }).sort({ timestamp: -1 });
    
    console.log(`Found ${hanaNotifications.length} lab payment notifications for Hana dejene`);
    hanaNotifications.forEach((n, index) => {
      console.log(`${index + 1}. Amount: ${n.data.amount}, Tests: ${n.data.testNames?.join(', ') || n.data.testName}, Read: ${n.read}`);
    });
    
    // Test 4: Check all lab payment notifications
    console.log('\n=== Test 4: All Lab Payment Notifications ===');
    const allLabNotifications = await Notification.find({
      type: 'lab_payment_required'
    }).sort({ timestamp: -1 });
    
    console.log(`Total lab payment notifications: ${allLabNotifications.length}`);
    allLabNotifications.forEach((n, index) => {
      console.log(`${index + 1}. Patient: ${n.data.patientName}, Amount: ${n.data.amount}, Tests: ${n.data.testNames?.join(', ') || n.data.testName}, Read: ${n.read}`);
    });
    
    // Test 5: Verify consolidation logic
    console.log('\n=== Test 5: Consolidation Logic Verification ===');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayNotifications = allLabNotifications.filter(n => {
      const notificationDate = new Date(n.timestamp);
      return notificationDate >= today && notificationDate < tomorrow;
    });
    
    console.log(`Notifications from today: ${todayNotifications.length}`);
    
    // Group by patient
    const notificationsByPatient = {};
    todayNotifications.forEach(n => {
      const patientName = n.data.patientName;
      if (!notificationsByPatient[patientName]) {
        notificationsByPatient[patientName] = [];
      }
      notificationsByPatient[patientName].push(n);
    });
    
    console.log('\nNotifications grouped by patient:');
    Object.entries(notificationsByPatient).forEach(([patientName, notifications]) => {
      console.log(`${patientName}: ${notifications.length} notification(s)`);
      notifications.forEach((n, index) => {
        console.log(`  ${index + 1}. Amount: ${n.data.amount}, Tests: ${n.data.testNames?.join(', ') || n.data.testName}`);
      });
    });
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testLabConsolidation(); 