const mongoose = require('mongoose');

const securityIncidentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  incidentType: {
    type: String,
    enum: [
      'DEVICE_MISMATCH',
      'LOCATION_VIOLATION',
      'FINGERPRINT_SPOOFING',
      'HASH_COPY_ATTEMPT',
      'UNAUTHORIZED_ACCESS',
      'SUSPICIOUS_ACTIVITY',
      'MULTIPLE_DEVICES',
      'UNREGISTERED_DEVICE'
    ],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  description: {
    type: String,
    required: true
  },
  details: {
    expectedDevice: String,
    actualDevice: String,
    expectedLocation: {
      latitude: Number,
      longitude: Number
    },
    actualLocation: {
      latitude: Number,
      longitude: Number,
      accuracy: Number
    },
    distance: Number, // Distance from clinic in meters
    deviceFingerprint: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    attemptedAction: String
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  resolution: String,
  notes: String
}, {
  timestamps: true
});

// Index for efficient queries
securityIncidentSchema.index({ createdAt: -1 });
securityIncidentSchema.index({ resolved: 1, severity: -1 });
securityIncidentSchema.index({ userId: 1, incidentType: 1, createdAt: -1 });

// Method to resolve incident
securityIncidentSchema.methods.resolve = function(adminId, resolution) {
  this.resolved = true;
  this.resolvedBy = adminId;
  this.resolvedAt = new Date();
  this.resolution = resolution;
  return this.save();
};

// Static method to get unresolved incidents
securityIncidentSchema.statics.getUnresolvedIncidents = function(filter = {}) {
  return this.find({ resolved: false, ...filter })
    .populate('userId', 'firstName lastName email role')
    .sort({ severity: -1, createdAt: -1 });
};

// Static method to get incidents by user
securityIncidentSchema.statics.getIncidentsByUser = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get recent critical incidents
securityIncidentSchema.statics.getCriticalIncidents = function(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    severity: { $in: ['HIGH', 'CRITICAL'] },
    createdAt: { $gte: since },
    resolved: false
  })
    .populate('userId', 'firstName lastName email role')
    .sort({ createdAt: -1 });
};

const SecurityIncident = mongoose.model('SecurityIncident', securityIncidentSchema);

module.exports = SecurityIncident;

