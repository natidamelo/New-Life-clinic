const mongoose = require('mongoose');

const vitalSignsSubSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true, default: Date.now },
  temperature: String,
  bloodPressure: String,
  heartRate: String,
  respiratoryRate: String,
  oxygenSaturation: String,
  bloodSugar: String,
  pain: String,
  height: String,
  weight: String,
  bmi: String
}, { _id: false });

const notesSubSchema = new mongoose.Schema({
  timestamp: { type: Date, required: true, default: Date.now },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  noteType: {
    type: String,
    enum: ['Nurse Intake', 'Nurse Progress', 'Doctor Progress', 'Consult Note', 'Discharge Summary'],
    required: true
  },
  text: {
    type: String,
    required: true
  }
}, { _id: true }); // Give notes subdocuments their own ID

const visitSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  appointmentId: { // Link back to the scheduled appointment if applicable
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // Usually assigned when visit starts or during
    index: true
  },
  nurseId: { // Nurse primarily responsible for intake/vitals during this visit
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  visitStartDateTime: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  visitEndDateTime: {
    type: Date
  },
  department: {
    type: String,
    trim: true
  },
  chiefComplaint: {
    type: String,
    trim: true
  },
  diagnosis: [{
    code: String, // e.g., ICD-10 code
    description: String,
    type: { type: String, enum: ['Primary', 'Secondary', 'Differential'] }
  }],
  status: {
    type: String,
    enum: ['Active', 'Discharged', 'Pending Billing', 'Cancelled'],
    default: 'Active',
    index: true
  },
  vitals: [vitalSignsSubSchema], // Array to track vitals over the course of the visit
  notes: [notesSubSchema], // Array for various notes during the visit
  prescriptionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  }],
  labOrderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabOrder'
  }],
  imagingOrderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ImagingOrder'
  }],
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

const Visit = mongoose.model('Visit', visitSchema);

module.exports = Visit; 
