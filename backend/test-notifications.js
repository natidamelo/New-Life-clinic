require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const notificationService = require('./services/notificationService');

async function testNotifications() {
  try {
    console.log('🧪 Testing Comprehensive Notification System...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test data
    const testPatient = {
      patientId: 'TEST-001',
      patientName: 'John Doe',
      contactNumber: '0912345678',
      age: 35,
      gender: 'Male'
    };

    const testVitals = {
      patientId: 'TEST-001',
      patientName: 'John Doe',
      bloodPressure: '120/80',
      heartRate: '72',
      temperature: '98.6°F',
      oxygenSaturation: '98%'
    };

    const testLabOrder = {
      patientId: 'TEST-001',
      patientName: 'John Doe',
      labTests: [
        { name: 'Complete Blood Count', type: 'CBC' },
        { name: 'Blood Glucose', type: 'Fasting' },
        { name: 'Lipid Profile', type: 'Cholesterol' }
      ]
    };

    const testImagingRequest = {
      patientId: 'TEST-001',
      patientName: 'John Doe',
      imagingTypes: ['X-Ray Chest', 'CT Scan Abdomen', 'MRI Brain']
    };

    const testProcedure = {
      patientId: 'TEST-001',
      patientName: 'John Doe',
      procedureName: 'Minor Surgery',
      procedureDate: '2025-01-15',
      procedureTime: '10:00 AM',
      notes: 'Patient requires minor surgical procedure'
    };

    const testMedicationOrder = {
      patientId: 'TEST-001',
      patientName: 'John Doe',
      medications: [
        { name: 'Amoxicillin', dosage: '500mg', frequency: '3 times daily' },
        { name: 'Ibuprofen', dosage: '400mg', frequency: 'As needed' }
      ]
    };

    const testEmergency = {
      patientId: 'TEST-001',
      patientName: 'John Doe',
      emergencyType: 'Cardiac Emergency',
      description: 'Patient experiencing chest pain and shortness of breath'
    };

    console.log('📱 Testing Patient Assignment Notification...');
    const assignmentResult = await notificationService.sendNotification(
      notificationService.notificationTypes.PATIENT_ASSIGNMENT,
      testPatient
    );
    console.log('Result:', assignmentResult.success ? '✅ Success' : '❌ Failed');
    console.log('Message:', assignmentResult.message);
    console.log('');

    console.log('📊 Testing Vitals Update Notification...');
    const vitalsResult = await notificationService.sendNotification(
      notificationService.notificationTypes.VITALS_UPDATE,
      testVitals
    );
    console.log('Result:', vitalsResult.success ? '✅ Success' : '❌ Failed');
    console.log('Message:', vitalsResult.message);
    console.log('');

    console.log('🧪 Testing Lab Order Notification...');
    const labResult = await notificationService.sendNotification(
      notificationService.notificationTypes.LAB_ORDER,
      testLabOrder
    );
    console.log('Result:', labResult.success ? '✅ Success' : '❌ Failed');
    console.log('Message:', labResult.message);
    console.log('');

    console.log('📷 Testing Imaging Request Notification...');
    const imagingResult = await notificationService.sendNotification(
      notificationService.notificationTypes.IMAGING_REQUEST,
      testImagingRequest
    );
    console.log('Result:', imagingResult.success ? '✅ Success' : '❌ Failed');
    console.log('Message:', imagingResult.message);
    console.log('');

    console.log('🏥 Testing Procedure Notification...');
    const procedureResult = await notificationService.sendNotification(
      notificationService.notificationTypes.PROCEDURE,
      testProcedure
    );
    console.log('Result:', procedureResult.success ? '✅ Success' : '❌ Failed');
    console.log('Message:', procedureResult.message);
    console.log('');

    console.log('💊 Testing Medication Order Notification...');
    const medicationResult = await notificationService.sendNotification(
      notificationService.notificationTypes.MEDICATION_ORDER,
      testMedicationOrder
    );
    console.log('Result:', medicationResult.success ? '✅ Success' : '❌ Failed');
    console.log('Message:', medicationResult.message);
    console.log('');

    console.log('🚨 Testing Emergency Alert Notification...');
    const emergencyResult = await notificationService.sendNotification(
      notificationService.notificationTypes.EMERGENCY_ALERT,
      testEmergency
    );
    console.log('Result:', emergencyResult.success ? '✅ Success' : '❌ Failed');
    console.log('Message:', emergencyResult.message);
    console.log('');

    console.log('🎉 Notification system test completed!');
    console.log('\n📋 Summary:');
    console.log('- Patient Assignment: ' + (assignmentResult.success ? '✅' : '❌'));
    console.log('- Vitals Update: ' + (vitalsResult.success ? '✅' : '❌'));
    console.log('- Lab Order: ' + (labResult.success ? '✅' : '❌'));
    console.log('- Imaging Request: ' + (imagingResult.success ? '✅' : '❌'));
    console.log('- Procedure: ' + (procedureResult.success ? '✅' : '❌'));
    console.log('- Medication Order: ' + (medicationResult.success ? '✅' : '❌'));
    console.log('- Emergency Alert: ' + (emergencyResult.success ? '✅' : '❌'));

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error testing notifications:', error);
    mongoose.disconnect();
  }
}

testNotifications(); 