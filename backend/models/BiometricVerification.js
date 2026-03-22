const mongoose = require('mongoose');

const biometricVerificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  biometricType: {
    type: String,
    enum: ['fingerprint', 'face-id', 'voice', 'iris', 'palm'],
    required: true
  },
  biometricHash: {
    type: String,
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  usageCount: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  securityLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Indexes for better performance
biometricVerificationSchema.index({ userId: 1, biometricType: 1 });
biometricVerificationSchema.index({ deviceId: 1, isActive: 1 });
biometricVerificationSchema.index({ biometricHash: 1 });

module.exports = mongoose.model('BiometricVerification', biometricVerificationSchema);
