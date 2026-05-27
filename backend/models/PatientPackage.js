const mongoose = require('mongoose');

const patientPackageSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: true,
    default: 'default',
    index: true
  },
  patient_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  package_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HealthPackage',
    required: true,
    index: true
  },
  purchased_date: {
    type: Date,
    default: Date.now,
    required: true
  },
  expiry_date: {
    type: Date,
    required: true,
    index: true
  },
  total_visits: {
    type: Number,
    required: true
  },
  visits_used: {
    type: Number,
    default: 0,
    required: true
  },
  visits_remaining: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'expired', 'cancelled'],
    default: 'active',
    index: true,
    required: true
  },
  payment_status: {
    type: String,
    enum: ['paid', 'partial', 'pending'],
    default: 'pending',
    required: true
  },
  amount_paid: {
    type: Number,
    default: 0,
    required: true
  },
  balance_due: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PatientPackage', patientPackageSchema);
