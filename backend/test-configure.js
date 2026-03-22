const { configureDrNatanTelegram } = require('./configure-dr-natan-telegram.js');

console.log('Testing configuration with chat ID: 429020716');

configureDrNatanTelegram('429020716')
  .then(() => {
    console.log('✅ Configuration completed successfully');
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
  });
