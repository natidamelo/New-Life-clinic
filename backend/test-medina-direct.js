require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');
const telegramService = require('./services/telegramService');

async function testMedinaDirect() {
  try {
    console.log('🧪 Testing Direct Message to Medina...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Initialize telegram service
    console.log('🔧 Initializing Telegram service...');
    await telegramService.initialize();
    console.log('✅ Telegram service initialized');

    // Medina's chat ID from the database
    const medinaChatId = '333333915';
    
    const testMessage = `🧪 **TEST MESSAGE FOR MEDINA**

✅ Server is running
✅ Bot is connected
✅ Direct message test

This is a test lab order notification for Medina!

Time: ${new Date().toLocaleString()}`;

    console.log(`📱 Sending direct message to Medina (Chat ID: ${medinaChatId})...`);
    
    const result = await telegramService.sendMessageToStaff(
      medinaChatId,
      testMessage,
      { parse_mode: 'Markdown' }
    );

    console.log('\n📊 Result:');
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    console.log('Message ID:', result.messageId);

    if (result.success) {
      console.log('\n🎉 Medina should have received the test message!');
    } else {
      console.log('\n❌ Failed to send message to Medina');
    }

    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    mongoose.disconnect();
  }
}

testMedinaDirect();
