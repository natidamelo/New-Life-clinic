require('dotenv').config({ path: __dirname + '/.env' });

console.log('Environment check:');
console.log('TELEGRAM_BOT_TOKEN exists:', !!process.env.TELEGRAM_BOT_TOKEN);
console.log('TELEGRAM_BOT_TOKEN length:', process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.length : 0);

if (process.env.TELEGRAM_BOT_TOKEN) {
  console.log('Bot token format check:', process.env.TELEGRAM_BOT_TOKEN.split(':').length === 2 ? 'Valid format' : 'Invalid format');

  // Test Telegram bot connection
  const TelegramBot = require('node-telegram-bot-api');

  try {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    console.log('✅ Telegram bot instance created successfully');

    // Test bot info
    bot.getMe().then((me) => {
      console.log('🤖 Bot info:', me.username, me.first_name);
      console.log('✅ Bot connection test successful');
    }).catch((err) => {
      console.error('❌ Bot connection failed:', err.message);
    });
  } catch (err) {
    console.error('❌ Failed to create bot instance:', err.message);
  }
} else {
  console.log('❌ TELEGRAM_BOT_TOKEN not found in environment');
}
