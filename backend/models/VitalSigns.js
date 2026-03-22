const mongoose = require('mongoose');

const VitalSignsSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  measurementType: {
    type: String,
    enum: ['blood_pressure', 'temperature', 'pulse', 'weight', 'height', 'comprehensive'],
    default: 'comprehensive'
  },
  systolic: {
    type: Number,
    min: 50,
    max: 300
  },
  diastolic: {
    type: Number,
    min: 30,
    max: 200
  },
  pulse: {
    type: Number,
    min: 30,
    max: 250
  },
  temperature: {
    type: Number,
    min: 30,
    max: 45
  },
  weight: {
    type: Number,
    min: 0.1,
    max: 500
  },
  height: {
    type: Number,
    min: 10,
    max: 300
  },
  bmi: {
    type: Number,
    min: 5,  // Lowered to allow edge cases (e.g., very low weight patients)
    max: 100
  },
  spo2: {
    type: Number,
    min: 0,
    max: 100
  },
  respiratoryRate: {
    type: Number,
    min: 5,
    max: 60
  },
  bloodSugar: {
    type: Number,
    min: 0,
    max: 1000
  },
  pain: {
    type: Number,
    min: 0,
    max: 10
  },
  notes: {
    type: String,
    default: ''
  },
  measuredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  measuredByName: {
    type: String,
    required: true
  },
  measurementDate: {
    type: Date,
    default: Date.now
  },
  fileType: {
    type: String,
    enum: ['weekly', 'monthly', 'single'],
    default: 'single'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  position: {
    type: String,
    enum: ['sitting', 'standing', 'lying'],
    default: 'sitting'
  },
  arm: {
    type: String,
    enum: ['left', 'right'],
    default: 'left'
  },
  location: {
    type: String,
    default: 'Clinic'
  },
  device: {
    type: String,
    default: 'Manual BP Monitor'
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NurseTask'
  },
  taskType: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
VitalSignsSchema.index({ patientId: 1, measurementDate: -1 });
VitalSignsSchema.index({ measurementType: 1 });
VitalSignsSchema.index({ measuredBy: 1 });

// Virtual for blood pressure category
VitalSignsSchema.virtual('bloodPressureCategory').get(function() {
  if (this.measurementType !== 'blood_pressure' || !this.systolic || !this.diastolic) {
    return null;
  }
  
  if (this.systolic < 120 && this.diastolic < 80) return 'Normal';
  if (this.systolic >= 120 && this.systolic < 130 && this.diastolic < 80) return 'Elevated';
  if ((this.systolic >= 130 && this.systolic < 140) || (this.diastolic >= 80 && this.diastolic < 90)) return 'Stage 1 Hypertension';
  if (this.systolic >= 140 || this.diastolic >= 90) return 'Stage 2 Hypertension';
  if (this.systolic > 180 || this.diastolic > 120) return 'Hypertensive Crisis';
  return 'Unknown';
});

// Virtual for formatted measurement value
VitalSignsSchema.virtual('formattedValue').get(function() {
  const values = [];
  
  if (this.systolic && this.diastolic) {
    values.push(`${this.systolic}/${this.diastolic} mmHg`);
  }
  if (this.pulse) {
    values.push(`${this.pulse} bpm`);
  }
  if (this.temperature) {
    values.push(`${this.temperature}°C`);
  }
  if (this.spo2) {
    values.push(`SpO2 ${this.spo2}%`);
  }
  if (this.weight) {
    values.push(`${this.weight} kg`);
  }
  if (this.height) {
    values.push(`${this.height} cm`);
  }
  if (this.bmi) {
    values.push(`BMI ${this.bmi}`);
  }
  if (this.respiratoryRate) {
    values.push(`${this.respiratoryRate} breaths/min`);
  }
  
  return values.length > 0 ? values.join(' | ') : 'N/A';
});

// Static method to get patient history
VitalSignsSchema.statics.getPatientHistory = function(patientId, measurementType, fileType) {
  const query = { patientId, isActive: true };
  if (measurementType) query.measurementType = measurementType;
  if (fileType) query.fileType = fileType;
  
  return this.find(query).sort({ measurementDate: -1 });
};

// Static method to get blood pressure history
VitalSignsSchema.statics.getBloodPressureHistory = function(patientId, limit = 10) {
  return this.find({
    patientId,
    measurementType: 'blood_pressure',
    isActive: true
  })
  .sort({ measurementDate: -1 })
  .limit(limit);
};

// Pre-save middleware to validate vital signs
VitalSignsSchema.pre('save', function(next) {
  // Check if at least one vital sign is recorded
  const hasVitalSigns = this.systolic || this.diastolic || this.pulse || 
                       this.temperature || this.weight || this.height || 
                       this.spo2 || this.respiratoryRate;
  
  if (!hasVitalSigns) {
    return next(new Error('At least one vital sign measurement must be recorded'));
  }
  
  // Validate blood pressure if both values are present
  if (this.systolic && this.diastolic && this.systolic <= this.diastolic) {
    return next(new Error('Systolic pressure must be higher than diastolic pressure'));
  }
  
  // Auto-calculate BMI if weight and height are provided
  if (this.weight && this.height && !this.bmi) {
    const heightInMeters = this.height / 100;
    if (heightInMeters > 0) {  // Prevent division by zero
      const calculatedBMI = parseFloat((this.weight / (heightInMeters * heightInMeters)).toFixed(1));
      // Only set BMI if it's within reasonable bounds (5-100)
      if (calculatedBMI >= 5 && calculatedBMI <= 100) {
        this.bmi = calculatedBMI;
      }
      // If calculated BMI is outside bounds, don't set it (skip BMI field)
    }
  }
  
  // If BMI is set but outside valid range, remove it to avoid validation error
  if (this.bmi !== undefined && (this.bmi < 5 || this.bmi > 100)) {
    this.bmi = undefined;
  }
  
  next();
});

module.exports = mongoose.model('VitalSigns', VitalSignsSchema);
