const mongoose = require('mongoose');
require('dotenv').config();

async function setupDrNatanTelegram() {
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

    console.log('📋 Current Dr. Natan settings:');
    console.log('  Name:', drNatan.firstName, drNatan.lastName);
    console.log('  Email:', drNatan.email);
    console.log('  Role:', drNatan.role);
    console.log('  Telegram Chat ID:', drNatan.telegramChatId || 'NOT SET');
    console.log('  Telegram Notifications Enabled:', drNatan.telegramNotificationsEnabled || false);
    console.log('  Telegram Username:', drNatan.telegramUsername || 'NOT SET');

    // Ask user for their chat ID
    console.log('\n🔧 To enable Telegram notifications for Dr. Natan, I need your Telegram chat ID.');
    console.log('📱 Please send a message to your bot @Newlifeclinicnotifcationbot');
    console.log('🆔 Then provide me with your chat ID (the long number you see in the bot logs)');

    // For now, I'll show you how to set it up manually
    console.log('\n📝 To configure Dr. Natan for Telegram notifications:');
    console.log('1. Go to your frontend application');
    console.log('2. Login as an admin user');
    console.log('3. Navigate to staff/doctor management');
    console.log('4. Find Dr. Natan and edit his profile');
    console.log('5. Set his Telegram settings:');
    console.log('   - Telegram Chat ID: [YOUR_CHAT_ID]');
    console.log('   - Enable Telegram Notifications: true');
    console.log('   - Telegram Username: [YOUR_USERNAME]');

    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    mongoose.disconnect();
  }
}

setupDrNatanTelegram();
