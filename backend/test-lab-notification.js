require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const notificationService = require('./services/notificationService');

async function testLabNotification() {
  try {
    console.log('🧪 Testing Lab Order Notification for Medina...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test data for lab order
    const testLabOrder = {
      patientId: 'TEST-001',
      patientName: 'John Doe',
      labTests: [
        { name: 'Complete Blood Count', type: 'CBC' },
        { name: 'Blood Glucose', type: 'Fasting' },
        { name: 'Lipid Profile', type: 'Cholesterol' }
      ]
    };

    console.log('📱 Testing Lab Order Notification...');
    console.log('Patient:', testLabOrder.patientName);
    console.log('Lab Tests:', testLabOrder.labTests.map(t => t.name).join(', '));
    console.log('');

    const result = await notificationService.sendNotification(
      notificationService.notificationTypes.LAB_ORDER,
      testLabOrder
    );

    console.log('📊 Lab Order Notification Result:');
    console.log('Success:', result.success ? '✅' : '❌');
    console.log('Message:', result.message);
    
    if (result.results && result.results.length > 0) {
      console.log('\n📋 Recipients:');
      result.results.forEach((recipient, index) => {
        console.log(`  ${index + 1}. User ID: ${recipient.userId}`);
        console.log(`     Success: ${recipient.success ? '✅' : '❌'}`);
        console.log(`     Message: ${recipient.message}`);
        console.log(`     Message ID: ${recipient.messageId || 'N/A'}`);
        console.log('');
      });
    }

    console.log('🎉 Lab order notification test completed!');

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error testing lab notification:', error);
    mongoose.disconnect();
  }
}

testLabNotification();
