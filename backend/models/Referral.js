const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  // Patient Information
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  patientDisplayId: {
    type: String,
    trim: true
  },
  patientAge: {
    type: Number,
    required: true
  },
  patientGender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  patientAddress: {
    type: String,
    required: true,
    trim: true
  },
  patientPhone: {
    type: String,
    trim: true
  },
  medicalRecordNumber: {
    type: String,
    trim: true
  },

  // Referring Doctor Information
  referringDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referringDoctorName: {
    type: String,
    required: true,
    trim: true
  },
  referringClinicName: {
    type: String,
    required: true,
    trim: true
  },
  referringClinicPhone: {
    type: String,
    trim: true
  },
  referringClinicEmail: {
    type: String,
    trim: true
  },
  referringClinicAddress: {
    type: String,
    required: true,
    trim: true
  },

  // Referred To Information
  referredToDoctorName: {
    type: String,
    required: true,
    trim: true
  },
  referredToClinic: {
    type: String,
    required: true,
    trim: true
  },
  referredToPhone: {
    type: String,
    trim: true
  },
  referredToEmail: {
    type: String,
    trim: true
  },
  referredToAddress: {
    type: String,
    trim: true
  },

  // Referral Details
  referralNumber: {
    type: String,
    unique: true,
    required: true
  },
  referralDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  referralTime: {
    type: String,
    trim: true
  },
  urgency: {
    type: String,
    enum: ['routine', 'urgent', 'emergency'],
    default: 'routine'
  },

  // Medical Information
  chiefComplaint: {
    type: String,
    required: true,
    trim: true
  },
  historyOfPresentIllness: {
    type: String,
    trim: true
  },
  pastMedicalHistory: {
    type: String,
    trim: true
  },
  medications: {
    type: String,
    trim: true
  },
  allergies: {
    type: String,
    trim: true
  },
  physicalExamination: {
    type: String,
    trim: true
  },
  diagnosis: {
    type: String,
    required: true,
    trim: true
  },
  reasonForReferral: {
    type: String,
    required: true,
    trim: true
  },
  requestedInvestigations: {
    type: String,
    trim: true
  },
  requestedTreatments: {
    type: String,
    trim: true
  },
  followUpInstructions: {
    type: String,
    trim: true
  },
  additionalNotes: {
    type: String,
    trim: true
  },

  // Status and Tracking
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Received', 'Completed', 'Cancelled'],
    default: 'Sent'
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
referralSchema.index({ patientId: 1, referralDate: -1 });
referralSchema.index({ referringDoctorId: 1, referralDate: -1 });
referralSchema.index({ referralNumber: 1 });
referralSchema.index({ status: 1 });
referralSchema.index({ urgency: 1 });

// Virtual for formatted referral date
referralSchema.virtual('formattedReferralDate').get(function() {
  return this.referralDate.toLocaleDateString();
});

// Virtual for urgency badge color
referralSchema.virtual('urgencyColor').get(function() {
  const colors = {
    routine: 'green',
    urgent: 'orange',
    emergency: 'red'
  };
  return colors[this.urgency] || 'gray';
});

// Method to check if referral is overdue (more than 30 days without completion)
referralSchema.methods.isOverdue = function() {
  if (this.status === 'Completed' || this.status === 'Cancelled') {
    return false;
  }
  const daysSinceReferral = (Date.now() - this.referralDate) / (1000 * 60 * 60 * 24);
  return daysSinceReferral > 30;
};

// Static method to get referral statistics
referralSchema.statics.getReferralStats = async function(filter = {}) {
  return this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'Sent'] }, 1, 0] } },
        received: { $sum: { $cond: [{ $eq: ['$status', 'Received'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
        routine: { $sum: { $cond: [{ $eq: ['$urgency', 'routine'] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$urgency', 'urgent'] }, 1, 0] } },
        emergency: { $sum: { $cond: [{ $eq: ['$urgency', 'emergency'] }, 1, 0] } }
      }
    }
  ]);
};

// Pre-save hook to generate referral number if not exists
referralSchema.pre('save', async function(next) {
  if (this.isNew && !this.referralNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    const timestamp = Date.now().toString().slice(-6);
    this.referralNumber = `REF${year}${String(count + 1).padStart(4, '0')}${timestamp}`;
  }
  next();
});

const Referral = mongoose.model('Referral', referralSchema);

module.exports = Referral;

