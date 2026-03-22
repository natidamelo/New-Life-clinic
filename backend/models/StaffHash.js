const mongoose = require('mongoose');

const staffHashSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uniqueHash: {
    type: String,
    required: true,
    unique: true
  },
  hashType: {
    type: String,
    enum: ['qr-checkin', 'qr-checkout', 'staff-registration'],
    default: 'qr-checkin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Add expiration for QR codes (24 hours for check-in/out, never for registration)
  expiresAt: {
    type: Date,
    default: null // Will be set based on hash type
  },
  lastUsed: {
    type: Date
  },
  usageCount: {
    type: Number,
    default: 0
  },
  deviceInfo: {
    userAgent: String,
    ipAddress: String,
    lastGeneratedAt: Date
  },
  // Device fingerprint for security
  deviceFingerprint: {
    type: String,
    index: true
  },
  rawFingerprint: {
    type: mongoose.Schema.Types.Mixed
  },
  // Location data
  registrationLocation: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    timestamp: Date
  },
  // Add permanent registration flag
  isPermanent: {
    type: Boolean,
    default: true // Device registrations are permanent by default
  },
  // Add registration date
  registeredAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
staffHashSchema.index({ userId: 1, hashType: 1 }, { unique: true }); // Allow one hash per user per type
staffHashSchema.index({ uniqueHash: 1 });

// Add method to check if hash is still valid (for device registrations, always valid)
staffHashSchema.methods.isValid = function() {
  if (this.hashType === 'staff-registration') {
    // Device registrations never expire
    return this.isActive;
  }
  
  // For other hash types, check if expired (if expiresAt exists)
  if (this.expiresAt) {
    return this.isActive && new Date() < this.expiresAt;
  }
  
  return this.isActive;
};

module.exports = mongoose.model('StaffHash', staffHashSchema);
