const mongoose = require('mongoose');

const serviceRequestSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  quantity: {
    type: Number,
    min: 1,
    default: 1
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  completionDate: {
    type: Date
  },
  assignedNurse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String,
  source: {
    type: String,
    enum: ['doctor', 'reception', 'nurse', 'admin'],
    default: 'reception'
  },
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalInvoice'
  }
}, {
  timestamps: true
});

// Add indexes for common queries
serviceRequestSchema.index({ patient: 1, requestDate: -1 });
serviceRequestSchema.index({ status: 1 });
serviceRequestSchema.index({ assignedNurse: 1, status: 1 });
serviceRequestSchema.index({ assignedDoctor: 1, status: 1 });

const ServiceRequest = mongoose.model('ServiceRequest', serviceRequestSchema);

module.exports = ServiceRequest; 
