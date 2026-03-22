const mongoose = require('mongoose');

const labServiceResultSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  testName: {
    type: String,
    required: true
  },
  results: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  normalRange: {
    type: String
  },
  notes: {
    type: String
  },
  priority: {
    type: String,
    enum: ['Routine', 'STAT', 'ASAP'],
    default: 'Routine'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resultCreatedDate: {
    type: Date,
    default: Date.now
  },
  printed: {
    type: Boolean,
    default: false
  },
  printedAt: {
    type: Date
  },
  printedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better query performance
labServiceResultSchema.index({ patientId: 1, resultCreatedDate: -1 });
labServiceResultSchema.index({ createdBy: 1 });
labServiceResultSchema.index({ status: 1 });

module.exports = mongoose.model('LabServiceResult', labServiceResultSchema);