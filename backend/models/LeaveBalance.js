const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
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
      // Default to current Ethiopian year (7-8 years behind Gregorian)
      const ethiopianCalendar = require('../utils/ethiopianCalendar');
      return ethiopianCalendar.getCurrentEthiopianDate().year;
    }
  },
  leaveTypes: {
    annual: {
      allocated: {
        type: Number,
        default: 21, // Default 21 days annual leave
        min: 0
      },
      used: {
        type: Number,
        default: 0,
        min: 0
      },
      pending: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    sick: {
      allocated: {
        type: Number,
        default: 10, // Default 10 days sick leave
        min: 0
      },
      used: {
        type: Number,
        default: 0,
        min: 0
      },
      pending: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    personal: {
      allocated: {
        type: Number,
        default: 5, // Default 5 days personal leave
        min: 0
      },
      used: {
        type: Number,
        default: 0,
        min: 0
      },
      pending: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    maternity: {
      allocated: {
        type: Number,
        default: 90, // Default 90 days maternity leave
        min: 0
      },
      used: {
        type: Number,
        default: 0,
        min: 0
      },
      pending: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    paternity: {
      allocated: {
        type: Number,
        default: 10, // Default 10 days paternity leave
        min: 0
      },
      used: {
        type: Number,
        default: 0,
        min: 0
      },
      pending: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    bereavement: {
      allocated: {
        type: Number,
        default: 5, // Default 5 days bereavement leave
        min: 0
      },
      used: {
        type: Number,
        default: 0,
        min: 0
      },
      pending: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    other: {
      allocated: {
        type: Number,
        default: 0,
        min: 0
      },
      used: {
        type: Number,
        default: 0,
        min: 0
      },
      pending: {
        type: Number,
        default: 0,
        min: 0
      }
    }
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true,
    maxLength: 1000
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
leaveBalanceSchema.index({ staffId: 1, year: 1 }, { unique: true });
leaveBalanceSchema.index({ year: 1 });

// Virtual for calculating remaining leave
leaveBalanceSchema.virtual('remaining').get(function() {
  const remaining = {};
  for (const [type, data] of Object.entries(this.leaveTypes)) {
    remaining[type] = data.allocated - data.used;
  }
  return remaining;
});

// Virtual for calculating total remaining days
leaveBalanceSchema.virtual('totalRemaining').get(function() {
  let total = 0;
  for (const [type, data] of Object.entries(this.leaveTypes)) {
    total += (data.allocated - data.used);
  }
  return total;
});

// Method to update leave balance when leave is approved/rejected
leaveBalanceSchema.methods.updateBalance = function(leaveType, days, action) {
  if (this.leaveTypes[leaveType]) {
    if (action === 'approve') {
      this.leaveTypes[leaveType].used += days;
      this.leaveTypes[leaveType].pending -= days;
    } else if (action === 'reject') {
      this.leaveTypes[leaveType].pending -= days;
    } else if (action === 'request') {
      this.leaveTypes[leaveType].pending += days;
    } else if (action === 'delete') {
      // When deleting a pending request, remove it from pending
      this.leaveTypes[leaveType].pending -= days;
    }
  }
};

// Static method to get or create leave balance for a staff member
leaveBalanceSchema.statics.getOrCreateBalance = async function(staffId, year = new Date().getFullYear()) {
  let balance = await this.findOne({ staffId, year });
  
  if (!balance) {
    balance = new this({
      staffId,
      year,
      lastUpdatedBy: staffId // Will be updated by admin
    });
    await balance.save();
  }
  
  return balance;
};

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

module.exports = LeaveBalance;
