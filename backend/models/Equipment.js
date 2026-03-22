const mongoose = require('mongoose');

const maintenanceHistorySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  performedBy: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['routine', 'repair', 'calibration', 'inspection'],
    default: 'routine'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  cost: {
    type: Number,
    default: 0
  }
}, { _id: true });

const utilizationSchema = new mongoose.Schema({
  lastUsed: {
    type: Date
  },
  totalUsageHours: {
    type: Number,
    default: 0
  },
  usageCount: {
    type: Number,
    default: 0
  },
  currentOperator: {
    type: String,
    trim: true
  }
}, { _id: false });

const equipmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  model: {
    type: String,
    required: true,
    trim: true
  },
  serialNumber: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['operational', 'maintenance', 'faulty', 'calibration'],
    default: 'operational'
  },
  purchaseDate: {
    type: Date,
    required: true
  },
  lastMaintenance: {
    type: Date
  },
  nextMaintenance: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  warrantyExpiryDate: {
    type: Date
  },
  purchaseCost: {
    type: Number
  },
  expectedLifespan: {
    type: Number,
    description: "Expected lifespan in years"
  },
  maintenanceHistory: [maintenanceHistorySchema],
  utilization: {
    type: utilizationSchema,
    default: () => ({})
  },
  calibrationFrequency: {
    type: Number,
    description: "Required calibration frequency in days"
  },
  manualUrl: {
    type: String,
    trim: true
  },
  criticalEquipment: {
    type: Boolean,
    default: false
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

const Equipment = mongoose.model('Equipment', equipmentSchema);

module.exports = Equipment; 
