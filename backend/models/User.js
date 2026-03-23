const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: true,
    default: 'default',
    index: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'reception', 'nurse', 'lab', 'imaging', 'doctor', 'billing', 'inventory', 'finance', 'pharmacy'],
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    default: 'General'
  },
  specialization: {
    type: String,
    required: function() {
      return this.role === 'doctor';
    }
  },
  permissions: {
    manageUsers: { type: Boolean, default: false },
    managePatients: { type: Boolean, default: false },
    manageAppointments: { type: Boolean, default: false },
    manageBilling: { type: Boolean, default: false },
    manageInventory: { type: Boolean, default: false },
    generateReports: { type: Boolean, default: false },
    viewReports: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  attendanceOverlayEnabled: {
    type: Boolean,
    default: true // Default to requiring attendance overlay
  },
  photo: {
    type: String, // URL to the photo
    default: null
  },
  // Telegram notification settings (for all staff)
  telegramChatId: {
    type: String,
    trim: true,
    sparse: true // Allow multiple null values for unique constraint
  },
  telegramNotificationsEnabled: {
    type: Boolean,
    default: false
  },
  telegramUsername: {
    type: String,
    trim: true
  },
  // Detailed notification preferences for different types
  notificationPreferences: {
    patientAssignments: { type: Boolean, default: true },
    vitalsUpdates: { type: Boolean, default: true },
    labOrders: { type: Boolean, default: true },
    imagingRequests: { type: Boolean, default: true },
    procedures: { type: Boolean, default: true },
    medicationOrders: { type: Boolean, default: true },
    emergencyAlerts: { type: Boolean, default: true },
    systemUpdates: { type: Boolean, default: false },
    billingUpdates: { type: Boolean, default: true },
    dailyRevenue: { type: Boolean, default: true },
    paymentAlerts: { type: Boolean, default: true },
    attendanceUpdates: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Index for telegram chat ID (unique when present)
userSchema.index({ telegramChatId: 1 }, { unique: true, sparse: true });

// Set default permissions based on role
userSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('role')) {
    switch (this.role) {
      case 'admin':
        this.permissions = {
          manageUsers: true,
          managePatients: true,
          manageAppointments: true,
          manageBilling: true,
          manageInventory: true,
          generateReports: true,
          viewReports: true
        };
        break;
      case 'super_admin':
        this.permissions = {
          manageUsers: true,
          managePatients: true,
          manageAppointments: true,
          manageBilling: true,
          manageInventory: true,
          generateReports: true,
          viewReports: true
        };
        break;
      case 'doctor':
        this.permissions = {
          managePatients: true,
          manageAppointments: true,
          viewReports: true
        };
        break;
      case 'billing':
        this.permissions.manageBilling = true;
        this.permissions.viewReports = true;
        break;
      case 'inventory':
        this.permissions.manageInventory = true;
        this.permissions.viewReports = true;
        break;
      case 'reception':
        this.permissions.managePatients = true;
        this.permissions.manageAppointments = true;
        break;
      // Other roles can have their default permissions set similarly
    }
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Static method to find user by email, username, or display name (case-insensitive)
userSchema.statics.findByEmailOrUsername = async function(identifier, clinicId = 'default') {
  if (!identifier || typeof identifier !== 'string') return null;
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  // 1) Exact email or username (case-insensitive)
  const byEmailOrUsername = await this.findOne({
    clinicId,
    $or: [
      { email: new RegExp('^' + trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
      { username: new RegExp('^' + trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
    ]
  });
  if (byEmailOrUsername) return byEmailOrUsername;

  // 2) Display name: "DR Natan" / "Dr. Natan" -> match firstName or lastName (e.g. "Natan")
  const namePart = trimmed.replace(/^dr\.?\s*/i, '').trim();
  if (namePart) {
    const byName = await this.findOne({
      clinicId,
      $or: [
        { firstName: new RegExp('^' + namePart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
        { lastName: new RegExp('^' + namePart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
      ]
    });
    if (byName) return byName;
  }

  return null;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 
