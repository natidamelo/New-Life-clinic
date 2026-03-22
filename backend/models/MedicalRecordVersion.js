const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Medical Record Version Model
 * Stores historical versions of medical records for compliance and audit purposes.
 * Contains a snapshot of the record at a specific point in time.
 */
const MedicalRecordVersionSchema = new Schema({
  // Reference to the original medical record
  originalRecord: {
    type: Schema.Types.ObjectId,
    ref: 'MedicalRecord',
    required: true,
    index: true
  },
  
  // Version number (1, 2, 3, etc.)
  versionNumber: {
    type: Number,
    required: true
  },
  
  // Version metadata
  versionCreatedAt: {
    type: Date,
    default: Date.now
  },
  
  // User who caused this version to be created
  versionCreatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // The reason for creating this version
  versionReason: {
    type: String
  },
  
  // The complete medical record data at this version
  // All fields from MedicalRecord model are copied here
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  visitDate: {
    type: Date
  },
  chiefComplaint: String,
  historyOfPresentIllness: String,
  pastMedicalHistory: String,
  surgicalHistory: String,
  familyHistory: String,
  socialHistory: String,
  allergies: String,
  reviewOfSystems: String,
  physicalExam: String,
  diagnosis: String,
  plan: String,
  attachments: [String],
  labRequests: [{ type: Schema.Types.ObjectId, ref: 'LabRequest' }],
  prescriptions: [{ type: Schema.Types.ObjectId, ref: 'Prescription' }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Draft', 'Finalized', 'Amended', 'Locked']
  },
  signedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  signedAt: Date,
  
  // Store the full audit trail at this point
  auditTrail: [{
    action: String,
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedAt: Date,
    changes: String,
    userRole: String,
    ipAddress: String,
    userAgent: String
  }]
}, {
  timestamps: true
});

// Create indexes for efficient queries
MedicalRecordVersionSchema.index({ originalRecord: 1, versionNumber: 1 }, { unique: true });
MedicalRecordVersionSchema.index({ versionCreatedAt: 1 });

module.exports = mongoose.model('MedicalRecordVersion', MedicalRecordVersionSchema); 
