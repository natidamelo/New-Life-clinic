require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./models/User');
  const users = await User.find({
    telegramNotificationsEnabled: true,
    telegramChatId: { $exists: true, $ne: null, $ne: '' }
  }).select('firstName lastName telegramChatId telegramUsername role');

  console.log('Staff with Telegram enabled:');
  users.forEach(u => console.log(JSON.stringify({
    name: u.firstName + ' ' + u.lastName,
    chatId: u.telegramChatId,
    role: u.role
  })));
  console.log('Total:', users.length);

  const chatIds = users.map(u => u.telegramChatId);
  const duplicates = chatIds.filter((id, i) => chatIds.indexOf(id) !== i);
  if (duplicates.length) {
    console.log('DUPLICATE CHAT IDs found:', duplicates);
  } else {
    console.log('No duplicate chat IDs');
  }

  mongoose.disconnect();
});
