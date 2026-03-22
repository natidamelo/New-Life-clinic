const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  serviceRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest',
    required: true
  },
  consultationType: {
    type: String,
    enum: ['general', 'specialist', 'follow-up', 'emergency'],
    default: 'general'
  },
  consultationDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  chiefComplaint: {
    type: String,
    required: true
  },
  consultationNotes: {
    type: String,
    default: ''
  },
  diagnosis: {
    type: String,
    default: ''
  },
  treatmentPlan: {
    type: String,
    default: ''
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  followUpNotes: {
    type: String,
    default: ''
  },
  consultationFee: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'waived'],
    default: 'pending'
  },
  // Reference to medical record if one is created after consultation
  medicalRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord'
  },
  // Consultation-specific fields (different from medical records)
  consultationDuration: {
    type: Number, // in minutes
    default: 0
  },
  consultationLocation: {
    type: String,
    enum: ['clinic', 'telemedicine', 'home-visit'],
    default: 'clinic'
  },
  referralRequired: {
    type: Boolean,
    default: false
  },
  referralNotes: {
    type: String,
    default: ''
  },
  // Consultation workflow status
  workflowStatus: {
    type: String,
    enum: ['scheduled', 'in-consultation', 'completed', 'follow-up-scheduled'],
    default: 'scheduled'
  }
}, {
  timestamps: true
});

// Indexes for better performance
consultationSchema.index({ patientId: 1, consultationDate: -1 });
consultationSchema.index({ doctorId: 1, status: 1 });
consultationSchema.index({ consultationDate: -1 });
consultationSchema.index({ status: 1, consultationDate: -1 });

// Virtual for consultation duration in hours
consultationSchema.virtual('durationInHours').get(function() {
  return this.consultationDuration ? (this.consultationDuration / 60).toFixed(2) : 0;
});

// Method to mark consultation as completed
consultationSchema.methods.completeConsultation = function(notes, diagnosis, treatmentPlan) {
  this.status = 'completed';
  this.consultationNotes = notes || this.consultationNotes;
  this.diagnosis = diagnosis || this.diagnosis;
  this.treatmentPlan = treatmentPlan || this.treatmentPlan;
  this.workflowStatus = 'completed';
  return this.save();
};

// Method to schedule follow-up
consultationSchema.methods.scheduleFollowUp = function(followUpDate, notes) {
  this.followUpRequired = true;
  this.followUpDate = followUpDate;
  this.followUpNotes = notes || '';
  this.workflowStatus = 'follow-up-scheduled';
  return this.save();
};

// Static method to get consultations by status
consultationSchema.statics.getByStatus = function(status) {
  return this.find({ status }).populate('patientId doctorId serviceRequestId');
};

// Static method to get consultations by doctor
consultationSchema.statics.getByDoctor = function(doctorId, status = null) {
  const query = { doctorId };
  if (status) {
    query.status = status;
  }
  return this.find(query).populate('patientId serviceRequestId');
};

// Static method to get consultations by patient
consultationSchema.statics.getByPatient = function(patientId) {
  return this.find({ patientId }).populate('doctorId serviceRequestId');
};

// Set virtuals in JSON
consultationSchema.set('toJSON', { virtuals: true });
consultationSchema.set('toObject', { virtuals: true });

const Consultation = mongoose.model('Consultation', consultationSchema);

module.exports = Consultation;
