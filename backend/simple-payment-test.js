console.log('🧪 Testing Payment Notification System...\n');

require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const notificationService = require('./services/notificationService');

async function testPayment() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('📱 Testing payment-triggered notification...');
    
    const testData = {
      patientId: 'P000006',
      patientName: 'genet hailu',
      labTests: [{ name: 'Glucose, Fasting', type: 'Blood Test' }]
    };

    const result = await notificationService.sendNotification('labOrder', testData);

    console.log('\n📊 Result:');
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    
    if (result.results) {
      console.log('\n📋 Recipients:');
      result.results.forEach((recipient, index) => {
        console.log(`  ${index + 1}. ${recipient.recipientName}: ${recipient.success ? '✅' : '❌'}`);
      });
    }

    console.log('\n🔌 Disconnecting...');
    await mongoose.disconnect();
    console.log('✅ Disconnected');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting:', disconnectError.message);
    }
  }
}

testPayment();
