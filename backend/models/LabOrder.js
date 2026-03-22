const mongoose = require('mongoose');

const labOrderSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.Mixed, // Allow both ObjectId and String
    required: true,
    index: true,
    validate: {
      validator: function(v) {
        // Allow ObjectId or string that starts with 'P'
        return mongoose.Types.ObjectId.isValid(v) || (typeof v === 'string' && v.startsWith('P'));
      },
      message: 'PatientId must be a valid ObjectId or standardized patient ID string'
    }
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    index: true // Add index for faster lookups
  },
  orderingDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // New field to track the source of the lab order
  source: {
    type: String,
    enum: ['doctor', 'reception'],
    default: 'doctor',
    index: true
  },
  // Field to track who created the order (for reception orders)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for backward compatibility
  },
  visitId: { // Visit during which lab test was ordered
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit',
    required: false, // Made optional for service requests
    index: true
  },
  testName: {
    type: String,
    required: function() {
      // testName is required only if tests array is empty or not provided
      return !this.tests || this.tests.length === 0;
    },
    trim: true
  },
  panelName: { // Optional: if part of a panel (e.g., 'Basic Metabolic Panel')
    type: String,
    trim: true
  },
  specimenType: { // e.g., Blood, Urine, Tissue
    type: String,
    trim: true
  },
  orderDateTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  collectionDateTime: {
    type: Date
  },
  resultDateTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Pending Payment', 'Ordered', 'Scheduled', 'Collected', 'Processing', 'Results Available', 'Cancelled'],
    default: 'Pending Payment',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'partially_paid'],
    default: 'pending',
    index: true
  },
  // New multi-test support
  tests: [{
    testName: { type: String, required: true },
    price: { type: Number, required: true }
  }],
  totalPrice: { type: Number },
  results: { // Can be simple string, object, or path to a file
    type: mongoose.Schema.Types.Mixed
  },
  normalRange: {
    type: String
  },
  notes: { // Lab tech or doctor notes
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['Routine', 'STAT', 'ASAP'],
    default: 'Routine'
  },
  // Add tracking for when lab results are sent to doctor
  sentToDoctor: {
    type: Boolean,
    default: false,
    index: true
  },
  sentToDoctorAt: {
    type: Date
  },
  sentToDoctorBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sentToDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  // Invoice reference for payment tracking
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalInvoice'
  },
  paidAt: {
    type: Date
  },
  // Service request integration
  serviceRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest'
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  servicePrice: {
    type: Number
  },
  stoolExamDetails: {
    color: { type: String, enum: ["Brown", "Yellow", "Pale", "Dark", "Black", "Red", null], required: false },
    consistency: { type: String, enum: ["Soft", "Formed", "Loose", "Watery", "Hard", "Pellet-like", null], required: false },
    mucus: { type: String, enum: ["None", "Trace", "Moderate", "Abundant", null], required: false },
    blood: { type: String, enum: ["Negative", "Trace", "Positive", null], required: false },
    ph: { type: String, enum: ["5.5", "6.0", "6.5", "7.0", "7.5", "8.0", null], required: false },
    occultBlood: { type: String, enum: ["Negative", "Positive", null], required: false },
    parasites: { type: String, enum: ["None", "Ova", "Cysts", "Trophozoites", null], required: false },
    whiteBloodCells: { type: String, enum: ["None", "Rare", "Few", "Moderate", "Many", null], required: false },
    redBloodCells: { type: String, enum: ["None", "Rare", "Few", "Moderate", "Many", null], required: false },
    fat: { type: String, enum: ["Minimal", "Moderate", "Abundant", null], required: false }
  },
  // Metadata for linking to invoices and service requests
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Track if inventory has been deducted for this lab order
  inventoryDeducted: {
    type: Boolean,
    default: false,
    index: true
  },
  // Track when inventory was deducted
  inventoryDeductedAt: {
    type: Date
  },
  // Track who deducted the inventory
  inventoryDeductedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Pre-save hook to populate the 'patient' field
labOrderSchema.pre('save', async function(next) {
  if (this.isModified('patientId') || this.isNew) {
    const Patient = this.model('Patient');
    try {
      const foundPatient = await Patient.findByAnyId(this.patientId); // Use the static helper
      if (foundPatient) {
        this.patient = foundPatient._id;
      } else {
        console.warn(`Patient with ID ${this.patientId} not found for lab order ${this._id}. Patient field will be null.`);
      }
    } catch (error) {
      console.error(`Error in labOrder pre-save hook for patientId ${this.patientId}:`, error);
      // Continue saving even if patient lookup fails, to avoid blocking order creation
    }
  }
  next();
});

const LabOrder = mongoose.model('LabOrder', labOrderSchema);

module.exports = LabOrder; 
