require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const notificationService = require('./services/notificationService');

async function testNurseNotifications() {
  try {
    console.log('🧪 Testing Nurse Notification System...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test vitals update notification (nurses should receive this)
    console.log('❤️ Testing Vitals Update Notification...');
    const vitalsResult = await notificationService.sendNotification(
      'vitalsUpdate',
      {
        patientId: 'TEST-001',
        patientName: 'Test Patient',
        vitals: {
          temperature: '37.2°C',
          bloodPressure: '120/80',
          heartRate: '72 bpm',
          oxygenSaturation: '98%'
        }
      }
    );

    console.log('📊 Vitals Update Result:');
    console.log('Success:', vitalsResult.success ? '✅' : '❌');
    console.log('Recipients:', vitalsResult.results?.length || 0);

    if (vitalsResult.results) {
      vitalsResult.results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.recipientName}: ${result.success ? '✅' : '❌'}`);
      });
    }

    // Test procedure notification (nurses should receive this)
    console.log('\n🏥 Testing Procedure Notification...');
    const procedureResult = await notificationService.sendNotification(
      'procedure',
      {
        patientId: 'TEST-001',
        patientName: 'Test Patient',
        procedureName: 'Blood Draw',
        procedureDate: new Date().toISOString(),
        procedureTime: new Date().toLocaleTimeString(),
        notes: 'Routine blood work for patient checkup'
      }
    );

    console.log('📊 Procedure Result:');
    console.log('Success:', procedureResult.success ? '✅' : '❌');
    console.log('Recipients:', procedureResult.results?.length || 0);

    if (procedureResult.results) {
      procedureResult.results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.recipientName}: ${result.success ? '✅' : '❌'}`);
      });
    }

    // Test medication order notification (nurses should receive this)
    console.log('\n💊 Testing Medication Order Notification...');
    const medicationResult = await notificationService.sendNotification(
      'medicationOrder',
      {
        patientId: 'TEST-001',
        patientName: 'Test Patient',
        medicationName: 'Amoxicillin',
        dosage: '500mg',
        notes: 'Take twice daily for 7 days'
      }
    );

    console.log('📊 Medication Order Result:');
    console.log('Success:', medicationResult.success ? '✅' : '❌');
    console.log('Recipients:', medicationResult.results?.length || 0);

    if (medicationResult.results) {
      medicationResult.results.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.recipientName}: ${result.success ? '✅' : '❌'}`);
      });
    }

    console.log('\n🎉 Nurse notification system test completed!');
    console.log('\n📋 Summary:');
    console.log('- Vitals Updates: ' + (vitalsResult.success ? '✅' : '❌'));
    console.log('- Procedures: ' + (procedureResult.success ? '✅' : '❌'));
    console.log('- Medication Orders: ' + (medicationResult.success ? '✅' : '❌'));

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error testing nurse notifications:', error);
    mongoose.disconnect();
  }
}

testNurseNotifications();
