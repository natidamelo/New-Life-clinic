require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function testNotificationQuick() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    console.log('🤖 Testing notification service...');
    const notificationService = require('./services/notificationService');

    const result = await notificationService.sendNotification('labOrder', {
      patientId: 'TEST-001',
      patientName: 'Test Patient',
      labTests: [{ name: 'Test Lab', type: 'Blood Test' }]
    });

    console.log('✅ Notification sent:', result.success);
    console.log('📊 Recipients:', result.results?.length || 0);

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

testNotificationQuick();
