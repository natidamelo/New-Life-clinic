const mongoose = require('mongoose');

const staffAttendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  checkInTime: {
    type: Date,
    required: true
  },
  checkOutTime: {
    type: Date
  },
  checkInLocation: {
    type: String,
    default: 'Main Entrance'
  },
  checkOutLocation: {
    type: String
  },
  totalHours: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['checked-in', 'checked-out'],
    default: 'checked-in'
  },
  // Ethiopian time-based attendance classification
  attendanceStatus: {
    type: String,
    enum: ['present-on-time', 'late-present', 'absent'],
    default: 'absent'
  },
  isWithinWorkingHours: {
    type: Boolean,
    default: false
  },
  ethiopianCheckInTime: {
    type: Date
  },
  ethiopianCheckOutTime: {
    type: Date
  },
  notes: {
    type: String
  },
  deviceInfo: {
    userAgent: String,
    ipAddress: String
  }
}, {
  timestamps: true
});

// Calculate total hours when checking out
staffAttendanceSchema.pre('save', function(next) {
  if (this.checkOutTime && this.checkInTime) {
    const diffMs = this.checkOutTime - this.checkInTime;
    this.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
  }
  next();
});

// Index for efficient queries
staffAttendanceSchema.index({ userId: 1, checkInTime: -1 });
staffAttendanceSchema.index({ status: 1 });
staffAttendanceSchema.index({ createdAt: -1 });

const StaffAttendance = mongoose.model('StaffAttendance', staffAttendanceSchema);

module.exports = StaffAttendance;
