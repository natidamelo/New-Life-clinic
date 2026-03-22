require('dotenv').config();

console.log('🔍 Environment Variables Check:');
console.log('================================');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✅ SET' : '❌ NOT SET');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ SET' : '❌ NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || 'not set');
console.log('================================');

if (process.env.TELEGRAM_BOT_TOKEN) {
  console.log('✅ Bot token is configured');
  console.log('📱 Bot Token:', process.env.TELEGRAM_BOT_TOKEN.substring(0, 20) + '...');
} else {
  console.log('❌ Bot token is missing!');
  console.log('💡 Add TELEGRAM_BOT_TOKEN to your .env file');
}
