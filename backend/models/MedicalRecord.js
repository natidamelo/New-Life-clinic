const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: true,
    default: 'default',
    index: true,
    trim: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  doctorName: {
    type: String,
    required: true
  },
  chiefComplaint: {
    description: {
      type: String,
      default: 'Medical consultation'
    },
    duration: {
      type: String,
      default: ''
    },
    severity: {
      type: String,
      enum: ['Mild', 'Moderate', 'Severe'],
      default: 'Mild'
    },
    onsetPattern: {
      type: String,
      enum: ['Acute', 'Gradual', 'Chronic'],
      default: 'Acute'
    },
    progression: {
      type: String,
      enum: ['Improving', 'Stable', 'Worsening'],
      default: 'Stable'
    },
    location: {
      type: String,
      default: ''
    },
    aggravatingFactors: [{
      type: String
    }],
    relievingFactors: [{
      type: String
    }],
    associatedSymptoms: [{
      type: String
    }],
    impactOnDailyLife: {
      type: String,
      default: ''
    },
    previousEpisodes: {
      type: Boolean,
      default: false
    },
    previousEpisodesDetails: {
    type: String,
      default: ''
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    recordedAt: {
      type: Date,
      default: Date.now
    }
  },
  diagnosis: {
    type: String,
    required: true,
    default: 'Diagnosis pending'
  },
  assessment: {
    primaryDiagnosis: {
      type: String,
      default: ''
    },
    // Enhanced ICD-11 support for professional medical records
    primaryDiagnosisICD11: {
      code: {
        type: String,
        default: ''
      },
      description: {
        type: String,
        default: ''
      },
      chapter: {
        type: String,
        default: ''
      },
      block: {
        type: String,
        default: ''
      },
      category: {
        type: String,
        default: ''
      },
      subcategory: {
        type: String,
        default: ''
      }
    },
    // Secondary diagnoses with ICD-11 support
    secondaryDiagnoses: [{
      diagnosis: {
        type: String,
        default: ''
      },
      icd11Code: {
        type: String,
        default: ''
      },
      icd11Description: {
        type: String,
        default: ''
      },
      icd11Chapter: {
        type: String,
        default: ''
      },
      icd11Block: {
        type: String,
        default: ''
      },
      severity: {
        type: String,
        enum: ['Mild', 'Moderate', 'Severe', 'Very Severe'],
        default: 'Mild'
      },
      notes: {
        type: String,
        default: ''
      },
      dateRecorded: {
        type: Date,
        default: Date.now
      }
    }],
    // Clinical reasoning and assessment
    clinicalReasoning: {
      type: String,
      default: ''
    },
    differentialDiagnoses: [{
      diagnosis: {
        type: String,
        default: ''
      },
      icd11Code: {
        type: String,
        default: ''
      },
      probability: {
        type: String,
        enum: ['High', 'Medium', 'Low'],
        default: 'Medium'
      },
      reasoning: {
        type: String,
        default: ''
      }
    }],
    plan: {
      type: String,
      default: ''
    },
    followUp: {
      type: String,
      default: ''
    },
    // Treatment plan with ICD-11 procedure codes
    treatmentPlan: {
      medications: [{
        name: String,
        dosage: String,
        frequency: String,
        duration: String,
        icd11ProcedureCode: String, // For medication procedures
        notes: String
      }],
      procedures: [{
        name: String,
        icd11ProcedureCode: String,
        description: String,
        urgency: {
          type: String,
          enum: ['Emergency', 'Urgent', 'Routine', 'Elective'],
          default: 'Routine'
        },
        notes: String
      }],
      referrals: [{
        specialty: String,
        reason: String,
        urgency: {
          type: String,
          enum: ['Emergency', 'Urgent', 'Routine'],
          default: 'Routine'
        },
        notes: String
      }],
      followUpInstructions: {
        timing: String,
        instructions: String,
        appointmentNeeded: {
          type: Boolean,
          default: false
        },
        labWork: {
          type: Boolean,
          default: false
        },
        imaging: {
          type: Boolean,
          default: false
        }
      }
    }
  },
  diagnoses: [{
    condition: String,
    severity: String,
    notes: String,
    dateRecorded: {
      type: Date,
      default: Date.now
    }
  }],
  treatment: {
    type: String,
    default: ''
  },
  plan: {
    type: String,
    default: ''
  },
  treatmentPlan: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  historyOfPresentIllness: {
    type: String,
    default: ''
  },
  physicalExamination: {
    general: String,
    heent: {
      head: String,
      eyes: String,
      ears: String,
      nose: String,
      throat: String
    },
    cardiovascular: String,
    respiratory: String,
    gastrointestinal: String,
    neurological: String,
    musculoskeletal: String,
    skin: String,
    summary: String
  },
  vitalSigns: {
    temperature: String,
    bloodPressure: String,
    heartRate: String,
    respiratoryRate: String,
    oxygenSaturation: String,
    height: String,
    weight: String,
    bmi: String
  },
  prescriptions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  }],
  labRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabRequest'
  }],
  status: {
    type: String,
    enum: ['Draft', 'Finalized', 'Locked'],
    default: 'Draft'
  },
  recordType: {
    type: String,
    enum: ['consultation', 'regular', 'emergency', 'follow-up'],
    default: 'regular'
  },
  visitDate: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  followUpPlan: {
    instructions: String,
    timing: String,
    appointmentNeeded: {
      type: Boolean,
      default: false
    }
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

// Index for efficient queries
medicalRecordSchema.index({ patient: 1, visitDate: -1 });
medicalRecordSchema.index({ clinicId: 1, patient: 1, visitDate: -1 });
medicalRecordSchema.index({ doctor: 1, visitDate: -1 });
medicalRecordSchema.index({ patientId: 1, visitDate: -1 });
medicalRecordSchema.index({ doctorId: 1, visitDate: -1 });
medicalRecordSchema.index({ status: 1 });
medicalRecordSchema.index({ recordType: 1 });
medicalRecordSchema.index({ isDeleted: 1 });

// Pre-save middleware to ensure both patient and patientId are set
medicalRecordSchema.pre('save', function(next) {
  if (this.patient && !this.patientId) {
    this.patientId = this.patient;
  }
  if (this.patientId && !this.patient) {
    this.patient = this.patientId;
  }
  if (this.doctor && !this.doctorId) {
    this.doctorId = this.doctor;
  }
  if (this.doctorId && !this.doctor) {
    this.doctor = this.doctorId;
  }
  next();
});

// Instance method to finalize a medical record and update patient status
medicalRecordSchema.methods.finalize = async function(finalizedBy, userRole) {
  try {
    // Check if record is already finalized
    if (this.status === 'Finalized') {
      console.log(`[FINALIZE] Record ${this._id} is already finalized`);
      return false;
    }

    console.log(`[FINALIZE] Starting finalization for record ${this._id}, patient: ${this.patient}`);

    // Update record status to finalized
    this.status = 'Finalized';
    this.lastUpdatedBy = finalizedBy;
    this.updatedAt = new Date();
    
    // Save the medical record
    await this.save();
    console.log(`[FINALIZE] Medical record ${this._id} saved with status: Finalized`);
    
    // Update patient status to 'completed' when medical record is finalized
    const Patient = require('./Patient');
    const patient = await Patient.findById(this.patient);
    
    if (!patient) {
      const errorMsg = `[FINALIZE ERROR] Patient ${this.patient} not found for medical record ${this._id}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`[FINALIZE] Found patient ${patient._id} (${patient.firstName} ${patient.lastName}), current status: ${patient.status}`);
    
    // Update patient status and completedAt timestamp
    const updateResult = await Patient.findByIdAndUpdate(
      this.patient,
      { 
        status: 'completed',
        completedAt: new Date(),
        lastUpdated: new Date()
      },
      { 
        new: true,
        runValidators: true
      }
    );

    if (!updateResult) {
      const errorMsg = `[FINALIZE ERROR] Failed to update patient ${this.patient} status`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    console.log(`[FINALIZE SUCCESS] Patient ${patient._id} status updated to: ${updateResult.status}, completedAt: ${updateResult.completedAt}`);
    console.log(`[FINALIZE] Finalization completed successfully for record ${this._id}`);
    
    return true;
    
  } catch (error) {
    console.error(`[FINALIZE ERROR] Failed to finalize medical record ${this._id}:`, error);
    console.error(`[FINALIZE ERROR] Error stack:`, error.stack);
    throw error;
  }
};

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema); 
