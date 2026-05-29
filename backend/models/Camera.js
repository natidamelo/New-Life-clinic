const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: true,
    default: 'default',
    index: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  // AES-256-GCM encrypted RTSP URL — never stored in plain text
  rtspUrlEncrypted: {
    type: String,
    required: true
  },
  // IV used for AES encryption (hex-encoded)
  rtspUrlIv: {
    type: String,
    required: true
  },
  // Auth tag for AES-GCM (hex-encoded)
  rtspUrlAuthTag: {
    type: String,
    required: true
  },
  // Unique key used in go2rtc stream path (UUID, safe to expose)
  streamKey: {
    type: String,
    required: true,
    unique: true
  },
  room: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    default: 'Main Hall'
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'unknown'],
    default: 'unknown'
  },
  lastSeenAt: {
    type: Date,
    default: null
  },
  recordingEnabled: {
    type: Boolean,
    default: false
  },
  recordingActive: {
    type: Boolean,
    default: false
  },
  currentRecordingPath: {
    type: String,
    default: null
  },
  // go2rtc stream registration state
  streamRegistered: {
    type: Boolean,
    default: false
  },
  // Notes for the camera
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for fast clinic-based queries
cameraSchema.index({ clinicId: 1, status: 1 });
cameraSchema.index({ streamKey: 1 }, { unique: true });

const Camera = mongoose.model('Camera', cameraSchema);

module.exports = Camera;
