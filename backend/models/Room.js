const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
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
  floor: {
    type: String,
    required: true,
    trim: true
  },
  building: {
    type: String,
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    required: true,
    enum: ['available', 'occupied', 'maintenance', 'cleaning'],
    default: 'available'
  },
  equipmentList: [{
    type: String,
    trim: true
  }],
  notes: {
    type: String,
    trim: true
  },
  lastCleaned: {
    type: Date
  },
  lastMaintenance: {
    type: Date
  },
  lastInspection: {
    type: Date
  },
  scheduledMaintenance: {
    type: Date
  },
  accessibilityFeatures: [{
    type: String,
    trim: true
  }],
  specialPurpose: {
    type: String,
    trim: true
  },
  squareFootage: {
    type: Number,
    min: 0
  },
  maxOccupancyTime: {
    type: Number,
    default: 0,
    description: "Maximum recommended occupancy time in hours, 0 means no limit"
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

const Room = mongoose.model('Room', roomSchema);

module.exports = Room; 
