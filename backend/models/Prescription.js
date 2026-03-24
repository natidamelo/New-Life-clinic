const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PrescriptionSchema = new Schema({
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  // For backwards compatibility with patientId
  patientId: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    get: function() {
      return this.patient;
    },
    set: function(value) {
      this.patient = value;
      return value;
    }
  },
  doctor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // For backwards compatibility with doctorId
  doctorId: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  medicationName: {
    type: String,
    required: true
  },
  // For backwards compatibility
  medication: {
    type: String,
    get: function() {
      return this.medicationName;
    },
    set: function(value) {
      this.medicationName = value;
      return value;
    }
  },
  // Link to inventory item
  medicationItem: {
    type: Schema.Types.ObjectId,
    ref: 'InventoryItem'
  },
  dosage: {
    type: String,
    required: true
  },
  frequency: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: false
  },
  route: {
    type: String,
    default: 'Oral'
  },
  refills: {
    type: Number,
    default: 0
  },
  instructions: {
    type: String
  },
  // For backwards compatibility
  notes: {
    type: String,
    get: function() {
      return this.instructions;
    },
    set: function(value) {
      this.instructions = value;
      return value;
    }
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled', 'Pending', 'Payment Required', 'Extended'],
    default: 'Pending'
  },
  datePrescribed: {
    type: Date,
    default: Date.now
  },
  // For backwards compatibility
  prescribedDate: {
    type: Date,
    get: function() {
      return this.datePrescribed;
    },
    set: function(value) {
      this.datePrescribed = value;
      return value;
    }
  },
  medicalRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord'
  },
  // Inventory integration
  inventoryTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryTransaction'
  },
  // Financial integration
  invoiceItem: {
    type: mongoose.Schema.Types.ObjectId
  },
  // Dispensing information
  dispensed: {
    type: Boolean,
    default: false
  },
  dispensedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dispensedAt: {
    type: Date
  },
  quantity: {
    type: Number,
    default: 1
  },
  prescribedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Add nurse-related fields
  sendToNurse: {
    type: Boolean,
    default: true
  },
  nurseInstructions: {
    type: String
  },
  administeredByNurse: {
    type: Boolean,
    default: false
  },
  administeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  administeredAt: {
    type: Date
  },
  nurseTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NurseTask'
  },
  // Payment-related fields
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalInvoice'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'refunded'],
    default: 'pending' // FIXED: Ensure default is 'pending', not 'paid'
  },
  paidAt: {
    type: Date
  },
  totalCost: {
    type: Number,
    default: 0
  },
  medications: [{
    inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    name: String,
    dosage: String,
    frequency: String,
    duration: String,
    route: { type: String, default: 'Oral' },
    notes: String,
    sendToNurse: { type: Boolean, default: false },
    assignedNurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  // Payment authorization details
  paymentAuthorization: {
    paidDays: {
      type: Number,
      default: 0
    },
    totalDays: {
      type: Number,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'fully_paid'],
      default: 'unpaid'
    },
    authorizedDoses: {
      type: Number,
      default: 0
    },
    unauthorizedDoses: {
      type: Number,
      default: 0
    },
    outstandingAmount: {
      type: Number,
      default: 0
    },
    paymentPlan: {
      type: Schema.Types.Mixed
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  createdAt: { type: Date, default: Date.now },

  // EMR Enhancement Fields
  // Drug interaction and allergy checking
  drugInteractions: [{
    drugName: String,
    interactionType: { type: String, enum: ['major', 'moderate', 'minor'] },
    description: String,
    severity: String,
    checked: { type: Boolean, default: false },
    overrideReason: String,
    checkedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    checkedAt: Date
  }],
  
  allergyAlerts: [{
    allergen: String,
    alertType: { type: String, enum: ['drug', 'food', 'environmental'] },
    severity: { type: String, enum: ['mild', 'moderate', 'severe', 'life-threatening'] },
    description: String,
    checked: { type: Boolean, default: false },
    overrideReason: String,
    checkedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    checkedAt: Date
  }],

  // E-Prescribing fields
  ePrescribing: {
    enabled: { type: Boolean, default: false },
    pharmacyId: String,
    pharmacyName: String,
    pharmacyPhone: String,
    pharmacyAddress: String,
    transmissionId: String,
    transmittedAt: Date,
    status: { 
      type: String, 
      enum: ['pending', 'transmitted', 'received', 'filled', 'cancelled'],
      default: 'pending'
    },
    confirmationNumber: String
  },

  // Clinical decision support
  clinicalAlerts: [{
    alertType: { 
      type: String, 
      enum: ['dosing', 'duration', 'contraindication', 'monitoring', 'duplicate_therapy'] 
    },
    message: String,
    severity: { type: String, enum: ['info', 'warning', 'critical'] },
    source: String,
    acknowledged: { type: Boolean, default: false },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: Date
  }],

  // Prescription tracking and audit
  prescriptionHistory: [{
    action: { 
      type: String, 
      enum: ['created', 'modified', 'dispensed', 'refilled', 'cancelled', 'renewed'] 
    },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedAt: { type: Date, default: Date.now },
    changes: Schema.Types.Mixed,
    reason: String,
    notes: String
  }],

  // External references and integrations
  externalReferences: {
    ndcNumber: String, // National Drug Code
    rxNormId: String,  // RxNorm identifier
    drugBankId: String,
    fdaId: String,
    icd10Codes: [String], // Related diagnosis codes
    cptCodes: [String]    // Related procedure codes
  },

  // Print and document management
  printHistory: [{
    printedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    printedAt: { type: Date, default: Date.now },
    printType: { type: String, enum: ['prescription', 'label', 'information_sheet'] },
    copies: { type: Number, default: 1 },
    printerName: String
  }],

  // Advanced medication details
  medicationDetails: {
    brandName: String,
    genericName: String,
    strength: String,
    formulation: String, // tablet, capsule, liquid, injection, etc.
    manufacturer: String,
    lotNumber: String,
    expirationDate: Date,
    therapeuticClass: String,
    pharmacologicalClass: String
  },

  // Monitoring and follow-up
  monitoring: {
    required: { type: Boolean, default: false },
    monitoringType: [String], // lab tests, vital signs, symptoms
    frequency: String,
    nextMonitoringDate: Date,
    alerts: [String]
  },

  // Patient counseling and education
  patientEducation: {
    provided: { type: Boolean, default: false },
    providedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    providedAt: Date,
    materials: [String],
    topics: [String],
    patientUnderstanding: { type: String, enum: ['good', 'fair', 'poor'] }
  },

  // Denormalized patient info — stored at creation so it's always available
  patientSnapshot: {
    firstName: String,
    lastName: String,
    patientId: String,
    age: Number,
    gender: String,
    address: String,
    phoneNumber: String
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true, getters: true },
  toObject: { virtuals: true, getters: true }
});

PrescriptionSchema.index({ patient: 1 });
PrescriptionSchema.index({ doctor: 1 });
PrescriptionSchema.index({ status: 1 });
PrescriptionSchema.index({ paymentStatus: 1 });
PrescriptionSchema.index({ doctor: 1, status: 1 });
PrescriptionSchema.index({ patient: 1, status: 1 });

// Add a pre-save hook to ensure field synchronization
PrescriptionSchema.pre('save', function(next) {
  // Ensure medication and medicationName are in sync
  if (this.medication && !this.medicationName) {
    this.medicationName = this.medication;
  } else if (this.medicationName && !this.medication) {
    this.medication = this.medicationName;
  }
  
  // Ensure notes and instructions are in sync
  if (this.notes && !this.instructions) {
    this.instructions = this.notes;
  } else if (this.instructions && !this.notes) {
    this.notes = this.instructions;
  }

  // Ensure doctor and doctorId are in sync
  if (this.doctor && !this.doctorId) {
    this.doctorId = this.doctor;
  } else if (this.doctorId && !this.doctor) {
    this.doctor = this.doctorId;
  }

  // Ensure datePrescribed and prescribedDate are in sync
  if (this.prescribedDate && !this.datePrescribed) {
    this.datePrescribed = this.prescribedDate;
  } else if (this.datePrescribed && !this.prescribedDate) {
    this.prescribedDate = this.datePrescribed;
  }
  
  next();
});

module.exports = mongoose.model('Prescription', PrescriptionSchema); 
