require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('mongoose');

async function testUserModel() {
  try {
    console.log('🧪 Testing User Model Import...\n');

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test importing User model
    const User = require('./models/User');
    console.log('✅ User model imported successfully');

    // Test finding a user with telegram settings
    const usersWithTelegram = await User.find({
      telegramChatId: { $exists: true, $ne: null },
      telegramNotificationsEnabled: true
    }).limit(3);

    console.log(`✅ Found ${usersWithTelegram.length} users with Telegram settings:`);
    usersWithTelegram.forEach(user => {
      console.log(`  - ${user.firstName} ${user.lastName} (${user.role}) - Chat ID: ${user.telegramChatId}`);
    });

    mongoose.disconnect();
    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Error:', error.message);
    mongoose.disconnect();
  }
}

testUserModel();
