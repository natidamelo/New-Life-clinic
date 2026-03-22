const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for medication details within a nurse task
const MedicationDetailsSchema = new Schema({
  medicationName: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  frequency: {
    type: String,
    required: true
  },
  frequencyLabel: {
    type: String
  },
  route: {
    type: String
  },
  instructions: {
    type: String
  },
  // Instance labeling for multiple prescriptions of same medication
  instanceOrder: {
    type: Number
  },
  instanceLabel: {
    type: String
  },
  duration: {
    type: Number
  },
  startDate: {
    type: Date
  },
  doseRecords: [
    {
      day: {
        type: Number,
        required: true
      },
      timeSlot: {
        type: String,
        required: true
      },
      doseSequence: {
        type: Number,
        required: true,
        default: function() {
          // Auto-calculate sequence number based on day and time slot
          return this.day;
        }
      },
      doseLabel: {
        type: String,
        default: function() {
          // Auto-generate label like "1st", "2nd", "3rd", etc.
          const sequence = this.doseSequence;
          if (sequence === 1) return '1st';
          if (sequence === 2) return '2nd';
          if (sequence === 3) return '3rd';
          return `${sequence}th`;
        }
      },
      administered: {
        type: Boolean,
        default: false
      },
      administeredAt: {
        type: Date
      },
      administeredBy: {
        type: String
      },
      notes: {
        type: String
      },
      // Persist inventory deduction state to ensure idempotency
      inventoryDeducted: {
        type: Boolean,
        default: false
      },
      inventoryDetails: {
        type: Schema.Types.Mixed
      },
      processed: {
        type: Boolean,
        default: false
      },
      processedAt: {
        type: Date
      },
      processedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    }
  ],
  // Extension tracking fields
  originalDoses: {
    type: Number
  },
  extendedDoses: {
    type: Number
  },
  totalDoses: {
    type: Number
  },
  isExtension: {
    type: Boolean,
    default: false
  },
  extensionDetails: {
    originalDuration: Number,
    additionalDays: Number,
    additionalDoses: Number,
    totalNewDuration: Number
  }
});

// Schema for payment authorization details
const PaymentAuthorizationSchema = new Schema({
  paidDays: {
    type: Number,
    default: 0
  },
  totalDays: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  canAdminister: {
    type: Boolean,
    default: false
  },
  restrictionMessage: {
    type: String
  },
  authorizedDoses: {
    type: Number,
    default: 0
  },
  unauthorizedDoses: {
    type: Number,
    default: 0
  },
  outstandingAmount: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Main Nurse Task schema
const NurseTaskSchema = new Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  patientName: {
    type: String
  },
  taskType: {
    type: String,
    required: true,
    enum: ['MEDICATION', 'VITAL_SIGNS', 'PROCEDURE', 'OTHER']
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  priority: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    default: 'MEDIUM'
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedByName: {
    type: String
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedToName: {
    type: String
  },
  dueDate: {
    type: Date,
    required: true
  },
  completedDate: {
    type: Date
  },
  notes: {
    type: String
  },
  medicationDetails: {
    type: MedicationDetailsSchema
  },
  // Link to the originating prescription to prevent duplicates and for traceability
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  // NEW: Array of prescription IDs to support multiple prescriptions for the same medication
  prescriptionIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  }],
  // NEW: Prescription dependency fields
  prescriptionDependencies: {
    dependsOn: [{
      prescriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prescription'
      },
      medicationName: String,
      requiredCompletion: {
        type: String,
        enum: ['fully_completed', 'partially_completed'],
        default: 'fully_completed'
      }
    }],
    isBlocked: {
      type: Boolean,
      default: false
    },
    blockReason: String
  },
  // Payment authorization for medication tasks
  paymentAuthorization: {
    type: PaymentAuthorizationSchema
  },
  // Service-related fields
  relatedServiceRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest'
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  serviceName: {
    type: String
  },
  servicePrice: {
    type: Number
  },
  // Payment-related fields for injection and procedure tasks
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'fully_paid'],
    default: 'unpaid'
  },
  paidAt: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'insurance', 'patient_card', 'other']
  },
  paymentNotes: {
    type: String
  },
  // Metadata for additional task information
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // IPD: link task to an admission so nurse can filter by ward
  admissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IPDAdmission',
    default: null
  }
}, {
  timestamps: true
});

// Create indexes for common query patterns
NurseTaskSchema.index({ patientId: 1 });
NurseTaskSchema.index({ assignedTo: 1 });
NurseTaskSchema.index({ status: 1 });
NurseTaskSchema.index({ dueDate: 1 });
NurseTaskSchema.index({ taskType: 1 });

// Compound indexes for common query combinations (CRITICAL FOR PERFORMANCE)
NurseTaskSchema.index({ taskType: 1, status: 1, createdAt: -1 });
NurseTaskSchema.index({ taskType: 1, assignedTo: 1, status: 1 });
NurseTaskSchema.index({ patientId: 1, taskType: 1 });

// Allow multiple active tasks for the same patient + medication (no unique constraint)
// Keep a non-unique compound index to help query performance without blocking duplicates
NurseTaskSchema.index({ patientId: 1, 'medicationDetails.medicationName': 1 });

/**
 * Pre-save middleware to ensure patient names are never saved as "Unknown Patient"
 * This prevents the root cause of "Unknown Patient" issues in the Administer Meds interface
 */
NurseTaskSchema.pre('save', async function(next) {
  try {
    // Ensure prescriptionIds array is populated when prescriptionId is set
    if (this.prescriptionId && (!this.prescriptionIds || this.prescriptionIds.length === 0)) {
      this.prescriptionIds = [this.prescriptionId];
    }
    
    // Only process if this is a new document or if patientName is being updated
    if (this.isNew || this.isModified('patientName')) {
      
      // If patientName is invalid or missing, try to fetch it from the patient record
      if (!this.patientName || 
          this.patientName === 'Unknown' || 
          this.patientName === 'Unknown Patient' ||
          this.patientName.trim() === '') {
        
        if (this.patientId) {
          try {
            // Import Patient model here to avoid circular dependencies
            const Patient = mongoose.model('Patient');
            const patient = await Patient.findById(this.patientId);
            
            if (patient) {
              const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
              if (patientName && patientName !== '') {
                this.patientName = patientName;
                console.log(`✅ [NURSE TASK PRE-SAVE] Auto-populated patient name: ${patientName} for patient ID: ${this.patientId}`);
              } else {
                console.warn(`⚠️ [NURSE TASK PRE-SAVE] Patient ${this.patientId} has no valid name fields`);
                // Set a descriptive placeholder instead of "Unknown Patient"
                this.patientName = `Patient ${this.patientId}`;
              }
            } else {
              console.warn(`⚠️ [NURSE TASK PRE-SAVE] Patient ${this.patientId} not found in database`);
              // Set a descriptive placeholder instead of "Unknown Patient"
              this.patientName = `Patient ${this.patientId}`;
            }
          } catch (error) {
            console.error(`❌ [NURSE TASK PRE-SAVE] Error fetching patient ${this.patientId}:`, error.message);
            // Set a descriptive placeholder instead of "Unknown Patient"
            this.patientName = `Patient ${this.patientId}`;
          }
        } else {
          console.warn(`⚠️ [NURSE TASK PRE-SAVE] No patientId available, cannot populate patient name`);
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ [NURSE TASK PRE-SAVE] Error in pre-save middleware:', error);
    next(error);
  }
});

/**
 * Pre-update middleware to ensure patient names are never updated to "Unknown Patient"
 */
NurseTaskSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'findByIdAndUpdate'], async function(next) {
  try {
    const update = this.getUpdate();
    
    // Check if patientName is being updated to an invalid value
    if (update.patientName && 
        (update.patientName === 'Unknown' || 
         update.patientName === 'Unknown Patient' ||
         update.patientName.trim() === '')) {
      
      console.warn(`⚠️ [NURSE TASK PRE-UPDATE] Attempted to update patientName to invalid value: "${update.patientName}"`);
      
      // If we have patientId in the query, try to fetch the actual patient name
      const query = this.getQuery();
      if (query.patientId) {
        try {
          const Patient = mongoose.model('Patient');
          const patient = await Patient.findById(query.patientId);
          
          if (patient) {
            const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
            if (patientName && patientName !== '') {
              update.patientName = patientName;
              console.log(`✅ [NURSE TASK PRE-UPDATE] Auto-corrected patient name to: ${patientName}`);
            }
          }
        } catch (error) {
          console.error(`❌ [NURSE TASK PRE-UPDATE] Error fetching patient name:`, error.message);
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ [NURSE TASK PRE-UPDATE] Error in pre-update middleware:', error);
    next(error);
  }
});

// ROOT CAUSE FIX: Post-save hook to ensure payment status consistency
// Temporarily disabled to isolate 500 error
/*
NurseTaskSchema.post('save', function(doc) {
  try {
    // Avoid circular dependency by implementing the logic directly
    if (doc.paymentStatus && doc.paymentAuthorization?.paymentStatus) {
      const PaymentStatusNormalizer = require('../utils/paymentStatusNormalizer');
      const mainStatus = PaymentStatusNormalizer.normalize(doc.paymentStatus);
      const authStatus = PaymentStatusNormalizer.normalize(doc.paymentAuthorization.paymentStatus);
      
      // If they don't match, update the paymentAuthorization to match the main field
      if (mainStatus !== authStatus) {
        doc.paymentAuthorization.paymentStatus = mainStatus;
        doc.paymentAuthorization.lastUpdated = new Date();
        
        console.log(`🔄 [PAYMENT SYNC] Post-save sync: ${authStatus} -> ${mainStatus}`);
        
        // Save the document to persist the change (but avoid infinite loop)
        if (!doc._paymentSyncInProgress) {
          doc._paymentSyncInProgress = true;
          return doc.save().catch(err => {
            console.error('❌ [PAYMENT SYNC] Error saving payment status sync:', err);
          }).finally(() => {
            doc._paymentSyncInProgress = false;
          });
        }
      }
    }
  } catch (error) {
    console.error('❌ [PAYMENT SYNC] Error in post-save payment status sync:', error);
  }
});
*/

module.exports = mongoose.model('NurseTask', NurseTaskSchema); 
