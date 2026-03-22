const mongoose = require('mongoose');

const userPreferencesSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Appearance settings
  appearance: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    primaryColor: {
      type: String,
      default: '#3B82F6' // Blue
    },
    colorTheme: {
      type: String,
      enum: ['default-light', 'default-dark', 'aqua', 'teal', 'light-blue', 'rose', 'pink', 'gold', 'orange', 'charcoal', 'navy', 'indigo', 'purple', 'maroon', 'forest-green', 'blue', 'green', 'red', 'gray', 'slate', 'zinc', 'neutral', 'stone', 'emerald', 'cyan', 'sky', 'violet', 'fuchsia', 'amber', 'lime', 'cool-breeze', 'icy-mint', 'custom'],
      default: 'default-light'
    },
    fontSize: {
      type: String,
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    },
    compactMode: {
      type: Boolean,
      default: false
    }
  },

  // Notification settings
  notifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      appointmentReminders: {
        type: Boolean,
        default: true
      },
      prescriptionAlerts: {
        type: Boolean,
        default: true
      },
      labResults: {
        type: Boolean,
        default: true
      },
      systemUpdates: {
        type: Boolean,
        default: true
      }
    },
    sms: {
      enabled: {
        type: Boolean,
        default: false
      },
      appointmentReminders: {
        type: Boolean,
        default: false
      },
      urgentAlerts: {
        type: Boolean,
        default: true
      }
    },
    push: {
      enabled: {
        type: Boolean,
        default: true
      },
      appointmentReminders: {
        type: Boolean,
        default: true
      },
      medicationAlerts: {
        type: Boolean,
        default: true
      }
    }
  },

  // Dashboard settings
  dashboard: {
    defaultView: {
      type: String,
      enum: ['overview', 'patients', 'appointments', 'consultations'],
      default: 'overview'
    },
    widgets: [{
      type: String,
      enum: ['recentPatients', 'todayAppointments', 'pendingTasks', 'revenue', 'quickStats']
    }],
    refreshInterval: {
      type: Number,
      default: 30000 // 30 seconds
    }
  },

  // Privacy settings
  privacy: {
    dataSharing: {
      type: Boolean,
      default: false
    },
    analytics: {
      type: Boolean,
      default: true
    },
    sessionTimeout: {
      type: Number,
      default: 480 // 8 hours in minutes
    }
  },

  // Security settings
  security: {
    twoFactorAuth: {
      enabled: {
        type: Boolean,
        default: false
      },
      method: {
        type: String,
        enum: ['email', 'sms', 'app'],
        default: 'email'
      }
    },
    loginNotifications: {
      type: Boolean,
      default: true
    },
    passwordPolicy: {
      minLength: {
        type: Number,
        default: 8
      },
      requireSpecialChars: {
        type: Boolean,
        default: true
      },
      requireNumbers: {
        type: Boolean,
        default: true
      }
    }
  },

  // Language and localization
  localization: {
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'Africa/Addis_Ababa'
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY'
    },
    timeFormat: {
      type: String,
      enum: ['12', '24'],
      default: '12'
    }
  },

  // Advanced settings
  advanced: {
    autoSave: {
      type: Boolean,
      default: true
    },
    debugMode: {
      type: Boolean,
      default: false
    },
    performanceMode: {
      type: Boolean,
      default: false
    },
    experimentalFeatures: {
      type: Boolean,
      default: false
    }
  },

  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  version: {
    type: String,
    default: '1.0'
  }
}, {
  timestamps: true
});

// Index for faster queries
userPreferencesSchema.index({ userId: 1 });

// Pre-save middleware to update lastUpdated
userPreferencesSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('UserPreferences', userPreferencesSchema);
