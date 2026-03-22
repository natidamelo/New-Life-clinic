const mongoose = require('mongoose');

const globalSettingsSchema = new mongoose.Schema({
  // Role-specific settings - each role has its own isolated settings
  roleSettings: {
    // Doctor role settings
    doctor: {
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
        secondaryColor: {
          type: String,
          default: '#10B981' // Green
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
        },
        sidebarCollapsed: {
          type: Boolean,
          default: false
        }
      },
      notifications: {
        enabled: {
          type: Boolean,
          default: true
        },
        soundEnabled: {
          type: Boolean,
          default: true
        },
        desktopNotifications: {
          type: Boolean,
          default: true
        },
        emailNotifications: {
          type: Boolean,
          default: true
        },
        smsNotifications: {
          type: Boolean,
          default: false
        }
      },
      dashboard: {
        refreshInterval: {
          type: Number,
          default: 30000 // 30 seconds
        },
        showWelcomeMessage: {
          type: Boolean,
          default: true
        },
        enableQuickActions: {
          type: Boolean,
          default: true
        },
        defaultView: {
          type: String,
          enum: ['overview', 'patients', 'appointments', 'consultations'],
          default: 'overview'
        },
        showPatientPhotos: {
          type: Boolean,
          default: true
        },
        autoRefreshPatients: {
          type: Boolean,
          default: true
        }
      }
    },

    // Lab role settings
    lab: {
      appearance: {
        theme: {
          type: String,
          enum: ['light', 'dark', 'auto'],
          default: 'light'
        },
        primaryColor: {
          type: String,
          default: '#DC2626' // Red for lab
        },
        secondaryColor: {
          type: String,
          default: '#059669' // Green
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
        },
        sidebarCollapsed: {
          type: Boolean,
          default: false
        }
      },
      notifications: {
        enabled: {
          type: Boolean,
          default: true
        },
        soundEnabled: {
          type: Boolean,
          default: true
        },
        desktopNotifications: {
          type: Boolean,
          default: true
        },
        emailNotifications: {
          type: Boolean,
          default: true
        },
        smsNotifications: {
          type: Boolean,
          default: false
        }
      },
      dashboard: {
        refreshInterval: {
          type: Number,
          default: 30000 // 30 seconds
        },
        showWelcomeMessage: {
          type: Boolean,
          default: true
        },
        enableQuickActions: {
          type: Boolean,
          default: true
        },
        autoRefreshResults: {
          type: Boolean,
          default: true
        },
        showNormalRanges: {
          type: Boolean,
          default: true
        },
        defaultTestView: {
          type: String,
          enum: ['grid', 'list'],
          default: 'list'
        }
      }
    },

    // Imaging role settings
    imaging: {
      appearance: {
        theme: {
          type: String,
          enum: ['light', 'dark', 'auto'],
          default: 'light'
        },
        primaryColor: {
          type: String,
          default: '#7C3AED' // Purple for imaging
        },
        secondaryColor: {
          type: String,
          default: '#059669' // Green
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
        },
        sidebarCollapsed: {
          type: Boolean,
          default: false
        }
      },
      notifications: {
        enabled: {
          type: Boolean,
          default: true
        },
        soundEnabled: {
          type: Boolean,
          default: true
        },
        desktopNotifications: {
          type: Boolean,
          default: true
        },
        emailNotifications: {
          type: Boolean,
          default: true
        },
        smsNotifications: {
          type: Boolean,
          default: false
        }
      },
      dashboard: {
        refreshInterval: {
          type: Number,
          default: 30000 // 30 seconds
        },
        showWelcomeMessage: {
          type: Boolean,
          default: true
        },
        enableQuickActions: {
          type: Boolean,
          default: true
        },
        autoRefreshOrders: {
          type: Boolean,
          default: true
        },
        showImagePreview: {
          type: Boolean,
          default: true
        },
        defaultView: {
          type: String,
          enum: ['pending', 'completed', 'all'],
          default: 'pending'
        }
      }
    },

    // Reception role settings
    reception: {
      appearance: {
        theme: {
          type: String,
          enum: ['light', 'dark', 'auto'],
          default: 'light'
        },
        primaryColor: {
          type: String,
          default: '#EA580C' // Orange for reception
        },
        secondaryColor: {
          type: String,
          default: '#059669' // Green
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
        },
        sidebarCollapsed: {
          type: Boolean,
          default: false
        }
      },
      notifications: {
        enabled: {
          type: Boolean,
          default: true
        },
        soundEnabled: {
          type: Boolean,
          default: true
        },
        desktopNotifications: {
          type: Boolean,
          default: true
        },
        emailNotifications: {
          type: Boolean,
          default: true
        },
        smsNotifications: {
          type: Boolean,
          default: false
        }
      },
      dashboard: {
        refreshInterval: {
          type: Number,
          default: 30000 // 30 seconds
        },
        showWelcomeMessage: {
          type: Boolean,
          default: true
        },
        enableQuickActions: {
          type: Boolean,
          default: true
        },
        autoRefreshQueue: {
          type: Boolean,
          default: true
        },
        showPatientPhotos: {
          type: Boolean,
          default: true
        },
        defaultSortBy: {
          type: String,
          enum: ['time', 'name', 'priority'],
          default: 'time'
        }
      }
    },

    // Nurse role settings
    nurse: {
      appearance: {
        theme: {
          type: String,
          enum: ['light', 'dark', 'auto'],
          default: 'light'
        },
        primaryColor: {
          type: String,
          default: '#DB2777' // Pink for nurse
        },
        secondaryColor: {
          type: String,
          default: '#059669' // Green
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
        },
        sidebarCollapsed: {
          type: Boolean,
          default: false
        }
      },
      notifications: {
        enabled: {
          type: Boolean,
          default: true
        },
        soundEnabled: {
          type: Boolean,
          default: true
        },
        desktopNotifications: {
          type: Boolean,
          default: true
        },
        emailNotifications: {
          type: Boolean,
          default: true
        },
        smsNotifications: {
          type: Boolean,
          default: false
        }
      },
      dashboard: {
        refreshInterval: {
          type: Number,
          default: 30000 // 30 seconds
        },
        showWelcomeMessage: {
          type: Boolean,
          default: true
        },
        enableQuickActions: {
          type: Boolean,
          default: true
        },
        autoRefreshTasks: {
          type: Boolean,
          default: true
        },
        showVitalSigns: {
          type: Boolean,
          default: true
        },
        defaultTaskView: {
          type: String,
          enum: ['pending', 'completed', 'all'],
          default: 'pending'
        }
      }
    }
  },

  // Security settings
  security: {
    sessionTimeout: {
      type: Number,
      default: 480 // 8 hours in minutes
    },
    requirePasswordChange: {
      type: Boolean,
      default: false
    },
    passwordExpiryDays: {
      type: Number,
      default: 90
    }
  },

  // System-wide settings
  system: {
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    allowUserRegistration: {
      type: Boolean,
      default: false
    },
    enableAuditLog: {
      type: Boolean,
      default: true
    }
  },

  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  version: {
    type: String,
    default: '1.0'
  }
}, {
  timestamps: true
});

// Index for faster queries
globalSettingsSchema.index({ updatedBy: 1 });

// Pre-save middleware to update lastUpdated
globalSettingsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Static method to get current global settings
globalSettingsSchema.statics.getCurrentSettings = async function() {
  try {
    let settings = await this.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      // Create default settings if none exist
      settings = new this({
        updatedBy: new mongoose.Types.ObjectId() // You might want to set this to a default admin user
      });
      await settings.save();
    }
    
    return settings;
  } catch (error) {
    console.error('Error getting current global settings:', error);
    throw error;
  }
};

// Static method to get role-specific settings
globalSettingsSchema.statics.getRoleSettings = async function(role) {
  try {
    const settings = await this.getCurrentSettings();
    return settings.roleSettings[role] || null;
  } catch (error) {
    console.error(`Error getting ${role} role settings:`, error);
    throw error;
  }
};

// Static method to update role-specific settings
globalSettingsSchema.statics.updateRoleSettings = async function(role, updates, updatedBy) {
  try {
    const currentSettings = await this.getCurrentSettings();
    
    // Initialize role settings if they don't exist
    if (!currentSettings.roleSettings) {
      currentSettings.roleSettings = {};
    }
    
    if (!currentSettings.roleSettings[role]) {
      currentSettings.roleSettings[role] = {};
    }
    
    // Update the role-specific settings
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
          // Handle nested objects
          currentSettings.roleSettings[role][key] = { 
            ...currentSettings.roleSettings[role][key], 
            ...updates[key] 
          };
        } else {
          currentSettings.roleSettings[role][key] = updates[key];
        }
      }
    });
    
    currentSettings.updatedBy = updatedBy;
    currentSettings.lastUpdated = new Date();
    
    return await currentSettings.save();
  } catch (error) {
    console.error(`Error updating ${role} role settings:`, error);
    throw error;
  }
};

// Static method to update global settings (for admin use)
globalSettingsSchema.statics.updateSettings = async function(updates, updatedBy) {
  try {
    const currentSettings = await this.getCurrentSettings();
    
    // Update the settings
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
          // Handle nested objects
          currentSettings[key] = { ...currentSettings[key], ...updates[key] };
        } else {
          currentSettings[key] = updates[key];
        }
      }
    });
    
    currentSettings.updatedBy = updatedBy;
    currentSettings.lastUpdated = new Date();
    
    return await currentSettings.save();
  } catch (error) {
    console.error('Error updating global settings:', error);
    throw error;
  }
};

module.exports = mongoose.model('GlobalSettings', globalSettingsSchema);
