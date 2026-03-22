const mongoose = require('mongoose');
require('dotenv').config();

async function setSemhalTelegram() {
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

    // Find Semhal
    const semhal = await User.findOne({
      $or: [
        { firstName: 'Semhal', lastName: 'Melaku' },
        { email: 'semhalmelaku@clinic.com' }
      ]
    });

    if (!semhal) {
      console.log('❌ Semhal not found');
      return;
    }

    console.log('🔧 Setting up Semhal\'s Telegram settings...');
    console.log('📋 Current settings:');
    console.log('  - Name:', semhal.firstName, semhal.lastName);
    console.log('  - Email:', semhal.email);
    console.log('  - Role:', semhal.role);
    console.log('  - Current Chat ID:', semhal.telegramChatId || 'NOT SET');
    console.log('  - Notifications Enabled:', semhal.telegramNotificationsEnabled || false);

    // Ask user for Semhal's Chat ID
    console.log('\n📱 To set up Telegram for Semhal:');
    console.log('1. Semhal should message @Newlifeclinicnotifcationbot on Telegram');
    console.log('2. The bot will respond with her Chat ID');
    console.log('3. Enter that Chat ID below');

    // For now, let's set a placeholder
    const chatId = '12345678'; // Replace with Semhal's real Chat ID
    
    console.log(`\n🔧 Setting Chat ID to: ${chatId}`);
    semhal.telegramChatId = chatId;
    semhal.telegramNotificationsEnabled = true;
    semhal.telegramUsername = 'semhal_clinic';

    await semhal.save();

    console.log('✅ Semhal\'s Telegram settings updated:');
    console.log('  - Chat ID:', semhal.telegramChatId);
    console.log('  - Notifications Enabled:', semhal.telegramNotificationsEnabled);
    console.log('  - Username:', semhal.telegramUsername);

    console.log('\n📱 Now test the notification:');
    console.log('1. Make sure Semhal has the correct Chat ID from the bot');
    console.log('2. Update this script with her real Chat ID');
    console.log('3. Run it again to test');

    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    mongoose.disconnect();
  }
}

setSemhalTelegram();
