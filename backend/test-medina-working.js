console.log('🧪 Testing Medina Telegram Notification...\n');

require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const telegramService = require('./services/telegramService');

async function testMedina() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🤖 Initializing Telegram service...');
    await telegramService.initialize();
    console.log('✅ Telegram service initialized');

    // Medina's chat ID
    const medinaChatId = '333333915';
    
    const message = `🧪 **LAB ORDER NOTIFICATION TEST**

👤 **Patient:** John Doe
🆔 **Patient ID:** TEST-001
🧪 **Lab Tests:** Complete Blood Count, Blood Glucose
⏰ **Time:** ${new Date().toLocaleString()}

This is a test notification for Medina (Lab Staff).

If you receive this message, lab order notifications are working! 🎉`;

    console.log(`📱 Sending message to Medina (Chat ID: ${medinaChatId})...`);
    
    const result = await telegramService.sendMessageToStaff(
      medinaChatId,
      message,
      { parse_mode: 'Markdown' }
    );

    console.log('\n📊 Result:');
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    console.log('Message ID:', result.messageId);

    if (result.success) {
      console.log('\n🎉 SUCCESS! Medina should have received the test message!');
      console.log('Check Medina\'s Telegram to see the notification.');
    } else {
      console.log('\n❌ FAILED to send message to Medina');
      console.log('Error:', result.message);
    }

    console.log('\n🔌 Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
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

testMedina();
