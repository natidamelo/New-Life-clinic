const mongoose = require('mongoose');

const telegramConfigSchema = new mongoose.Schema({
  botToken: {
    type: String,
    required: true,
    trim: true
  },
  chatIds: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: false
  },
  botUsername: {
    type: String,
    trim: true
  },
  lastTestDate: {
    type: Date
  },
  testStatus: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for performance
telegramConfigSchema.index({ isActive: 1 });

// Method to add chat ID
telegramConfigSchema.methods.addChatId = function(chatId) {
  if (!this.chatIds.includes(chatId)) {
    this.chatIds.push(chatId);
    return true;
  }
  return false;
};

// Method to remove chat ID
telegramConfigSchema.methods.removeChatId = function(chatId) {
  const index = this.chatIds.indexOf(chatId);
  if (index > -1) {
    this.chatIds.splice(index, 1);
    return true;
  }
  return false;
};

// Static method to get active configuration
telegramConfigSchema.statics.getActiveConfig = async function() {
  return await this.findOne({ isActive: true });
};

// Static method to create or update configuration
telegramConfigSchema.statics.upsertConfig = async function(data, userId) {
  let config = await this.findOne({ isActive: true });

  if (config) {
    // Update existing configuration
    config.botToken = data.botToken;
    config.chatIds = data.chatIds || config.chatIds;
    config.botUsername = data.botUsername;
    config.updatedBy = userId;
    config.lastTestDate = null;
    config.testStatus = 'pending';
  } else {
    // Create new configuration
    config = new this({
      botToken: data.botToken,
      chatIds: data.chatIds || [],
      botUsername: data.botUsername,
      isActive: true,
      createdBy: userId,
      updatedBy: userId
    });
  }

  return await config.save();
};

const TelegramConfig = mongoose.model('TelegramConfig', telegramConfigSchema);

module.exports = TelegramConfig;
