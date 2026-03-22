const mongoose = require('mongoose');

/**
 * IPD (In Patient Department) Admission
 * Tracks when a patient is admitted to the ward (bed/room), who admitted them,
 * and supports billing for bed, medications, and procedures during the stay.
 */
const ipdAdmissionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  wardName: {
    type: String,
    trim: true,
    default: 'General Ward'
  },
  roomNumber: {
    type: String,
    trim: true,
    required: true
  },
  bedNumber: {
    type: String,
    trim: true,
    required: true
  },
  admitDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dischargeDate: {
    type: Date
  },
  admittingDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admittingDoctorName: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'discharged'],
    default: 'active',
    index: true
  },
  admissionNotes: {
    type: String,
    trim: true
  },
  dischargeNotes: {
    type: String,
    trim: true
  },
  // Link to invoice for this admission (bed charges, IPD meds can be added here)
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalInvoice'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

ipdAdmissionSchema.index({ patientId: 1, status: 1 });
ipdAdmissionSchema.index({ status: 1, admitDate: -1 });

const IPDAdmission = mongoose.model('IPDAdmission', ipdAdmissionSchema);
module.exports = IPDAdmission;
