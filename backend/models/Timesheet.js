const mongoose = require('mongoose');

const timesheetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  clockIn: {
    time: {
      type: Date,
      required: true
    },
    location: {
      type: String,
      default: 'Main Office'
    },
    method: {
      type: String,
      enum: ['manual', 'system', 'mobile', 'qr-code'],
      default: 'system'
    },
    // Ethiopian time tracking
    ethiopianTime: {
      type: Date
    },
    // Attendance status based on check-in time
    attendanceStatus: {
      type: String,
      enum: ['on-time', 'late', 'absent', 'overtime-checkin'],
      default: 'absent'
    },
    // Minutes late if applicable
    minutesLate: {
      type: Number,
      default: 0
    }
  },
  clockOut: {
    time: {
      type: Date
    },
    location: {
      type: String,
      default: 'Main Office'
    },
    method: {
      type: String,
      enum: ['manual', 'system', 'mobile', 'qr-code'],
      default: 'system'
    },
    // Ethiopian time tracking
    ethiopianTime: {
      type: Date
    },
    // Early clock out detection
    isEarlyClockOut: {
      type: Boolean,
      default: false
    },
    // Minutes early if applicable
    minutesEarly: {
      type: Number,
      default: 0
    },
    // Automatic clock out reason
    automaticReason: {
      type: String,
      enum: ['overtime_transition', 'system_timeout', 'shift_end'],
      required: false
    }
  },
  breaks: [{
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date
    },
    duration: {
      type: Number, // in minutes
      default: 0
    },
    type: {
      type: String,
      enum: ['lunch', 'coffee', 'personal', 'other'],
      default: 'lunch'
    }
  }],
  totalWorkHours: {
    type: Number, // in hours
    default: 0
  },
  totalBreakHours: {
    type: Number, // in hours
    default: 0
  },
      // Overtime tracking
    overtimeHours: {
      type: Number, // in hours
      default: 0
    },
    overtimeMinutes: {
      type: Number, // in minutes
      default: 0
    },
  isOvertime: {
    type: Boolean,
    default: false,
    validate: {
      validator: function(v) {
        // If this is an overtime timesheet, it should have appropriate data
        if (v === true) {
          return this.clockIn && this.clockIn.attendanceStatus === 'overtime-checkin';
        }
        return true;
      },
      message: 'Overtime timesheets must have overtime-checkin attendance status'
    }
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'approved', 'rejected'],
    default: 'active'
  },
  notes: {
    type: String,
    maxLength: 500
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  department: {
    type: String,
    required: true
  },
  shift: {
    type: String,
    enum: ['morning', 'afternoon', 'night', 'flexible'],
    default: 'flexible'
  },
  // Working hours configuration (Local Time)
  workingHours: {
    startTime: {
      type: String,
      default: '08:30' // 8:30 AM Local Time
    },
    endTime: {
      type: String,
      default: '17:00' // 5:00 PM Local Time
    },
    gracePeriod: {
      type: Number,
      default: 15 // 15 minutes grace period for late arrival
    },
    // Early check-out threshold (before 11:00 AM Local Time)
    earlyCheckOutThreshold: {
      type: String,
      default: '11:00' // 11:00 AM Local Time
    }
  },
          // Overtime configuration
        overtime: {
          startTime: {
            type: String,
            default: '17:00' // 5:00 PM Local Time
          },
          endTime: {
            type: String,
            default: '01:30' // 1:30 AM next day Local Time
          }
        },
  // Overall attendance status for the day
  dayAttendanceStatus: {
    type: String,
          enum: ['present', 'absent', 'late', 'early-clock-out', 'partial', 'overtime-checkin', 'overtime-complete'],
    default: 'absent'
  }
}, {
  timestamps: true
});

// Index for efficient queries
timesheetSchema.index({ userId: 1, date: 1 });
timesheetSchema.index({ department: 1, date: 1 });
timesheetSchema.index({ status: 1 });
timesheetSchema.index({ dayAttendanceStatus: 1 });

// Virtual for calculating total hours
timesheetSchema.virtual('netWorkHours').get(function() {
  return this.totalWorkHours - this.totalBreakHours;
});

// Method to get Local time (no conversion needed)
timesheetSchema.methods.getLocalTime = function(date) {
  return date; // Use local time directly
};

// Method to check if time is within working hours
timesheetSchema.methods.isWithinWorkingHours = function(time) {
  const localTime = this.getLocalTime(time);
  const hours = localTime.getHours();
  const minutes = localTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  // Parse working hours
  const [startHour, startMin] = this.workingHours.startTime.split(':').map(Number);
  const [endHour, endMin] = this.workingHours.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return totalMinutes >= startMinutes && totalMinutes <= endMinutes;
};

// Method to check if check-in is late
timesheetSchema.methods.isLateCheckIn = function(checkInTime) {
  const localTime = this.getLocalTime(checkInTime);
  const hours = localTime.getHours();
  const minutes = localTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  const [startHour, startMin] = this.workingHours.startTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const gracePeriodMinutes = this.workingHours.gracePeriod;
  
  return totalMinutes > (startMinutes + gracePeriodMinutes);
};

// Method to check if check-out is early (before end time)
timesheetSchema.methods.isEarlyCheckOut = function(checkOutTime) {
  const localTime = this.getLocalTime(checkOutTime);
  const hours = localTime.getHours();
  const minutes = localTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  // Check if check-out is before the end time (5:00 PM Local Time)
  const [endHour, endMin] = this.workingHours.endTime.split(':').map(Number);
  const endMinutes = endHour * 60 + endMin;
  
  return totalMinutes < endMinutes;
};

// Method to check if check-out is before end time (5:00 PM)
timesheetSchema.methods.isBeforeEndTime = function(checkOutTime) {
  const localTime = this.getLocalTime(checkOutTime);
  const hours = localTime.getHours();
  const minutes = localTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  const [endHour, endMin] = this.workingHours.endTime.split(':').map(Number);
  const endMinutes = endHour * 60 + endMin;
  
  return totalMinutes < endMinutes;
};

// Method to calculate minutes late
timesheetSchema.methods.calculateMinutesLate = function(checkInTime) {
  const localTime = this.getLocalTime(checkInTime);
  const hours = localTime.getHours();
  const minutes = localTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  const [startHour, startMin] = this.workingHours.startTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const gracePeriodMinutes = this.workingHours.gracePeriod;
  
  const lateMinutes = totalMinutes - (startMinutes + gracePeriodMinutes);
  return Math.max(0, lateMinutes);
};

// Method to calculate minutes early (before end time)
timesheetSchema.methods.calculateMinutesEarly = function(checkOutTime) {
  const localTime = this.getLocalTime(checkOutTime);
  const hours = localTime.getHours();
  const minutes = localTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  const [endHour, endMin] = this.workingHours.endTime.split(':').map(Number);
  const endMinutes = endHour * 60 + endMin;
  
  // Calculate exact time difference: End Time - Clock Out Time (Local Time)
  const earlyMinutes = endMinutes - totalMinutes;
  return Math.max(0, earlyMinutes);
};

// Method to check if time is within overtime hours
timesheetSchema.methods.isWithinOvertimeHours = function(time) {
  const localTime = this.getLocalTime(time);
  const hours = localTime.getHours();
  const minutes = localTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  
  // Parse overtime hours
  const [overtimeStartHour, overtimeStartMin] = this.overtime.startTime.split(':').map(Number);
  const [overtimeEndHour, overtimeEndMin] = this.overtime.endTime.split(':').map(Number);
  const overtimeStartMinutes = overtimeStartHour * 60 + overtimeStartMin;
  const overtimeEndMinutes = overtimeEndHour * 60 + overtimeEndMin;
  
  // Handle overnight overtime (6:00 PM to 1:00 AM next day)
  if (overtimeEndMinutes < overtimeStartMinutes) {
    // Overtime spans midnight
    return totalMinutes >= overtimeStartMinutes || totalMinutes <= overtimeEndMinutes;
  } else {
    // Overtime within same day
    return totalMinutes >= overtimeStartMinutes && totalMinutes <= overtimeEndMinutes;
  }
};

// Method to calculate overtime minutes
timesheetSchema.methods.calculateOvertimeMinutes = function(clockOutTime) {
  if (!this.clockIn.time || !clockOutTime) {
    return 0;
  }
  
  const localClockOutTime = this.getLocalTime(clockOutTime);
  const localClockInTime = this.getLocalTime(this.clockIn.time);
  
  // For overtime timesheets (isOvertime = true), calculate total time worked
  if (this.isOvertime) {
    const totalDurationMs = localClockOutTime.getTime() - localClockInTime.getTime();
    const totalMinutes = Math.max(0, totalDurationMs / (1000 * 60));
    return Math.round(totalMinutes);
  }
  
  // For regular timesheets, calculate overtime based on working past regular hours
  // Parse regular working hours end time (5:00 PM)
  const [endHour, endMin] = this.workingHours.endTime.split(':').map(Number);
  
  // Calculate when regular hours end on the same day as clock out
  const clockOutDate = new Date(localClockOutTime);
  const regularHoursEndTime = new Date(clockOutDate);
  regularHoursEndTime.setHours(endHour, endMin, 0, 0);
  
  // If clock in is at or after regular hours end time, this is not overtime
  // Overtime only applies when someone works past their regular shift
  if (localClockInTime.getTime() >= regularHoursEndTime.getTime()) {
    return 0;
  }
  
  // If clock out is before or at regular hours end, no overtime
  if (localClockOutTime.getTime() <= regularHoursEndTime.getTime()) {
    return 0;
  }
  
  // Calculate overtime duration (from end of regular hours to clock out)
  const overtimeDurationMs = localClockOutTime.getTime() - regularHoursEndTime.getTime();
  const overtimeMinutes = Math.max(0, overtimeDurationMs / (1000 * 60));
  
  return Math.round(overtimeMinutes);
};

// Method to calculate total work hours
timesheetSchema.methods.calculateWorkHours = function() {
  if (!this.clockOut.time) {
    return 0;
  }
  
  // For overtime timesheets, regular work hours should be 0
  // since they represent only overtime work, not regular work
  if (this.isOvertime) {
    this.totalWorkHours = 0;
    this.totalBreakHours = 0;
    return 0;
  }
  
  const workTime = this.clockOut.time - this.clockIn.time;
  const breakTime = this.breaks.reduce((total, break_) => {
    if (break_.endTime) {
      return total + (break_.endTime - break_.startTime);
    }
    return total;
  }, 0);
  
  this.totalWorkHours = Math.round((workTime / (1000 * 60 * 60)) * 100) / 100;
  this.totalBreakHours = Math.round((breakTime / (1000 * 60 * 60)) * 100) / 100;
  
  return this.totalWorkHours;
};

// Method to determine overall day attendance status
timesheetSchema.methods.calculateDayAttendanceStatus = function() {
  if (!this.clockIn.time) {
    return 'absent';
  }
  
  // Check if this is an overtime timesheet (separate overtime check-in)
  if (this.isOvertime) {
    if (!this.clockOut.time) {
      return 'overtime-checkin';
    } else {
      return 'overtime-complete';
    }
  }
  
  // Check if clock in was at or after regular hours end time
  const localClockInTime = this.getLocalTime(this.clockIn.time);
  const [endHour, endMin] = this.workingHours.endTime.split(':').map(Number);
  const clockInDate = new Date(localClockInTime);
  const regularHoursEndTime = new Date(clockInDate);
  regularHoursEndTime.setHours(endHour, endMin, 0, 0);
  
  // If clocked in at or after regular hours end time, this is not a regular shift
  if (localClockInTime.getTime() >= regularHoursEndTime.getTime()) {
    if (!this.clockOut.time) {
      return 'overtime-checkin';
    } else {
      return 'overtime-complete';
    }
  }
  
  if (!this.clockOut.time) {
    // Only checked in, determine if late
    if (this.clockIn.attendanceStatus === 'late') {
      return 'late';
    }
    return 'partial';
  }
  
  // Both check-in and check-out recorded
  // Regular day status determination
  if (this.clockIn.attendanceStatus === 'late' && this.clockOut.isEarlyClockOut) {
    return 'partial';
  } else if (this.clockIn.attendanceStatus === 'late') {
    return 'late';
  } else if (this.clockOut.isEarlyClockOut) {
    return 'early-clock-out';
  } else {
    return 'present';
  }
};

// Pre-save middleware to calculate hours and set Ethiopian times
timesheetSchema.pre('save', async function(next) {
  try {
    // Data integrity validation
    this.validateTimesheetData();
    
    // Set Local times
    if (this.clockIn.time) {
      this.clockIn.ethiopianTime = this.getLocalTime(this.clockIn.time);
      
      // For overtime timesheets, always set attendance status to overtime-checkin
      if (this.isOvertime) {
        this.clockIn.attendanceStatus = 'overtime-checkin';
        this.clockIn.minutesLate = 0; // Overtime check-ins are not considered late
      } else {
        // Check if late - IMPORTANT: If they check in at all, they are not absent
        if (this.isLateCheckIn(this.clockIn.time)) {
          this.clockIn.attendanceStatus = 'late';
          this.clockIn.minutesLate = this.calculateMinutesLate(this.clockIn.time);
        } else {
          this.clockIn.attendanceStatus = 'on-time';
          this.clockIn.minutesLate = 0; // Reset to 0 when on-time
        }
      }
    }
  
  if (this.clockOut.time) {
    this.clockOut.ethiopianTime = this.getLocalTime(this.clockOut.time);
    
    // Check if early clock out (before 11:00 AM Ethiopian time)
    const ethiopianTime = new Date(this.clockOut.time.getTime() + (3 * 60 * 60 * 1000)); // UTC+3
    const currentHour = ethiopianTime.getUTCHours();
    const currentMinute = ethiopianTime.getUTCMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const earlyThresholdInMinutes = 11 * 60; // 11:00 AM Ethiopian time
    
    // Only set early clock out if it's actually before 11:00 AM
    if (currentTimeInMinutes < earlyThresholdInMinutes) {
      this.clockOut.isEarlyClockOut = true;
      this.clockOut.minutesEarly = earlyThresholdInMinutes - currentTimeInMinutes;
    } else {
      this.clockOut.isEarlyClockOut = false;
      this.clockOut.minutesEarly = 0;
    }
    
    // Check if this is a regular shift that went past regular hours
    // Only create automatic overtime timesheet if they actually worked past regular hours
    if (!this.isOvertime && this.clockOut.time) {
      const localClockOutTime = this.getLocalTime(this.clockOut.time);
      const localClockInTime = this.getLocalTime(this.clockIn.time);
      const [endHour, endMin] = this.workingHours.endTime.split(':').map(Number);
      const clockOutDate = new Date(localClockOutTime);
      const regularHoursEndTime = new Date(clockOutDate);
      regularHoursEndTime.setHours(endHour, endMin, 0, 0);
      
      // Only create overtime timesheet if:
      // 1. Clock in was before regular hours end time (they worked regular hours first)
      // 2. Clock out was after regular hours end time (they worked past regular hours)
      // 3. They actually worked a significant amount of overtime (more than 15 minutes)
      const overtimeMinutes = (localClockOutTime.getTime() - regularHoursEndTime.getTime()) / (1000 * 60);
      
      if (localClockInTime.getTime() < regularHoursEndTime.getTime() && 
          localClockOutTime.getTime() > regularHoursEndTime.getTime() &&
          overtimeMinutes > 15) { // Only if they worked more than 15 minutes of overtime
        
        console.log(`🔄 [AUTO-OVERTIME] User ${this.userId} worked ${Math.round(overtimeMinutes)} minutes of overtime, creating automatic overtime timesheet`);
        
        // Mark this timesheet as having automatic overtime transition
        this.clockOut.automaticReason = 'overtime_transition';
        
        // Create a new overtime timesheet automatically
        const OvertimeTimesheet = this.constructor;
        const overtimeTimesheet = new OvertimeTimesheet({
          userId: this.userId,
          date: this.date,
          clockIn: {
            time: regularHoursEndTime, // Overtime starts at end of regular hours
            location: this.clockOut.location || 'Main Office',
            method: 'system',
            attendanceStatus: 'overtime-checkin'
          },
          clockOut: {
            time: localClockOutTime, // Use actual clock out time
            location: this.clockOut.location || 'Main Office',
            method: this.clockOut.method || 'system'
          },
          department: this.department,
          workingHours: this.workingHours,
          overtime: this.overtime,
          isOvertime: true,
          status: 'completed'
        });
        
        // Save the overtime timesheet
        await overtimeTimesheet.save();
        console.log(`✅ [AUTO-OVERTIME] Created overtime timesheet ${overtimeTimesheet._id} for user ${this.userId}`);
      } else if (localClockInTime.getTime() < regularHoursEndTime.getTime() && 
                 localClockOutTime.getTime() > regularHoursEndTime.getTime() &&
                 overtimeMinutes <= 15) {
        // They worked past regular hours but less than 15 minutes - don't create overtime timesheet
        console.log(`ℹ️ [REGULAR-OVERTIME] User ${this.userId} worked ${Math.round(overtimeMinutes)} minutes past regular hours (less than 15 min threshold) - not creating overtime timesheet`);
      }
    }
    
    // Only calculate overtime if this is a separate overtime timesheet
    // OR if this is a regular timesheet that went past regular hours
    if (this.isOvertime || (this.clockOut.time && !this.isOvertime)) {
      const overtimeMinutes = this.calculateOvertimeMinutes(this.clockOut.time);
      this.overtimeMinutes = overtimeMinutes;
      this.overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100; // Round to 2 decimal places
    } else {
      // For regular shifts that didn't go past regular hours, no overtime calculation
      this.overtimeMinutes = 0;
      this.overtimeHours = 0;
    }
    
    this.calculateWorkHours();
  }
  
  // Calculate overall day attendance status
  this.dayAttendanceStatus = this.calculateDayAttendanceStatus();
  
  } catch (error) {
    console.error('Error in timesheet pre-save middleware:', error);
    next(error);
  }
});

// Data validation method
timesheetSchema.methods.validateTimesheetData = function() {
  // Validate overtime timesheet data
  if (this.isOvertime) {
    // Overtime timesheets should not have regular work hours
    if (this.totalWorkHours > 0) {
      console.warn(`⚠️ [VALIDATION] Overtime timesheet ${this._id} has regular work hours: ${this.totalWorkHours}h. Setting to 0.`);
      this.totalWorkHours = 0;
      this.totalBreakHours = 0;
    }
    
    // Overtime timesheets should have overtime hours if clocked out
    if (this.clockOut.time && this.overtimeHours === 0) {
      console.warn(`⚠️ [VALIDATION] Overtime timesheet ${this._id} has no overtime hours but is clocked out. Recalculating.`);
      const overtimeMinutes = this.calculateOvertimeMinutes(this.clockOut.time);
      this.overtimeMinutes = overtimeMinutes;
      this.overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;
    }
  } else {
    // Regular timesheets should not have overtime hours unless they worked past regular hours
    if (this.clockOut.time) {
      const localClockOutTime = this.getLocalTime(this.clockOut.time);
      const localClockInTime = this.getLocalTime(this.clockIn.time);
      const [endHour, endMin] = this.workingHours.endTime.split(':').map(Number);
      const clockOutDate = new Date(localClockOutTime);
      const regularHoursEndTime = new Date(clockOutDate);
      regularHoursEndTime.setHours(endHour, endMin, 0, 0);
      
      // If they didn't work past regular hours, they shouldn't have overtime
      if (localClockOutTime.getTime() <= regularHoursEndTime.getTime() && this.overtimeHours > 0) {
        console.warn(`⚠️ [VALIDATION] Regular timesheet ${this._id} has overtime hours but didn't work past regular hours. Setting to 0.`);
        this.overtimeHours = 0;
        this.overtimeMinutes = 0;
      }
    }
  }
  
  // Validate clock times
  if (this.clockIn.time && this.clockOut.time) {
    if (this.clockOut.time <= this.clockIn.time) {
      throw new Error('Clock out time must be after clock in time');
    }
  }
  
  // Validate overtime flag consistency
  if (this.isOvertime && this.clockIn.time) {
    const localClockInTime = this.getLocalTime(this.clockIn.time);
    const [endHour, endMin] = this.workingHours.endTime.split(':').map(Number);
    const clockInDate = new Date(localClockInTime);
    const regularHoursEndTime = new Date(clockInDate);
    regularHoursEndTime.setHours(endHour, endMin, 0, 0);
    
    // If clocked in before regular hours end, this might not be a pure overtime timesheet
    if (localClockInTime.getTime() < regularHoursEndTime.getTime()) {
      console.warn(`⚠️ [VALIDATION] Overtime timesheet ${this._id} clocked in before regular hours end. This might be incorrect.`);
    }
  }
};

const Timesheet = mongoose.model('Timesheet', timesheetSchema);

module.exports = Timesheet; 
