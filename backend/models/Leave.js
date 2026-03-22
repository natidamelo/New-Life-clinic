const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'personal', 'maternity', 'paternity', 'bereavement', 'other'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  // Ethiopian calendar dates
  ethiopianStartDate: {
    year: { type: Number },
    month: { type: Number },
    day: { type: Number },
    formatted: { type: String }
  },
  ethiopianEndDate: {
    year: { type: Number },
    month: { type: Number },
    day: { type: Number },
    formatted: { type: String }
  },
  numberOfDays: {
    type: Number,
    required: true,
    min: 0.5
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxLength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'pending review', 'approved', 'rejected', 'cancelled'],
    default: 'pending review',
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxLength: 500
  },
  attachments: [{
    filename: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: {
    type: String,
    trim: true,
    maxLength: 1000
  },
  isHalfDay: {
    type: Boolean,
    default: false
  },
  halfDayType: {
    type: String,
    enum: ['morning', 'afternoon'],
    required: function() {
      return this.isHalfDay;
    }
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  department: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true,
    default: function() {
      return new Date().getFullYear();
    }
  },
  ethiopianYear: {
    type: Number,
    default: function() {
      const ethiopianCalendar = require('../utils/ethiopianCalendar');
      return ethiopianCalendar.getCurrentEthiopianDate().year;
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
leaveSchema.index({ staffId: 1, year: 1 });
leaveSchema.index({ status: 1, requestedAt: -1 });
leaveSchema.index({ department: 1, status: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

// Virtual for calculating total days
leaveSchema.virtual('totalDays').get(function() {
  if (this.isHalfDay) {
    return 0.5;
  }
  return this.numberOfDays;
});

// Pre-save middleware to calculate number of working days (excluding Sundays only)
leaveSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    
    // Calculate working days excluding Sundays
    const calculateWorkingDays = (startDate, endDate) => {
      let workingDays = 0;
      const current = new Date(startDate);
      const end = new Date(endDate);
      
      while (current <= end) {
        const dayOfWeek = current.getDay();
        // 0 = Sunday - exclude only Sundays
        if (dayOfWeek !== 0) {
          workingDays++;
        }
        current.setDate(current.getDate() + 1);
      }
      return workingDays;
    };
    
    if (this.isHalfDay) {
      this.numberOfDays = 0.5;
    } else {
      this.numberOfDays = calculateWorkingDays(start, end);
    }
  }
  next();
});

// Static method to get leave balance for a staff member
leaveSchema.statics.getLeaveBalance = async function(staffId, year = new Date().getFullYear()) {
  const leaveBalance = await this.aggregate([
    {
      $match: {
        staffId: mongoose.Types.ObjectId(staffId),
        year: year,
        status: { $in: ['approved', 'pending'] }
      }
    },
    {
      $group: {
        _id: '$leaveType',
        totalDays: { $sum: '$numberOfDays' },
        approvedDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'approved'] }, '$numberOfDays', 0]
          }
        },
        pendingDays: {
          $sum: {
            $cond: [{ $eq: ['$status', 'pending'] }, '$numberOfDays', 0]
          }
        }
      }
    }
  ]);

  return leaveBalance;
};

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;
