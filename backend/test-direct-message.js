require('dotenv').config({ path: __dirname + '/.env' });
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
const chatId = '429020716'; // Your chat ID

console.log('Testing direct message to chat ID:', chatId);

const message = `🧪 **TEST MESSAGE**

✅ Server is running
✅ Bot is connected
✅ Dr. Natan is configured

If you receive this message, Telegram notifications are working!

Time: ${new Date().toLocaleString()}`;

bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
  .then(() => {
    console.log('✅ Test message sent successfully!');
  })
  .catch((err) => {
    console.error('❌ Failed to send test message:', err.message);
    console.error('Error code:', err.code);
    console.error('Error response:', err.response);
  });
