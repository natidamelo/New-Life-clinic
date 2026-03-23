const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: true,
    default: 'default',
    index: true,
    trim: true
  },
  patientId: {
    type: String,
    unique: true,
    index: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: false
  },
  age: {
    type: Number,
    min: 0,
    max: 120
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  address: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  },
  department: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['normal', 'urgent', 'emergency'],
    default: 'normal'
  },
  roomNumber: {
    type: String
  },
  status: {
    type: String,
    enum: ['Admitted', 'Discharged', 'Outpatient', 'Emergency', 'scheduled', 'waiting', 'in-progress', 'Active', 'completed'],
    default: 'waiting'
  },
  assignedDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedNurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdated: {
    type: Date
  },
  vitals: {
    temperature: String,
    bloodPressure: String,
    heartRate: String,
    respiratoryRate: String,
    bloodSugar: String,
    oxygenSaturation: String,
    pain: String,
    height: String,
    weight: String,
    bmi: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    route: String,
    lastGiven: Date,
    nextDue: Date,
    prescribedBy: String
  }],
  treatments: [{
    type: String,
    description: String,
    frequency: String,
    lastPerformed: Date,
    nextDue: Date,
    notes: String
  }],
  woundCare: [{
    location: String,
    type: String,
    lastDressing: Date,
    nextDressing: Date,
    notes: String
  }],
  medicalHistory: [{
    condition: String,
    diagnosis: String,
    diagnosedDate: Date,
    medications: [String],
    notes: String
  }],
  allergies: [{
    allergen: String,
    reaction: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    }
  }],
  imaging: [{
    type: String,
    orderedBy: String,
    date: Date,
    status: {
      type: String,
      enum: ['ordered', 'scheduled', 'completed', 'cancelled'],
      default: 'ordered'
    },
    results: String,
    notes: String
  }],
  // The labResults field below is deprecated and has been removed.
  // Lab results are now stored in the dedicated LabTest collection.
  /*
  labResults: [{
    testName: String,
    orderedBy: String,
    collectionDate: Date,
    status: {
      type: String,
      enum: ['ordered', 'collected', 'processing', 'completed', 'cancelled'],
      default: 'ordered'
    },
    results: String,
    normalRange: String,
    notes: String
  }],
  */
  doctorOrders: [{
    type: String,
    doctor: String,
    date: Date,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    instructions: String,
    notes: String
  }],
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  emergencyContact: {
    name: String,
    relationship: String,
    contactNumber: String
  },
  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    expiryDate: Date
  },
  diabetic: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastVisit: {
    type: Date
  },
  nextCheckup: {
    type: Date
  },
  // Card information
  cardType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CardType'
  },
  cardIssueDate: {
    type: Date
  },
  cardExpiryDate: {
    type: Date
  },
  cardStatus: {
    type: String,
    enum: ['active', 'expired', 'suspended'],
    default: 'active'
  },
  faydaId: {
    type: String,
    trim: true,
    required: false
  },
  // Completion tracking fields
  completedAt: {
    type: Date
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completionNotes: {
    type: String
  },
  completionReason: {
    type: String
  },
  // Reopening tracking fields
  reopenedAt: {
    type: Date
  },
  reopenedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reopenReason: {
    type: String
  }

}, {
  timestamps: true
});

// Virtual for full name
patientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for name (compatibility with frontend)
patientSchema.virtual('name').get(function() {
  return this.fullName;
});

// Method to check and update card expiry status
patientSchema.methods.checkCardExpiry = function() {
  if (this.cardIssueDate) {
    const currentDate = new Date();
    const gracePeriodEnd = new Date(this.cardIssueDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 15); // 15 days grace period
    
    if (currentDate > gracePeriodEnd) {
      this.cardStatus = 'expired';
      this.cardExpiryDate = gracePeriodEnd;
    } else {
      this.cardStatus = 'active';
    }
  }
  return this.cardStatus;
};

// Virtual to get days remaining until card expires
patientSchema.virtual('cardDaysRemaining').get(function() {
  if (!this.cardIssueDate) return null;
  
  const currentDate = new Date();
  const gracePeriodEnd = new Date(this.cardIssueDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 15);
  
  const timeDiff = gracePeriodEnd.getTime() - currentDate.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  return daysDiff > 0 ? daysDiff : 0;
});

// Pre-save middleware to generate patientId if not provided
patientSchema.pre('save', function(next) {
  try {
    // Skip if patientId already exists and it's a string
    if (this.patientId && typeof this.patientId === 'string') {
      return next();
    }
    
    console.log('Generating new patientId using timestamp approach');
    
    // Use a more robust approach to ensure uniqueness
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    const patientNum = (timestamp % 90000) + 10000; // Ensures 5-digit number
    
    this.patientId = `P${String(patientNum).padStart(5, '0')}-${timestamp.toString().slice(-4)}`;
    console.log('Generated patientId:', this.patientId);
    next();
  } catch (error) {
    console.error('Error in patient pre-save hook:', error);
    // Fallback
    const fallbackNum = Math.floor(Math.random() * 90000) + 10000;
    this.patientId = `P${String(fallbackNum).padStart(5, '0')}-${Date.now().toString().slice(-4)}`;
    console.log('Generated fallback patientId:', this.patientId);
    next();
  }
});

// Instance method to get standardized patient ID for all purposes
patientSchema.methods.getStandardizedId = function() {
  // Always return the patientId string for consistency across all systems
  return this.patientId || this._id.toString();
};

// Static method to find patient by any ID format
patientSchema.statics.findByAnyId = async function(id) {
  if (!id) return null;
  
  // Try to find by patientId first (preferred)
  let patient = await this.findOne({ patientId: id });
  if (patient) return patient;
  
  // Try to find by _id if it's a valid ObjectId
  if (mongoose.Types.ObjectId.isValid(id)) {
    patient = await this.findById(id);
    if (patient) return patient;
  }
  
  // Try to find by patientId with different formats
  patient = await this.findOne({ 
    $or: [
      { patientId: id },
      { patientId: id.toString() },
      { _id: id }
    ]
  });
  
  return patient;
};

// Static method to get standardized patient ID from any format
patientSchema.statics.getStandardizedId = function(patientOrId) {
  if (!patientOrId) return null;
  
  // If it's a patient document
  if (patientOrId.patientId) {
    return patientOrId.patientId;
  }
  
  // If it's a string that looks like a patientId
  if (typeof patientOrId === 'string' && patientOrId.startsWith('P')) {
    return patientOrId;
  }
  
  // If it's an ObjectId or other format, return as string
  return patientOrId.toString();
};

// Set virtuals in JSON
patientSchema.set('toJSON', { virtuals: true });
patientSchema.set('toObject', { virtuals: true });

// Add performance indexes
patientSchema.index({ createdAt: -1 }); // For sorting by creation date
patientSchema.index({ clinicId: 1, createdAt: -1 });
patientSchema.index({ status: 1 }); // For filtering by status
patientSchema.index({ assignedDoctorId: 1 }); // For filtering by doctor
patientSchema.index({ assignedNurseId: 1 }); // For filtering by nurse
patientSchema.index({ firstName: 1, lastName: 1 }); // For name searches
patientSchema.index({ 
  firstName: 'text', 
  lastName: 'text', 
  patientId: 'text' 
}); // For text search

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient; 
