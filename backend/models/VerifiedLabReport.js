const mongoose = require('mongoose');

const verifiedLabReportSchema = new mongoose.Schema(
  {
    verificationCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    patientName: {
      type: String,
      required: true,
      trim: true
    },
    patientId: {
      type: String,
      trim: true
    },
    gender: {
      type: String,
      trim: true
    },
    age: {
      type: mongoose.Schema.Types.Mixed
    },
    dob: {
      type: String
    },
    patientLocation: {
      type: String,
      default: 'Walk-In'
    },
    serviceLocation: {
      type: String,
      default: 'Bole'
    },
    orderDate: {
      type: Date
    },
    doneDate: {
      type: Date,
      default: Date.now
    },
    doneBy: {
      type: String
    },
    requestedBy: {
      type: String
    },
    reportDate: {
      type: Date,
      default: Date.now
    },
    reportDoneBy: {
      type: String
    },
    tests: [
      {
        testName: { type: String, required: true },
        results: { type: mongoose.Schema.Types.Mixed },
        unit: { type: String, default: '' },
        normalRange: { type: String, default: '' },
        flag: { type: String, default: '-' },
        status: { type: String, default: 'Completed' },
        notes: { type: String, default: '' },
        orderDate: { type: Date }
      }
    ],
    summary: {
      totalTests: { type: Number, default: 0 },
      parameters: { type: Number, default: 0 },
      abnormalCount: { type: Number, default: 0 }
    },
    notes: {
      type: String,
      default: ''
    },
    clinic: {
      name: { type: String, default: 'New Life Medium Clinic' },
      fullName: { type: String, default: 'New Life Medium Clinic' },
      address: { type: String, default: 'Lafto, beside Kebron Guest House' },
      phone: { type: String, default: '+251925959219' },
      branch: { type: String, default: 'Bole' },
      logo: { type: String, default: '/assets/images/logo.jpg' }
    },
    accessCount: {
      type: Number,
      default: 0
    },
    lastAccessedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('VerifiedLabReport', verifiedLabReportSchema);
