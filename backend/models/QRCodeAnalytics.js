const mongoose = require('mongoose');

const qrCodeAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['check-in', 'check-out', 'overtime-check-in', 'overtime-check-out'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    language: String,
    timezone: String,
    screenResolution: String,
    isMobile: Boolean
  },
  location: {
    type: String,
    default: 'Main Office'
  },
  method: {
    type: String,
    enum: ['qr-code', 'manual', 'biometric', 'batch'],
    default: 'qr-code'
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: String,
  processingTime: Number, // in milliseconds
  networkLatency: Number, // in milliseconds
  qrCodeHash: String,
  sessionId: String,
  ipAddress: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for better performance
qrCodeAnalyticsSchema.index({ userId: 1, timestamp: -1 });
qrCodeAnalyticsSchema.index({ action: 1, timestamp: -1 });
qrCodeAnalyticsSchema.index({ success: 1, timestamp: -1 });
qrCodeAnalyticsSchema.index({ method: 1, timestamp: -1 });

module.exports = mongoose.model('QRCodeAnalytics', qrCodeAnalyticsSchema);
