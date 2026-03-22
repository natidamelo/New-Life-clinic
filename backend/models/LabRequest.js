const mongoose = require('mongoose');
const LabRequestSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  medicalRecord: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tests: [String],
  status: { type: String, enum: ['requested', 'in progress', 'completed'], default: 'requested' },
  results: String,
  resultFiles: [String],
  requestedAt: { type: Date, default: Date.now },
  completedAt: Date
}, { timestamps: true });
module.exports = mongoose.model('LabRequest', LabRequestSchema); 
