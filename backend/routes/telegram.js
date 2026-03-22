const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const TelegramBot = require('node-telegram-bot-api');
const {
  getTelegramConfig,
  upsertTelegramConfig,
  testTelegramConnection,
  addChatId,
  removeChatId,
  disableTelegram,
  setDoctorTelegramSettings,
  getDoctorsWithTelegram,
  testDoctorNotification,
  removeDoctorTelegramSettings
} = require('../controllers/telegramController');

// All routes require authentication and admin role
router.use(auth);
router.use(authorize(['admin', 'superadmin']));

// @route   GET /api/telegram/config
// @desc    Get Telegram configuration
// @access  Private (Admin only)
router.get('/config', getTelegramConfig);

// @route   POST /api/telegram/config
// @desc    Create or update Telegram configuration
// @access  Private (Admin only)
router.post('/config', upsertTelegramConfig);

// @route   POST /api/telegram/test
// @desc    Test Telegram bot connection
// @access  Private (Admin only)
router.post('/test', testTelegramConnection);

// @route   POST /api/telegram/chat-ids
// @desc    Add chat ID to configuration
// @access  Private (Admin only)
router.post('/chat-ids', addChatId);

// @route   DELETE /api/telegram/chat-ids/:chatId
// @desc    Remove chat ID from configuration
// @access  Private (Admin only)
router.delete('/chat-ids/:chatId', removeChatId);

// @route   PUT /api/telegram/disable
// @desc    Disable Telegram notifications
// @access  Private (Admin only)
router.put('/disable', disableTelegram);

// Doctor-specific routes (admin only for most operations)
router.use(authorize(['admin', 'superadmin']));

// @route   GET /api/telegram/doctors
// @desc    Get doctors with Telegram notifications enabled
// @access  Private (Admin only)
router.get('/doctors', getDoctorsWithTelegram);

// @route   POST /api/telegram/doctors/:doctorId/settings
// @desc    Set doctor's Telegram settings
// @access  Private (Admin or Doctor themselves)
router.post('/doctors/:doctorId/settings', (req, res, next) => {
  // Allow doctors to modify their own settings
  if (req.user.role === 'doctor' && req.user._id.toString() === req.params.doctorId) {
    return next();
  }
  // Otherwise require admin
  authorize(['admin', 'superadmin'])(req, res, next);
}, setDoctorTelegramSettings);

// @route   DELETE /api/telegram/doctors/:doctorId/settings
// @desc    Remove doctor's Telegram settings
// @access  Private (Admin or Doctor themselves)
router.delete('/doctors/:doctorId/settings', (req, res, next) => {
  // Allow doctors to modify their own settings
  if (req.user.role === 'doctor' && req.user._id.toString() === req.params.doctorId) {
    return next();
  }
  // Otherwise require admin
  authorize(['admin', 'superadmin'])(req, res, next);
}, removeDoctorTelegramSettings);

// @route   POST /api/telegram/doctors/:doctorId/test
// @desc    Test notification to a specific doctor
// @access  Private (Admin only)
router.post('/doctors/:doctorId/test', testDoctorNotification);

// @route   POST /api/telegram/webhook/:token
// @desc    Handle Telegram bot webhook (no auth required for webhook)
// @access  Public (Telegram webhook)
router.post('/webhook/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Get the bot token from environment or database
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken || token !== botToken) {
      console.log(`❌ Invalid webhook token: ${token}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.body) {
      console.log('❌ Empty webhook body');
      return res.status(400).json({ error: 'Empty body' });
    }

    console.log(`📱 Webhook received from Telegram:`, req.body);

    // Process the webhook update
    const telegramService = require('../services/telegramService');

    if (telegramService.isBotInitialized()) {
      // Let the bot handle the update
      const bot = telegramService.getBot();
      if (bot && bot.processUpdate) {
        await bot.processUpdate(req.body);
        console.log('✅ Webhook update processed successfully');
      } else {
        console.log('⚠️ Bot not available for webhook processing');
      }
    } else {
      console.log('⚠️ Bot not initialized, skipping webhook update');
    }

    // Always respond with 200 OK for Telegram webhooks
    res.status(200).json({ success: true, message: 'Update processed' });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
