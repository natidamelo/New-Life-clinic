const mongoose = require('mongoose');
require('dotenv').config();

async function configureDrNatanTelegram(chatId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({
      firstName: String,
      lastName: String,
      email: String,
      role: String,
      telegramChatId: String,
      telegramNotificationsEnabled: Boolean,
      telegramUsername: String
    }, { collection: 'users' }));

    // Find Dr. Natan
    const drNatan = await User.findOne({
      $or: [
        { firstName: 'DR', lastName: 'Natan' },
        { firstName: 'Natan', lastName: 'Kinfe' },
        { email: 'doctor123@clinic.com' }
      ]
    });

    if (!drNatan) {
      console.log('❌ Dr. Natan not found');
      return;
    }

    console.log('🔧 Configuring Dr. Natan for Telegram notifications...');

    // Update Dr. Natan's Telegram settings
    drNatan.telegramChatId = chatId;
    drNatan.telegramNotificationsEnabled = true;
    drNatan.telegramUsername = 'dr_natan_clinic';

    await drNatan.save();

    console.log('✅ Dr. Natan Telegram settings updated:');
    console.log('  - Chat ID:', drNatan.telegramChatId);
    console.log('  - Notifications Enabled:', drNatan.telegramNotificationsEnabled);
    console.log('  - Username:', drNatan.telegramUsername);

    console.log('\n🎉 Dr. Natan is now configured for Telegram notifications!');
    console.log('📱 The next time you assign a patient to Dr. Natan, you should receive a Telegram notification.');

    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    mongoose.disconnect();
  }
}

// Example usage:
// configureDrNatanTelegram('YOUR_CHAT_ID_HERE');

module.exports = { configureDrNatanTelegram };
