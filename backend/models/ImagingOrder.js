const mongoose = require('mongoose');

const imagingOrderSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  orderingDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  visitId: { // Visit during which imaging was ordered
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit',
    required: false,
    index: true
  },
  imagingType: { // e.g., X-Ray, CT, MRI, Ultrasound
    type: String,
    required: true,
    trim: true
  },
  bodyPart: {
    type: String,
    required: true
  },
  laterality: { // e.g., Left, Right, Bilateral
    type: String
  },
  contrast: {
    type: Boolean,
    default: false
  },
  orderDateTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  scheduledDateTime: {
    type: Date
  },
  completionDateTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Ordered', 'Scheduled', 'In Progress', 'Completed', 'Results Available', 'Cancelled'],
    default: 'Ordered',
    index: true
  },
  resultsSummary: { // Text summary or key findings
    type: String
  },
  results: { // Detailed results object with type-specific fields
    type: mongoose.Schema.Types.Mixed
  },
  reportPath: { // Path to the full report file (e.g., PDF in storage)
    type: String
  },
  notes: { // Radiologist or doctor notes
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['Routine', 'STAT', 'ASAP'],
    default: 'Routine'
  },
  // Service request integration
  serviceRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest'
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  servicePrice: {
    type: Number
  },

  // Imaging report workflow (separate from study workflow `status`)
  reportWorkflow: {
    status: {
      type: String,
      enum: ['Draft', 'Finalized', 'Sent'],
      default: 'Draft',
      index: true
    },
    version: {
      type: Number,
      default: 1
    },
    lastDraftSavedAt: {
      type: Date
    },
    finalizedAt: {
      type: Date
    },
    finalizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: {
      type: Date
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    history: [
      {
        action: {
          type: String,
          enum: ['draft_saved', 'finalized', 'sent', 'reopened'],
          required: true
        },
        at: {
          type: Date,
          default: Date.now
        },
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        role: {
          type: String
        },
        note: {
          type: String
        },
        snapshotVersion: {
          type: Number
        }
      }
    ]
  }
}, {
  timestamps: true
});

const ImagingOrder = mongoose.model('ImagingOrder', imagingOrderSchema);

module.exports = ImagingOrder; 
