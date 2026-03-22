require('dotenv').config({ path: __dirname + '/.env' });
const TelegramBot = require('node-telegram-bot-api');

async function testDirectNotification() {
  try {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
    console.log('✅ Bot connected successfully');

    const chatId = '429020716'; // Your chat ID

    const notificationMessage = `🧪 **DIRECT TEST NOTIFICATION**

✅ Telegram bot is working
✅ Your chat ID: ${chatId}
✅ Dr. Natan is configured

If you receive this message, the Telegram notification system is fully functional!

Time: ${new Date().toLocaleString()}
Server: ${process.env.NODE_ENV || 'development'}`;

    console.log('📤 Sending test notification to chat ID:', chatId);

    await bot.sendMessage(chatId, notificationMessage, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });

    console.log('✅ Test notification sent successfully!');
    console.log('📱 Check your Telegram - you should have received the message!');

  } catch (err) {
    console.error('❌ Error sending notification:', err.message);
    console.error('Error code:', err.code);
    console.error('Error response:', err.response ? err.response.body : 'No response');
  }
}

testDirectNotification();
