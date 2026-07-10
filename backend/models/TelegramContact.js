const mongoose = require('mongoose');

/**
 * TelegramContact Schema
 * Maps patient phone numbers to Telegram chat IDs.
 * When a patient messages the clinic's Telegram bot and shares their phone number,
 * this mapping is stored so that the system can send them messages automatically
 * (e.g., card ID after registration).
 */
const telegramContactSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  telegramChatId: {
    type: String,
    required: true,
    trim: true
  },
  telegramUsername: {
    type: String,
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  linkedAt: {
    type: Date,
    default: Date.now
  },
  lastMessageSentAt: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TelegramContact', telegramContactSchema);
