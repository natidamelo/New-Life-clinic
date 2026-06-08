const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

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
    console.log(`✅ Message sent successfully in ${Date.now() - start}ms!`);
    console.log('Message details:', JSON.stringify(msg, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(`❌ Failed to send message in ${Date.now() - start}ms`);
    console.error('Error:', err.message || err);
    process.exit(1);
  });
