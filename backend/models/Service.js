const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: ['consultation', 'procedure', 'lab', 'imaging', 'injection', 'ultrasound', 'blood_test', 'rbs', 'vital_signs', 'other'],
    default: 'other',
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    default: '',
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  linkedInventoryItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
  }],
  // Service-specific fields
  serviceDuration: {
    type: String,
    trim: true,
  },
  serviceRequirements: {
    type: String,
    trim: true,
  },
  serviceEquipment: {
    type: String,
    trim: true,
  },
  serviceStaffRequired: {
    type: String,
    trim: true,
  },
  servicePreparation: {
    type: String,
    trim: true,
  },
  serviceFollowUp: {
    type: String,
    trim: true,
  },
  serviceContraindications: {
    type: String,
    trim: true,
  },
  serviceIndications: {
    type: String,
    trim: true,
  },
  // Additional lab-specific fields
  serviceStorageTemperature: {
    type: String,
    trim: true,
  },
  serviceSpecimenType: {
    type: String,
    trim: true,
  },
  serviceTestType: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

// Create indexes for more efficient queries
ServiceSchema.index({ name: 1 });

const Service = mongoose.model('Service', ServiceSchema);

module.exports = Service; 
