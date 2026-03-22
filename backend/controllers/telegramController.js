const TelegramConfig = require('../models/TelegramConfig');
const telegramService = require('../services/telegramService');

// @desc    Get Telegram configuration
// @route   GET /api/telegram/config
// @access  Private (Admin only)
const getTelegramConfig = async (req, res) => {
  try {
    const config = await TelegramConfig.findOne({ isActive: true })
      .select('-botToken') // Don't send bot token for security
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!config) {
      return res.json({
        success: true,
        data: null,
        message: 'No Telegram configuration found'
      });
    }

    // Check if bot is initialized
    const isBotInitialized = telegramService.isBotInitialized();

    res.json({
      success: true,
      data: {
        ...config.toObject(),
        isBotInitialized
      }
    });
  } catch (error) {
    console.error('Error fetching Telegram config:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create or update Telegram configuration
// @route   POST /api/telegram/config
// @access  Private (Admin only)
const upsertTelegramConfig = async (req, res) => {
  try {
    const { botToken, chatIds, botUsername } = req.body;

    // Validate required fields
    if (!botToken) {
      return res.status(400).json({
        success: false,
        message: 'Bot token is required'
      });
    }

    // Validate bot token format (basic validation)
    if (!botToken.match(/^\d+:[\w-]{35}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot token format'
      });
    }

    // Ensure chatIds is an array
    const chatIdsArray = Array.isArray(chatIds) ? chatIds : (chatIds ? [chatIds] : []);

    // Create or update configuration
    const config = await TelegramConfig.upsertConfig({
      botToken,
      chatIds: chatIdsArray,
      botUsername
    }, req.user._id);

    // Try to initialize the bot with new configuration
    const initialized = await telegramService.initialize();

    res.status(201).json({
      success: true,
      data: {
        ...config.toObject(),
        isBotInitialized: initialized
      },
      message: initialized ? 'Configuration updated and bot initialized successfully' : 'Configuration updated but bot initialization failed'
    });
  } catch (error) {
    console.error('Error upserting Telegram config:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Test Telegram bot connection
// @route   POST /api/telegram/test
// @access  Private (Admin only)
const testTelegramConnection = async (req, res) => {
  try {
    const result = await telegramService.testConnection();

    // Update test status in database
    if (result.success) {
      await TelegramConfig.findOneAndUpdate(
        { isActive: true },
        {
          lastTestDate: new Date(),
          testStatus: 'success',
          updatedBy: req.user._id
        }
      );
    } else {
      await TelegramConfig.findOneAndUpdate(
        { isActive: true },
        {
          lastTestDate: new Date(),
          testStatus: 'failed',
          updatedBy: req.user._id
        }
      );
    }

    res.json(result);
  } catch (error) {
    console.error('Error testing Telegram connection:', error);

    // Update test status as failed
    await TelegramConfig.findOneAndUpdate(
      { isActive: true },
      {
        lastTestDate: new Date(),
        testStatus: 'failed',
        updatedBy: req.user._id
      }
    );

    res.status(500).json({
      success: false,
      message: 'Error testing Telegram connection',
      error: error.message
    });
  }
};

// @desc    Add chat ID to configuration
// @route   POST /api/telegram/chat-ids
// @access  Private (Admin only)
const addChatId = async (req, res) => {
  try {
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID is required'
      });
    }

    const config = await TelegramConfig.findOne({ isActive: true });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No active Telegram configuration found'
      });
    }

    const added = config.addChatId(chatId);
    if (!added) {
      return res.status(400).json({
        success: false,
        message: 'Chat ID already exists in configuration'
      });
    }

    await config.save();

    // Update service chat IDs
    await telegramService.updateChatIds(config.chatIds);

    res.json({
      success: true,
      data: config.chatIds,
      message: 'Chat ID added successfully'
    });
  } catch (error) {
    console.error('Error adding chat ID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Remove chat ID from configuration
// @route   DELETE /api/telegram/chat-ids/:chatId
// @access  Private (Admin only)
const removeChatId = async (req, res) => {
  try {
    const { chatId } = req.params;

    const config = await TelegramConfig.findOne({ isActive: true });
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No active Telegram configuration found'
      });
    }

    const removed = config.removeChatId(chatId);
    if (!removed) {
      return res.status(404).json({
        success: false,
        message: 'Chat ID not found in configuration'
      });
    }

    await config.save();

    // Update service chat IDs
    await telegramService.updateChatIds(config.chatIds);

    res.json({
      success: true,
      data: config.chatIds,
      message: 'Chat ID removed successfully'
    });
  } catch (error) {
    console.error('Error removing chat ID:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Disable Telegram notifications
// @route   PUT /api/telegram/disable
// @access  Private (Admin only)
const disableTelegram = async (req, res) => {
  try {
    const config = await TelegramConfig.findOneAndUpdate(
      { isActive: true },
      {
        isActive: false,
        updatedBy: req.user._id
      },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No active Telegram configuration found'
      });
    }

    // Reset service state
    telegramService.isInitialized = false;
    telegramService.bot = null;
    telegramService.chatIds = [];

    res.json({
      success: true,
      message: 'Telegram notifications disabled successfully'
    });
  } catch (error) {
    console.error('Error disabling Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Set doctor's Telegram settings
// @route   POST /api/telegram/doctors/:doctorId/settings
// @access  Private (Admin or Doctor themselves)
const setDoctorTelegramSettings = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { telegramChatId, telegramUsername, enableNotifications } = req.body;

    // Check if user can modify this doctor's settings
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user._id.toString() !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this doctor\'s settings'
      });
    }

    const User = require('../models/User');

    // Check if doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    if (doctor.role !== 'doctor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a doctor'
      });
    }

    // Validate telegramChatId if provided
    if (telegramChatId) {
      // Check if another doctor already has this chat ID
      const existingDoctor = await User.findOne({
        telegramChatId: telegramChatId,
        _id: { $ne: doctorId }
      });

      if (existingDoctor) {
        return res.status(400).json({
          success: false,
          message: 'This Telegram chat ID is already registered to another doctor'
        });
      }
    }

    // Update doctor's Telegram settings
    doctor.telegramChatId = telegramChatId || doctor.telegramChatId;
    doctor.telegramUsername = telegramUsername || doctor.telegramUsername;
    doctor.telegramNotificationsEnabled = enableNotifications !== undefined ? enableNotifications : doctor.telegramNotificationsEnabled;

    await doctor.save();

    res.json({
      success: true,
      data: {
        _id: doctor._id,
        firstName: doctor.firstName,
        lastName: doctor.lastName,
        telegramChatId: doctor.telegramChatId,
        telegramUsername: doctor.telegramUsername,
        telegramNotificationsEnabled: doctor.telegramNotificationsEnabled
      },
      message: 'Doctor Telegram settings updated successfully'
    });
  } catch (error) {
    console.error('Error setting doctor Telegram settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get doctors with Telegram notifications enabled
// @route   GET /api/telegram/doctors
// @access  Private (Admin only)
const getDoctorsWithTelegram = async (req, res) => {
  try {
    const User = require('../models/User');

    const doctors = await User.find({
      role: 'doctor',
      telegramNotificationsEnabled: true,
      telegramChatId: { $exists: true, $ne: null, $ne: '' }
    }).select('_id firstName lastName department specialization telegramChatId telegramUsername telegramNotificationsEnabled');

    res.json({
      success: true,
      data: doctors,
      count: doctors.length
    });
  } catch (error) {
    console.error('Error fetching doctors with Telegram:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Test notification to a specific doctor
// @route   POST /api/telegram/doctors/:doctorId/test
// @access  Private (Admin only)
const testDoctorNotification = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const User = require('../models/User');

    // Check if doctor exists and has Telegram enabled
    const doctor = await User.findOne({
      _id: doctorId,
      role: 'doctor',
      telegramNotificationsEnabled: true,
      telegramChatId: { $exists: true, $ne: null, $ne: '' }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found or Telegram notifications not enabled'
      });
    }

    // Test message
    const testMessage = `👨‍⚕️ <b>Test Notification</b>\n\nHello Dr. ${doctor.firstName} ${doctor.lastName}!\n\n✅ Your Telegram notifications are working correctly.\n\n⏰ ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' })}`;

    // Send test message directly to this doctor
    const result = await telegramService.sendMessageToDoctor(doctor._id, testMessage);

    res.json({
      success: result.success,
      message: result.success ? 'Test notification sent successfully' : 'Failed to send test notification',
      result
    });
  } catch (error) {
    console.error('Error testing doctor notification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Remove doctor's Telegram settings
// @route   DELETE /api/telegram/doctors/:doctorId/settings
// @access  Private (Admin or Doctor themselves)
const removeDoctorTelegramSettings = async (req, res) => {
  try {
    const { doctorId } = req.params;

    // Check if user can modify this doctor's settings
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && req.user._id.toString() !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to modify this doctor\'s settings'
      });
    }

    const User = require('../models/User');

    // Check if doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Remove Telegram settings
    doctor.telegramChatId = null;
    doctor.telegramUsername = null;
    doctor.telegramNotificationsEnabled = false;

    await doctor.save();

    res.json({
      success: true,
      message: 'Doctor Telegram settings removed successfully'
    });
  } catch (error) {
    console.error('Error removing doctor Telegram settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
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
};
