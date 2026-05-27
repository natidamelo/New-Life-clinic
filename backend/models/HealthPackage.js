const mongoose = require('mongoose');

const healthPackageSchema = new mongoose.Schema({
  clinicId: {
    type: String,
    required: true,
    default: 'default',
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  total_visits: {
    type: Number,
    required: true,
    min: 1
  },
  validity_days: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  services: [{
    type: String,
    trim: true
  }],
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HealthPackage', healthPackageSchema);
