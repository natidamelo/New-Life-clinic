const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ MONGODB_URI not found in env');
  process.exit(1);
}

// User schema definition
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  role: String,
  telegramChatId: String,
  telegramNotificationsEnabled: Boolean,
  notificationPreferences: mongoose.Schema.Types.Mixed
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function checkRecipients() {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB Atlas');

    const recipients = await User.find({
      telegramNotificationsEnabled: true,
      telegramChatId: { $exists: true, $ne: null, $ne: '' }
    });

    console.log(`\n📋 Found ${recipients.length} recipients with Telegram notifications enabled:`);
    recipients.forEach((u, i) => {
      console.log(`  ${i+1}. ${u.firstName} ${u.lastName} (${u.role})`);
      console.log(`     Chat ID: ${u.telegramChatId}`);
      console.log(`     Preferences:`, JSON.stringify(u.notificationPreferences, null, 2));
    });

  } catch (err) {
    console.error('❌ Error querying DB:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkRecipients();
