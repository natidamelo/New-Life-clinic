const mongoose = require('mongoose');

const cameraEventSchema = new mongoose.Schema({
  cameraId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Camera',
    required: true,
    index: true
  },
  clinicId: {
    type: String,
    required: true,
    default: 'default',
    index: true
  },
  eventType: {
    type: String,
    enum: [
      'motion_detected',
      'camera_online',
      'camera_offline',
      'recording_started',
      'recording_stopped',
      'stream_reconnect',
      'ai_person_detected',
      'ai_intrusion_alert',
      'ai_face_recognized',
      'manual_snapshot'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'alert', 'critical'],
    default: 'info'
  },
  // Optional snapshot file path
  snapshotPath: {
    type: String,
    default: null
  },
  // AI inference results (for future AI features)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Whether admin has acknowledged/dismissed this event
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  acknowledgedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false // We control createdAt manually
});

// TTL index — auto-delete events older than 90 days
cameraEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });
cameraEventSchema.index({ cameraId: 1, createdAt: -1 });
cameraEventSchema.index({ clinicId: 1, eventType: 1 });

const CameraEvent = mongoose.model('CameraEvent', cameraEventSchema);

module.exports = CameraEvent;
