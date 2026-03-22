const mongoose = require('mongoose');

const deviceRegistrationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceHash: {
    type: String,
    required: true,
    unique: true
  },
  staffHashId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StaffHash',
    required: true
  },
  deviceFingerprint: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: 'Unknown'
  },
  ipAddress: {
    type: String,
    default: 'Unknown'
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'deviceregistrations'
});

// Index for quick lookups
deviceRegistrationSchema.index({ userId: 1, isActive: 1 });
deviceRegistrationSchema.index({ deviceHash: 1, isActive: 1 });
deviceRegistrationSchema.index({ userId: 1, deviceFingerprint: 1 }, { unique: true });

module.exports = mongoose.model('DeviceRegistration', deviceRegistrationSchema);
