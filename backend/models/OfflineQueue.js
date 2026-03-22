const mongoose = require('mongoose');

const offlineQueueSchema = new mongoose.Schema({
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
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
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
    isMobile: Boolean,
    offlineDuration: Number // in seconds
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'retry'],
    default: 'pending'
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  lastRetryAt: Date,
  errorMessage: String,
  syncAttempts: [{
    timestamp: Date,
    success: Boolean,
    errorMessage: String
  }],
  priority: {
    type: Number,
    default: 1 // 1 = high, 2 = medium, 3 = low
  }
}, {
  timestamps: true
});

// Indexes for better performance
offlineQueueSchema.index({ userId: 1, status: 1, timestamp: 1 });
offlineQueueSchema.index({ status: 1, priority: 1, timestamp: 1 });
offlineQueueSchema.index({ retryCount: 1, lastRetryAt: 1 });

module.exports = mongoose.model('OfflineQueue', offlineQueueSchema);
