const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CardTypeSchema = new Schema({
  clinicId: {
    type: String,
    required: true,
    default: 'default'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  value: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  validityMonths: {
    type: Number,
    required: true,
    min: 1
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

CardTypeSchema.index({ clinicId: 1, name: 1 }, { unique: true });
CardTypeSchema.index({ clinicId: 1, value: 1 }, { unique: true });

const CardType = mongoose.model('CardType', CardTypeSchema);

module.exports = CardType; 
