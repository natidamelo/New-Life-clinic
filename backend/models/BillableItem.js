const mongoose = require('mongoose');

const BillableItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  type: { type: String, enum: ['service', 'lab', 'medication', 'imaging', 'supply', 'procedure', 'other'], default: 'service' },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('BillableItem', BillableItemSchema); 
