const mongoose = require('mongoose');

const imagingSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imagingType: {
    type: String,
    required: true,
    enum: ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Other']
  },
  bodyPart: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  report: {
    type: String
  },
  imageUrl: {
    type: String
  },
  notes: String,
  requestedDate: {
    type: Date,
    default: Date.now
  },
  completedDate: Date,
  priority: {
    type: String,
    enum: ['Routine', 'Urgent', 'Emergency'],
    default: 'Routine'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Imaging', imagingSchema); 
