const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
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
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  // Full path to the recorded MP4 file on disk
  filePath: {
    type: String,
    required: true
  },
  // File size in bytes (updated after recording ends)
  fileSize: {
    type: Number,
    default: 0
  },
  // Duration in seconds
  duration: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['recording', 'completed', 'failed', 'deleted'],
    default: 'recording'
  },
  // Who triggered manual recording (null = auto/scheduled)
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // FFmpeg process PID for tracking active recordings
  ffmpegPid: {
    type: Number,
    default: null
  },
  // Notes
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

recordingSchema.index({ cameraId: 1, startTime: -1 });
recordingSchema.index({ clinicId: 1, status: 1 });

const Recording = mongoose.model('Recording', recordingSchema);

module.exports = Recording;
