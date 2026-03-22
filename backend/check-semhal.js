const mongoose = require('mongoose');
require('dotenv').config();

async function checkSemhal() {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check Semhal's Telegram settings
    const User = mongoose.model('User', new mongoose.Schema({
      firstName: String,
      lastName: String,
      email: String,
      role: String,
      telegramChatId: String,
      telegramNotificationsEnabled: Boolean,
      telegramUsername: String
    }, { collection: 'users' }));

    console.log('🔍 Searching for Semhal...');
    const semhal = await User.findOne({
      $or: [
        { firstName: 'Semhal', lastName: 'Melaku' },
        { email: 'semhalmelaku@clinic.com' }
      ]
    });

    if (semhal) {
      console.log('✅ Semhal found:', {
        id: semhal._id,
        name: semhal.firstName + ' ' + semhal.lastName,
        email: semhal.email,
        role: semhal.role,
        telegramChatId: semhal.telegramChatId || 'NOT SET',
        telegramNotificationsEnabled: semhal.telegramNotificationsEnabled || false,
        telegramUsername: semhal.telegramUsername || 'NOT SET'
      });

      // Test sending a message to Semhal if she has a Chat ID
      if (semhal.telegramChatId) {
        console.log('\n📱 Testing message to Semhal...');
        
        const TelegramBot = require('node-telegram-bot-api');
        const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
        
        const message = `🧪 **TEST MESSAGE FOR SEMHAL**

✅ Server is running
✅ Bot is connected
✅ Semhal is configured

If you receive this message, Telegram notifications are working for Semhal!

Time: ${new Date().toLocaleString()}`;

        try {
          await bot.sendMessage(semhal.telegramChatId, message, { parse_mode: 'Markdown' });
          console.log('✅ Test message sent successfully to Semhal!');
        } catch (error) {
          console.error('❌ Failed to send test message to Semhal:', error.message);
        }
      } else {
        console.log('❌ Semhal does not have a Telegram Chat ID set');
      }
    } else {
      console.log('❌ Semhal not found');
      // List all users to help find her
      const users = await User.find({}).limit(10);
      console.log(`Found ${users.length} users:`);
      users.forEach(u => {
        console.log(`  - ${u.firstName} ${u.lastName} (${u.email}) - Role: ${u.role}`);
      });
    }

    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    mongoose.disconnect();
  }
}

checkSemhal();
