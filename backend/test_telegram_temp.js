const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = '429020716'; // From database query

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN not found in env');
  process.exit(1);
}

console.log('Bot token:', token.substring(0, 15) + '...');
console.log('Sending message to chat ID:', chatId);

const bot = new TelegramBot(token, { polling: false });

console.log('⏳ Sending test message...');
const start = Date.now();

bot.sendMessage(chatId, '🔔 Test message from clinic server diagnostic!')
  .then(msg => {
    console.log(`\n✅ SUCCESS! Message sent successfully in ${Date.now() - start}ms!`);
    console.log('Message ID:', msg.message_id);
    process.exit(0);
  })
  .catch(err => {
    console.error(`\n❌ FAILED to send message in ${Date.now() - start}ms`);
    console.error('Error:', err.message || err);
    process.exit(1);
  });
