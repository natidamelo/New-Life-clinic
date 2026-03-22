require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const notificationService = require('./services/notificationService');

async function testDirectNotification() {
  try {
    console.log('🧪 Testing Direct Lab Order Notification...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Initialize notification service
    console.log('🔧 Initializing notification service...');
    await notificationService.initialize();
    console.log('✅ Notification service initialized');

    // Test data for lab order
    const testData = {
      patientId: 'TEST-001',
      patientName: 'John Doe',
      labTests: [
        { name: 'Complete Blood Count', type: 'CBC' },
        { name: 'Blood Glucose', type: 'Fasting' }
      ]
    };

    console.log('\n📱 Sending lab order notification...');
    console.log('Patient:', testData.patientName);
    console.log('Lab Tests:', testData.labTests.map(t => t.name).join(', '));

    const result = await notificationService.sendNotification(
      'labOrder', // Use correct notification type
      testData
    );

    console.log('\n📊 Result:');
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    
    if (result.results) {
      console.log('\n📋 Recipients:');
      result.results.forEach((recipient, index) => {
        console.log(`  ${index + 1}. User ID: ${recipient.userId}`);
        console.log(`     Success: ${recipient.success}`);
        console.log(`     Message: ${recipient.message}`);
      });
    }

    console.log('\n🎉 Test completed!');

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    mongoose.disconnect();
  }
}

testDirectNotification();
