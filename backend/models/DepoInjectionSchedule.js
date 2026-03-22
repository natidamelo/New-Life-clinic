const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Depo Injection Schedule Model
 * 
 * Tracks Depo-Provera injection schedules for patients
 * Depo injections are given every 12 weeks (3 months)
 */

const DepoInjectionScheduleSchema = new Schema({
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  patientName: {
    type: String,
    required: true
  },
  patientId: {
    type: String,
    required: true
  },
  // First injection date
  firstInjectionDate: {
    type: Date,
    required: true
  },
  // Last injection date
  lastInjectionDate: {
    type: Date,
    required: true
  },
  // Next scheduled injection date
  nextInjectionDate: {
    type: Date,
    required: true
  },
  // Ethiopian calendar date for next injection
  nextInjectionEthiopianDate: {
    year: { type: Number },
    month: { type: Number },
    day: { type: Number },
    monthName: { type: String },
    formatted: { type: String }
  },
  // Injection interval in days (default 84 days = 12 weeks)
  injectionInterval: {
    type: Number,
    default: 84,
    min: 70, // Minimum 10 weeks
    max: 98  // Maximum 14 weeks
  },
  // Status of the schedule
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'on_hold'],
    default: 'active',
    index: true
  },
  // Injection history
  injectionHistory: [{
    injectionDate: {
      type: Date,
      required: true
    },
    ethiopianDate: {
      year: { type: Number },
      month: { type: Number },
      day: { type: Number },
      monthName: { type: String },
      formatted: { type: String }
    },
    administeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    administeredByName: {
      type: String
    },
    notes: {
      type: String
    },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment'
    },
    visitId: {
      type: Schema.Types.ObjectId,
      ref: 'Visit'
    },
    inventoryTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryTransaction'
    }
  }],
  // Reminder settings
  reminderSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    daysBeforeReminder: {
      type: Number,
      default: 7, // Remind 7 days before
      min: 1,
      max: 30
    },
    reminderMethod: {
      type: String,
      enum: ['sms', 'email', 'both'],
      default: 'sms'
    }
  },
  // Doctor who prescribed the Depo
  prescribingDoctor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prescribingDoctorName: {
    type: String,
    required: true
  },
  // Notes and instructions
  notes: {
    type: String
  },
  instructions: {
    type: String
  },
  // Side effects or reactions (if any)
  sideEffects: [{
    date: {
      type: Date,
      default: Date.now
    },
    description: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe'],
      default: 'mild'
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  // Follow-up requirements
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  followUpNotes: {
    type: String
  },
  // Auto-schedule next appointment
  autoScheduleNext: {
    type: Boolean,
    default: true
  },
  // Created and updated by
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
DepoInjectionScheduleSchema.index({ patient: 1, status: 1 });
DepoInjectionScheduleSchema.index({ nextInjectionDate: 1, status: 1 });
DepoInjectionScheduleSchema.index({ lastInjectionDate: 1 });
DepoInjectionScheduleSchema.index({ 'injectionHistory.injectionDate': 1 });

// Virtual for days until next injection
DepoInjectionScheduleSchema.virtual('daysUntilNextInjection').get(function() {
  const today = new Date();
  const timeDiff = this.nextInjectionDate.getTime() - today.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
});

// Virtual for injection status
DepoInjectionScheduleSchema.virtual('injectionStatus').get(function() {
  const daysUntil = this.daysUntilNextInjection;
  
  if (daysUntil < 0) {
    return {
      status: 'overdue',
      message: `Overdue by ${Math.abs(daysUntil)} days`,
      daysUntil
    };
  } else if (daysUntil === 0) {
    return {
      status: 'due',
      message: 'Due today',
      daysUntil
    };
  } else if (daysUntil <= 7) {
    return {
      status: 'due_soon',
      message: `Due in ${daysUntil} days`,
      daysUntil
    };
  } else {
    return {
      status: 'upcoming',
      message: `Due in ${daysUntil} days`,
      daysUntil
    };
  }
});

// Virtual for total injections given
DepoInjectionScheduleSchema.virtual('totalInjections').get(function() {
  return this.injectionHistory.length;
});

// Pre-save middleware to update next injection date and Ethiopian date
DepoInjectionScheduleSchema.pre('save', async function(next) {
  if (this.isModified('lastInjectionDate') || this.isModified('injectionInterval')) {
    // Calculate next injection date
    this.nextInjectionDate = new Date(
      this.lastInjectionDate.getTime() + (this.injectionInterval * 24 * 60 * 60 * 1000)
    );
    
    // Calculate Ethiopian date for next injection
    const EthiopianCalendar = require('../utils/ethiopianCalendar');
    const nextEthiopianDate = EthiopianCalendar.gregorianToEthiopian(this.nextInjectionDate);
    
    this.nextInjectionEthiopianDate = {
      year: nextEthiopianDate.year,
      month: nextEthiopianDate.month,
      day: nextEthiopianDate.day,
      monthName: nextEthiopianDate.monthName,
      formatted: nextEthiopianDate.formatted
    };
  }
  
  next();
});

// Method to add injection to history
DepoInjectionScheduleSchema.methods.addInjection = async function(injectionData) {
  const EthiopianCalendar = require('../utils/ethiopianCalendar');
  
  const ethiopianDate = EthiopianCalendar.gregorianToEthiopian(injectionData.injectionDate);
  
  const injectionRecord = {
    injectionDate: injectionData.injectionDate,
    ethiopianDate: {
      year: ethiopianDate.year,
      month: ethiopianDate.month,
      day: ethiopianDate.day,
      monthName: ethiopianDate.monthName,
      formatted: ethiopianDate.formatted
    },
    administeredBy: injectionData.administeredBy,
    administeredByName: injectionData.administeredByName,
    notes: injectionData.notes,
    appointmentId: injectionData.appointmentId,
    visitId: injectionData.visitId,
    inventoryTransactionId: injectionData.inventoryTransactionId
  };
  
  this.injectionHistory.push(injectionRecord);
  this.lastInjectionDate = injectionData.injectionDate;
  
  // Update next injection date
  this.nextInjectionDate = new Date(
    injectionData.injectionDate.getTime() + (this.injectionInterval * 24 * 60 * 60 * 1000)
  );
  
  const nextEthiopianDate = EthiopianCalendar.gregorianToEthiopian(this.nextInjectionDate);
  this.nextInjectionEthiopianDate = {
    year: nextEthiopianDate.year,
    month: nextEthiopianDate.month,
    day: nextEthiopianDate.day,
    monthName: nextEthiopianDate.monthName,
    formatted: nextEthiopianDate.formatted
  };
  
  return this.save();
};

// Method to get upcoming injections (within specified days)
DepoInjectionScheduleSchema.statics.getUpcomingInjections = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    status: 'active',
    nextInjectionDate: {
      $lte: futureDate,
      $gte: new Date()
    }
  }).populate('patient', 'firstName lastName phone email')
    .populate('prescribingDoctor', 'firstName lastName')
    .sort({ nextInjectionDate: 1 });
};

// Method to get overdue injections
DepoInjectionScheduleSchema.statics.getOverdueInjections = function() {
  return this.find({
    status: 'active',
    nextInjectionDate: { $lt: new Date() }
  }).populate('patient', 'firstName lastName phone email')
    .populate('prescribingDoctor', 'firstName lastName')
    .sort({ nextInjectionDate: 1 });
};

// Method to get injection statistics
DepoInjectionScheduleSchema.statics.getInjectionStatistics = async function() {
  const total = await this.countDocuments({ status: 'active' });
  const overdue = await this.countDocuments({
    status: 'active',
    nextInjectionDate: { $lt: new Date() }
  });
  const dueToday = await this.countDocuments({
    status: 'active',
    nextInjectionDate: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      $lt: new Date(new Date().setHours(23, 59, 59, 999))
    }
  });
  const dueThisWeek = await this.countDocuments({
    status: 'active',
    nextInjectionDate: {
      $gte: new Date(),
      $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });
  
  return {
    total,
    overdue,
    dueToday,
    dueThisWeek,
    onSchedule: total - overdue
  };
};

module.exports = mongoose.model('DepoInjectionSchedule', DepoInjectionScheduleSchema);

