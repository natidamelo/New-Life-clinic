console.log('🧪 Debug Notification System...\n');

require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function debugNotification() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if lab staff exist and have correct settings
    const User = mongoose.model('User', new mongoose.Schema({
      firstName: String,
      lastName: String,
      role: String,
      telegramChatId: String,
      telegramNotificationsEnabled: Boolean,
      notificationPreferences: Object
    }, { collection: 'users' }));

    console.log('🔍 Checking lab staff...');
    const labStaff = await User.find({ role: 'lab' });

    if (labStaff.length > 0) {
      console.log(`✅ Found ${labStaff.length} lab staff:`);
      labStaff.forEach(staff => {
        console.log(`  - ${staff.firstName} ${staff.lastName}`);
        console.log(`    Chat ID: ${staff.telegramChatId || 'NOT SET'}`);
        console.log(`    Notifications: ${staff.telegramNotificationsEnabled ? 'ENABLED' : 'DISABLED'}`);
        console.log(`    Lab Orders: ${staff.notificationPreferences?.labOrders ? 'ENABLED' : 'DISABLED'}`);
        console.log('');
      });
    } else {
      console.log('❌ No lab staff found');
    }

    // Test notification service
    console.log('📱 Testing notification service...');
    const notificationService = require('./services/notificationService');

    const testData = {
      patientId: 'TEST-001',
      patientName: 'Test Patient',
      labTests: [{ name: 'Test Lab', type: 'Blood Test' }]
    };

    console.log('Sending test notification...');
    const result = await notificationService.sendNotification('labOrder', testData);

    console.log('Result:', result.success ? '✅ SUCCESS' : '❌ FAILED');
    console.log('Message:', result.message);

    console.log('\n🔌 Disconnecting...');
    await mongoose.disconnect();
    console.log('✅ Disconnected');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    try {
      await mongoose.disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting:', disconnectError.message);
    }
  }
}

debugNotification();
