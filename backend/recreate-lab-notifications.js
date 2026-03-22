const mongoose = require('mongoose');
const Notification = require('./models/Notification');
const InventoryItem = require('./models/InventoryItem');
const User = require('./models/User');
const Patient = require('./models/Patient');
const labTestMap = require('./config/labTestInventoryMap');

async function recreateLabNotifications() {
  try {
    await mongoose.connect('mongodb://localhost:27017/clinic-cms');
    console.log('Connected to MongoDB');
    
    // Find a default reception user to use as sender
    const defaultReceptionUser = await User.findOne({ role: 'reception' });
    if (!defaultReceptionUser) {
      throw new Error('No reception user found to create notifications');
    }
    
    // Define test combinations for patients with specific prices
    const patientTests = {
      'P40284-0284': [
        { name: 'Hemoglobin', price: 100 },
        { name: 'Glucose, Fasting', price: 200 }
      ],
      'P26805-6805': [
        { name: 'Hemoglobin', price: 100 },
        { name: 'Glucose, Fasting', price: 200 }
      ]
    };
    
    // Create consolidated notifications for each patient
    for (const [patientId, tests] of Object.entries(patientTests)) {
      // Find patient by patientId
      const patient = await Patient.findOne({ patientId });
      
      if (!patient) {
        console.warn(`Patient not found with ID: ${patientId}`);
        continue;
      }
      
      console.log(`\nProcessing notifications for ${patient.firstName} ${patient.lastName}`);
      
      // Special case for melody Natan to add HBsAg test
      if (patient.firstName === 'melody' && patient.lastName === 'Natan') {
        tests.push({ name: 'HBsAg', price: 0 });
      }
      
      // Calculate total amount using specified prices
      let totalAmount = tests.reduce((sum, test) => sum + test.price, 0);
      const testNames = tests.map(test => test.name);
      
      console.log(`Total amount for ${patient.firstName} ${patient.lastName}: ETB ${totalAmount}`);
      
      // Delete any existing notifications for this patient
      await Notification.deleteMany({
        type: 'lab_payment_required',
        'data.patientId': patient._id
      });
      
      // Create a new consolidated notification
      const consolidatedNotification = new Notification({
        type: 'lab_payment_required',
        title: 'Lab Tests Payment Required',
        message: `Payment required for lab tests: ${testNames.join(', ')} (Total: ETB ${totalAmount})`,
        recipientRole: 'reception',
        senderRole: 'doctor',
        senderId: defaultReceptionUser._id,
        read: false,
        data: {
          patientId: patient._id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          testNames: testNames,
          amount: totalAmount,
          totalAmount: totalAmount,
          itemCount: tests.length,
          paymentStatus: 'unpaid',
          consolidated: true,
          tests: tests.map(test => ({
            testName: test.name,
            price: test.price
          })),
          labOrderIds: [] // Add empty array to satisfy unique index
        }
      });
      
      // Save the new consolidated notification
      await consolidatedNotification.save();
      console.log(`Created consolidated notification for ${patient.firstName} ${patient.lastName}`);
    }
    
    console.log('\n✅ Lab Notification Recreation Complete');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

recreateLabNotifications(); 