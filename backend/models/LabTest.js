const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
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
  labOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabOrder',
    required: false
  },
  testName: {
    type: String,
    required: true
  },
  testType: {
    type: String,
    required: true,
    enum: ['Blood Test', 'Urine Test', 'Stool Test', 'Other']
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  results: {
    type: mongoose.Schema.Types.Mixed
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
  },
  // Fields for tracking when results are sent to doctors
  sentToDoctor: {
    type: Boolean,
    default: false
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
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LabTest', labTestSchema, 'labtests'); 
