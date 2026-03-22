const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    default: 'general',
    enum: ['general', 'attendance', 'security', 'ui', 'notifications']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient lookups
systemSettingSchema.index({ key: 1 });
systemSettingSchema.index({ category: 1 });

// Static method to get a setting value
systemSettingSchema.statics.getValue = async function(key, defaultValue = null) {
  try {
    const setting = await this.findOne({ key, isActive: true });
    return setting ? setting.value : defaultValue;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
};

// Static method to set a setting value
systemSettingSchema.statics.setValue = async function(key, value, description = null, category = 'general', updatedBy = null) {
  try {
    const setting = await this.findOneAndUpdate(
      { key },
      { 
        value, 
        description: description || `Setting for ${key}`,
        category,
        updatedBy,
        isActive: true
      },
      { upsert: true, new: true }
    );
    return setting;
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    throw error;
  }
};

module.exports = mongoose.model('SystemSetting', systemSettingSchema);

