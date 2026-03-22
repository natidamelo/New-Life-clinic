const mongoose = require('mongoose');

const medicalCertificateSchema = new mongoose.Schema({
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

  // Doctor Information
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorName: {
    type: String,
    required: true,
    trim: true
  },
  doctorLicenseNumber: {
    type: String,
    required: true,
    trim: true
  },
  doctorSpecialization: {
    type: String,
    required: true,
    trim: true
  },

  // Medical Information
  diagnosis: {
    type: String,
    required: true,
    trim: true
  },
  symptoms: {
    type: String,
    trim: true
  },
  treatment: {
    type: String,
    trim: true
  },
  prescription: {
    type: String,
    trim: true
  },
  recommendations: {
    type: String,
    trim: true
  },
  followUpDate: {
    type: Date
  },
  restPeriod: {
    type: String,
    trim: true
  },
  workRestriction: {
    type: String,
    trim: true
  },

  // Certificate Details
  certificateType: {
    type: String,
    enum: ['Medical Certificate', 'Sick Leave Certificate', 'Fitness Certificate', 'Treatment Certificate'],
    default: 'Medical Certificate'
  },
  certificateNumber: {
    type: String,
    unique: true,
    required: true
  },
  dateIssued: {
    type: Date,
    default: Date.now,
    required: true
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },

  // Clinic Information
  clinicName: {
    type: String,
    required: true,
    trim: true
  },
  clinicAddress: {
    type: String,
    required: true,
    trim: true
  },
  clinicPhone: {
    type: String,
    trim: true
  },
  clinicLicense: {
    type: String,
    trim: true
  },

  // Additional Information
  notes: {
    type: String,
    trim: true
  },
  
  // Digital Signature
  digitalSignature: {
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Audit Fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['Draft', 'Issued', 'Cancelled', 'Expired'],
    default: 'Draft'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
medicalCertificateSchema.index({ patientId: 1, dateIssued: -1 });
medicalCertificateSchema.index({ doctorId: 1, dateIssued: -1 });
medicalCertificateSchema.index({ certificateNumber: 1 });
medicalCertificateSchema.index({ status: 1 });
medicalCertificateSchema.index({ validFrom: 1, validUntil: 1 });

// Virtual for certificate validity
medicalCertificateSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.validFrom <= now && this.validUntil >= now && this.isActive && this.status === 'Issued';
});

// Virtual for days remaining
medicalCertificateSchema.virtual('daysRemaining').get(function() {
  if (!this.isValid) return 0;
  const now = new Date();
  const diffTime = this.validUntil - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to generate certificate number
medicalCertificateSchema.pre('save', async function(next) {
  if (this.isNew && !this.certificateNumber) {
    try {
      const count = await this.constructor.countDocuments();
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
      this.certificateNumber = `MC${year}${String(count + 1).padStart(4, '0')}${timestamp}`;
    } catch (error) {
      // Fallback to timestamp-based number if count fails
      const year = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-8);
      this.certificateNumber = `MC${year}${timestamp}`;
    }
  }
  next();
});

// Pre-save middleware to set valid dates if not provided
medicalCertificateSchema.pre('save', function(next) {
  if (!this.validFrom) {
    this.validFrom = this.dateIssued;
  }
  if (!this.validUntil) {
    // Default validity of 30 days
    this.validUntil = new Date(this.validFrom.getTime() + (30 * 24 * 60 * 60 * 1000));
  }
  next();
});

// Static method to find valid certificates for a patient
medicalCertificateSchema.statics.findValidForPatient = function(patientId) {
  const now = new Date();
  return this.find({
    patientId,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    isActive: true,
    status: 'Issued'
  }).sort({ dateIssued: -1 });
};

// Static method to find certificates by date range
medicalCertificateSchema.statics.findByDateRange = function(startDate, endDate) {
  return this.find({
    dateIssued: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ dateIssued: -1 });
};

module.exports = mongoose.model('MedicalCertificate', medicalCertificateSchema);
