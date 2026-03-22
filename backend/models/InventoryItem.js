const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { model } = require('mongoose');

// Transaction schema
const TransactionSchema = new Schema({
  type: {
    type: String,
    enum: ['add', 'remove'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  reference: {
    type: String
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Stock movement schema
const StockMovementSchema = new Schema({
  // ... existing code ...
});

// Inventory item schema
const InventoryItemSchema = new Schema({
  itemCode: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    required: true,
    enum: ['medication', 'supplies', 'equipment', 'laboratory', 'imaging', 'office', 'service', 'other'],
    index: true
  },
  unit: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  minimumStockLevel: {
    type: Number,
    default: 10,
    min: 0
  },
  reorderPoint: {
    type: Number,
    default: 20,
    min: 0
  },
  costPrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellingPrice: {
    type: Number,
    min: 0
  },
  location: {
    type: String
  },
  expiryDate: {
    type: Date
  },
  // Medication-specific fields
  dosage: {
    type: String
  },
  administrationRoute: {
    type: String
  },
  activeIngredient: {
    type: String
  },
  prescriptionRequired: {
    type: Boolean,
    default: false
  },
  manufacturer: {
    type: String
  },
  batchNumber: {
    type: String
  },
  // Lab-specific fields
  storageTemperature: {
    type: String
  },
  specimenType: {
    type: String
  },
  testType: {
    type: String
  },
  processTime: {
    type: String
  },
  // Additional fields
  supplier: {
    type: String
  },
  purchaseDate: {
    type: Date
  },
  expiryReminder: {
    type: Number,
    default: 30
  },
  minOrderQuantity: {
    type: Number,
    default: 1
  },
  notes: {
    type: String
  },
  customTags: {
    type: String
  },
  attachments: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  transactions: [TransactionSchema],
  stockMovements: [StockMovementSchema],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  minStock: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// -----------------------------
// Automatic price sync with Service
// Whenever an inventory item price changes, update the price of any Service that is linked to it.
InventoryItemSchema.post('save', async function(doc) {
  try {
    const Service = require('./Service');
    // Find services that reference this inventory item
    const services = await Service.find({ linkedInventoryItems: doc._id }).select('price name');
    if (!services.length) return;

    // Update each service price if different
    for (const service of services) {
      if (service.price !== doc.sellingPrice) {
        service.price = doc.sellingPrice;
        await service.save();
        console.log(`[InventoryItem] Synced price for service ${service.name} to ${doc.sellingPrice}`);
      }
    }
  } catch (err) {
    console.error('Error syncing service price with inventory item:', err.message);
  }
});

// Virtual for checking if item is low on stock
InventoryItemSchema.virtual('isLowStock').get(function() {
  return this.quantity <= this.minimumStockLevel;
});

// Virtual for checking if item needs reordering
InventoryItemSchema.virtual('needsReorder').get(function() {
  return this.quantity <= this.reorderPoint && this.quantity > this.minimumStockLevel;
});

// Add updateStock method to InventoryItemSchema
InventoryItemSchema.methods.updateStock = async function(quantity, type, userId) {
  if (!['add', 'remove', 'set'].includes(type)) {
    throw new Error('Invalid stock update type');
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Quantity must be a positive integer');
  }
  const previousQuantity = this.quantity;
  let newQuantity;

  if (type === 'add') {
    newQuantity = previousQuantity + quantity;
  } else if (type === 'remove') {
    if (previousQuantity < quantity) {
      throw new Error(`Not enough stock to remove. Available: ${previousQuantity}`);
    }
    newQuantity = previousQuantity - quantity;
  } else if (type === 'set') {
    newQuantity = quantity;
  }

  this.quantity = newQuantity;
  this.updatedBy = userId;
  this.updatedAt = Date.now();
  await this.save();
  return this;
};

module.exports = mongoose.model('InventoryItem', InventoryItemSchema); 
