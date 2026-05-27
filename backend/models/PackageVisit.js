const mongoose = require('mongoose');

const packageVisitSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: true,
    default: 'default',
    index: true
  },
  patient_package_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PatientPackage',
    required: true,
    index: true
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  visit_date: {
    type: Date,
    default: Date.now,
    required: true
  },
  visit_number: {
    type: Number,
    required: true
  },
  attended_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Vitals (optional but recommended)
  blood_pressure_systolic: Number,
  blood_pressure_diastolic: Number,
  blood_sugar_fasting: Number,
  blood_sugar_random: Number,
  weight_kg: Number,
  bmi: Number,
  // Clinical
  diagnosis_notes: String,
  medications_given: [String],
  lab_results: [String], // Lab test names completed or ordered
  // Follow-up
  next_visit_due_date: Date,
  next_visit_notes: String,
  payment_collected: {
    type: Number,
    default: 0
  },
  // Routing flags
  needs_consultation: {
    type: Boolean,
    default: false
  },
  needs_vitals: {
    type: Boolean,
    default: false
  },
  needs_lab: {
    type: Boolean,
    default: false
  },
  lab_services_ordered: [String] // List of services ordered for this visit
}, {
  timestamps: true
});

module.exports = mongoose.model('PackageVisit', packageVisitSchema);
