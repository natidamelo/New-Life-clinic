const mongoose = require('mongoose');

const procedureSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  procedureType: {
    type: String,
    required: true,
    enum: [
      'wound_care',
      'dressing_change',
      'catheter_care',
      'iv_care',
      'injection',
      'blood_draw',
      'vital_signs',
      'medication_administration',
      'patient_education',
      'assessment',
      'ear_irrigation',
      'other'
    ]
  },
  procedureName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  completedTime: {
    type: Date
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 5,
    max: 480
  },
  assignedNurse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedNurseName: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: 'Ward'
  },
  roomNumber: {
    type: String
  },
  bedNumber: {
    type: String
  },
  supplies: [{
    itemName: String,
    quantity: Number,
    unit: String
  }],
  instructions: {
    type: String
  },
  preProcedureNotes: {
    type: String
  },
  postProcedureNotes: {
    type: String
  },
  complications: {
    type: String
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: {
    type: Date
  },
  visitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit'
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  // Visit tracking for wound care progress
  visitNumber: {
    type: Number,
    default: 1
  },
  previousVisitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure'
  },
  nextVisitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Procedure'
  },
  progressNotes: {
    type: String
  },
  improvementStatus: {
    type: String,
    enum: ['improving', 'stable', 'worsening', 'healed'],
    default: 'stable'
  },
  // Billing information
  amount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'ETB'
  },
  billingStatus: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  paymentNotificationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification'
  },
  // Service request and invoice linking
  serviceRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceRequest'
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalInvoice'
  },
  // Wound care specific fields
  woundDetails: {
    woundType: {
      type: String,
      enum: [
        'acute_wound',
        'chronic_wound',
        'surgical_wound',
        'burn_wound',
        'pressure_ulcer',
        'diabetic_ulcer',
        'venous_ulcer',
        'arterial_ulcer',
        'trauma_wound',
        'other'
      ]
    },
    woundLocation: String,
    woundSize: {
      length: Number,
      width: Number,
      depth: Number
    },
    woundStage: {
      type: String,
      enum: ['stage_1', 'stage_2', 'stage_3', 'stage_4', 'unstageable']
    },
    woundCharacteristics: {
      tissueType: {
        type: String,
        enum: ['granulation', 'slough', 'necrotic', 'epithelial', 'mixed']
      },
      exudateType: {
        type: String,
        enum: ['serous', 'sanguineous', 'serosanguineous', 'purulent', 'none']
      },
      exudateAmount: {
        type: String,
        enum: ['none', 'minimal', 'moderate', 'heavy']
      },
      odor: {
        type: String,
        enum: ['none', 'mild', 'moderate', 'strong']
      }
    },
    woundAge: {
      type: String,
      enum: ['acute', 'chronic']
    },
    riskFactors: [String]
  },
  woundAssessment: {
    painLevel: {
      type: Number,
      min: 0,
      max: 10
    },
    temperature: Number,
    surroundingSkin: String,
    woundBed: String,
    infectionSigns: [String]
  },
  woundCareSupplies: {
    primaryDressing: {
      type: String,
      enum: ['gauze', 'hydrogel', 'hydrocolloid', 'foam', 'alginate', 'collagen', 'other']
    },
    secondaryDressing: {
      type: String,
      enum: ['gauze_roll', 'tape', 'bandage', 'none', 'other']
    },
    cleansingSolution: {
      type: String,
      enum: ['normal_saline', 'sterile_water', 'antiseptic', 'other']
    },
    additionalSupplies: [String]
  },
  treatmentPlan: {
    frequency: {
      type: String,
      enum: ['daily', 'twice_daily', 'every_other_day', 'weekly', 'as_needed']
    },
    duration: Number, // in days
    specialInstructions: String,
    followUpSchedule: {
      type: String,
      enum: ['daily', 'twice_weekly', 'weekly', 'biweekly', 'monthly']
    }
  },
  // Ear irrigation specific fields
  earIrrigationDetails: {
    earType: {
      type: String,
      enum: [
        'cerumen_removal',
        'debris_removal',
        'foreign_body_removal',
        'infection_treatment',
        'diagnostic_irrigation',
        'other'
      ]
    },
    earSide: {
      type: String,
      enum: ['left', 'right', 'both']
    },
    earCondition: {
      type: String,
      enum: [
        'normal',
        'impacted_cerumen',
        'infected',
        'inflamed',
        'foreign_body',
        'perforated_drum',
        'other'
      ]
    },
    earAnatomy: {
      externalCanal: {
        type: String,
        enum: ['normal', 'inflamed', 'swollen', 'narrowed', 'blocked']
      },
      tympanicMembrane: {
        type: String,
        enum: ['normal', 'perforated', 'inflamed', 'retracted', 'bulging', 'not_visible']
      },
      discharge: {
        type: String,
        enum: ['none', 'clear', 'purulent', 'bloody', 'waxy']
      }
    },
    contraindications: [{
      type: String,
      enum: [
        'tympanic_perforation',
        'ear_tube',
        'recent_surgery',
        'severe_infection',
        'foreign_body',
        'none'
      ]
    }]
  },
  earIrrigationAssessment: {
    painLevel: {
      type: Number,
      min: 0,
      max: 10
    },
    hearingLevel: {
      type: String,
      enum: ['normal', 'mild_loss', 'moderate_loss', 'severe_loss', 'not_assessed']
    },
    earCanalCondition: {
      type: String,
      enum: ['clear', 'partially_blocked', 'completely_blocked', 'inflamed']
    },
    irrigationTolerance: {
      type: String,
      enum: ['good', 'fair', 'poor', 'intolerant']
    },
    complications: [String],
    patientComfort: {
      type: String,
      enum: ['comfortable', 'mild_discomfort', 'moderate_pain', 'severe_pain']
    }
  },
  earIrrigationSupplies: {
    irrigationSolution: {
      type: String,
      enum: ['normal_saline', 'sterile_water', 'warm_water', 'hydrogen_peroxide', 'other']
    },
    irrigationTemperature: {
      type: String,
      enum: ['room_temperature', 'body_temperature', 'warm', 'cool']
    },
    syringeType: {
      type: String,
      enum: ['bulb_syringe', 'electronic_irrigator', 'manual_syringe', 'other']
    },
    additionalSupplies: [String],
    protectiveEquipment: [{
      type: String,
      enum: ['gown', 'gloves', 'eye_protection', 'face_shield']
    }]
  },
  earIrrigationPlan: {
    irrigationMethod: {
      type: String,
      enum: ['gentle_flush', 'pulsatile', 'continuous', 'manual_removal']
    },
    pressureLevel: {
      type: String,
      enum: ['low', 'moderate', 'high']
    },
    duration: Number, // in minutes
    frequency: {
      type: String,
      enum: ['single_session', 'multiple_sessions', 'as_needed']
    },
    followUpRequired: {
      type: Boolean,
      default: false
    },
    followUpInstructions: String,
    patientEducation: {
      type: String,
      enum: ['provided', 'not_needed', 'scheduled']
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
procedureSchema.index({ patientId: 1, status: 1 });
procedureSchema.index({ assignedNurse: 1, status: 1 });
procedureSchema.index({ scheduledTime: 1 });
procedureSchema.index({ procedureType: 1 });

// Virtual for procedure duration in hours
procedureSchema.virtual('durationHours').get(function() {
  return this.duration / 60;
});

// Method to mark procedure as completed
procedureSchema.methods.complete = function(notes, complications) {
  this.status = 'completed';
  this.completedTime = new Date();
  if (notes) this.postProcedureNotes = notes;
  if (complications) this.complications = complications;
  return this.save();
};

// Static method to get procedures by status
procedureSchema.statics.getByStatus = function(status) {
  return this.find({ status }).populate('patientId', 'firstName lastName').populate('assignedNurse', 'firstName lastName');
};

// Static method to get procedures for a specific nurse
procedureSchema.statics.getByNurse = function(nurseId, status = null) {
  const filter = { assignedNurse: nurseId };
  if (status) filter.status = status;
  return this.find(filter).populate('patientId', 'firstName lastName');
};

module.exports = mongoose.model('Procedure', procedureSchema); 
