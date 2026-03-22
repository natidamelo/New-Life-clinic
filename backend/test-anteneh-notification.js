require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const notificationService = require('./services/notificationService');

async function testAntenehNotification() {
  try {
    console.log('🧪 Testing Lab Order Notification for Anteneh Tesfaye...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test data matching Anteneh's lab order
    const testData = {
      patientId: 'P10631-0631',
      patientName: 'Anteneh Tesfaye',
      labTests: [
        { name: 'Glucose, Fasting', type: 'Blood Test' }
      ]
    };

    console.log('📱 Sending lab order notification for Anteneh...');
    console.log('Patient:', testData.patientName);
    console.log('Lab Tests:', testData.labTests.map(t => t.name).join(', '));

    const result = await notificationService.sendNotification(
      'labOrder',
      testData
    );

    console.log('\n📊 Result:');
    console.log('Success:', result.success);
    console.log('Message:', result.message);

    if (result.results && result.results.length > 0) {
      console.log('\n📋 Recipients:');
      result.results.forEach((recipient, index) => {
        console.log(`  ${index + 1}. User: ${recipient.recipientName}`);
        console.log(`     Success: ${recipient.success}`);
        console.log(`     Message: ${recipient.message}`);
        console.log(`     Message ID: ${recipient.messageId || 'N/A'}`);
        console.log('');
      });
    }

    if (result.success) {
      console.log('🎉 SUCCESS! Staff should have received the lab order notification for Anteneh!');
      console.log('📱 Check Medina (Lab Staff) and DR Natan (Doctor) Telegram for notifications.');
    } else {
      console.log('❌ FAILED to send lab order notification');
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    mongoose.disconnect();
  }
}

testAntenehNotification();
