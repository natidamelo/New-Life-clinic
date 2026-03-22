const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema for inventory transactions
const InventoryTransactionSchema = new Schema({
  // Core transaction details
  transactionType: {
    type: String,
    enum: ['purchase', 'sale', 'adjustment', 'return', 'transfer', 'expired', 'damaged', 'medical-use', 'prescription'],
    required: true,
    index: true
  },
  item: {
    type: Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true
  },
  unitCost: {
    type: Number
  },
  totalCost: {
    type: Number
  },
  batchNumber: {
    type: String
  },
  expiryDate: {
    type: Date
  },
  
  // Status tracking
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  
  // Location details (for transfers)
  sourceLocation: {
    type: String
  },
  destinationLocation: {
    type: String
  },
  
  // References to medical context
  medicalRecord: {
    type: Schema.Types.ObjectId,
    ref: 'MedicalRecord',
    index: true
  },
  visit: {
    type: Schema.Types.ObjectId,
    ref: 'Visit',
    index: true
  },
  patient: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    index: true
  },
  prescription: {
    type: Schema.Types.ObjectId,
    ref: 'Prescription',
    index: true
  },
  
  // Financial references
  invoice: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
    index: true
  },
  
  // Context and documentation
  reason: {
    type: String,
    required: true
  },
  notes: {
    type: String
  },
  documentReference: {
    type: String // Purchase order, invoice, or other references
  },
  
  // Audit trail
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'on-hold'],
    default: 'completed',
    index: true
  },
  
  // Internal flag to skip automatic inventory updates (used by hooks)
  _skipInventoryUpdate: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Virtual for calculating total cost if not provided
InventoryTransactionSchema.pre('save', function(next) {
  if (this.quantity && this.unitCost && !this.totalCost) {
    this.totalCost = this.quantity * this.unitCost;
  }
  next();
});

// Method to reverse a transaction
InventoryTransactionSchema.methods.reverseTransaction = async function(userId, reason) {
  // Create a new transaction that reverses this one
  const reversalTransaction = new this.constructor({
    transactionType: 'adjustment',
    item: this.item,
    quantity: -this.quantity, // Negative to reverse
    previousQuantity: await getCurrentQuantity(this.item),
    // Calculate new quantity by reversing the effect
    reason: reason || `Reversal of transaction ${this._id}`,
    performedBy: userId,
    medicalRecord: this.medicalRecord,
    visit: this.visit,
    patient: this.patient,
    prescription: this.prescription,
    invoice: this.invoice,
    status: 'completed'
  });
  
  // Update the inventory item quantity
  await updateItemQuantity(reversalTransaction);
  
  // Save the reversal transaction
  await reversalTransaction.save();
  
  // Mark this transaction as cancelled
  this.status = 'cancelled';
  await this.save();
  
  return reversalTransaction;
};

// Helper function to get current quantity of an item
async function getCurrentQuantity(itemId) {
  const InventoryItem = mongoose.model('InventoryItem');
  const item = await InventoryItem.findById(itemId);
  return item ? item.quantity : 0;
}

// Helper function to update item quantity
async function updateItemQuantity(transaction) {
  const InventoryItem = mongoose.model('InventoryItem');
  
  const item = await InventoryItem.findById(transaction.item);
  if (!item) {
    throw new Error(`Inventory item not found: ${transaction.item}`);
  }
  
  transaction.newQuantity = item.quantity + transaction.quantity;
  // Prevent negative stock unless allowed
  if (transaction.newQuantity < 0) {
    throw new Error(`Transaction would result in negative stock for item: ${item.name}`);
  }
  
  item.quantity = transaction.newQuantity;
  await item.save();
}

// Middleware to update inventory item quantity on save
InventoryTransactionSchema.pre('save', async function(next) {
  // ✅ FIX: Skip if _skipInventoryUpdate flag is set (inventory already updated manually)
  if (this._skipInventoryUpdate) {
    console.log(`⏭️  [INVENTORY TRANSACTION] Skipping automatic inventory update (already done manually)`);
    return next();
  }
  
  // Only update quantity for new transactions that are not part of a session
  // (session-based transactions handle inventory updates manually)
  if (this.isNew && this.status === 'completed' && !this.$session()) {
    try {
      console.log(`📦 [INVENTORY TRANSACTION] Auto-updating inventory via hook`);
      await updateItemQuantity(this);
      next();
    } catch (error) {
      next(error);
    }
  } else if (this.isNew && this.status === 'pending' && !this.$session()) {
    // For pending transactions, we'll handle the quantity update manually in the application logic
    next();
  } else {
    next();
  }
});

// Method to create a prescription-related transaction
InventoryTransactionSchema.statics.createPrescriptionTransaction = async function(prescriptionData, userData) {
  const InventoryItem = mongoose.model('InventoryItem');
  
  // Find the inventory item
  const inventoryItem = await InventoryItem.findById(prescriptionData.medication);
  if (!inventoryItem) {
    throw new Error(`Medication not found in inventory: ${prescriptionData.medication}`);
  }
  
  // Check if we have enough stock
  if (inventoryItem.quantity < prescriptionData.quantity) {
    throw new Error(`Insufficient stock for ${inventoryItem.name}. Available: ${inventoryItem.quantity}, Requested: ${prescriptionData.quantity}`);
  }
  
  // Create the transaction
  const transaction = new this({
    transactionType: 'prescription',
    item: prescriptionData.medication,
    quantity: -prescriptionData.quantity, // Negative because it's being dispensed
    unitCost: inventoryItem.purchasePrice || 0,
    totalCost: (inventoryItem.purchasePrice || 0) * prescriptionData.quantity,
    previousQuantity: inventoryItem.quantity,
    newQuantity: inventoryItem.quantity - prescriptionData.quantity,
    reason: `Prescription dispensed for patient ID: ${prescriptionData.patient}`,
    notes: prescriptionData.instructions || '',
    documentReference: `Prescription ID: ${prescriptionData._id}`,
    performedBy: userData._id,
    patient: prescriptionData.patient,
    prescription: prescriptionData._id,
    medicalRecord: prescriptionData.medicalRecord,
    status: 'completed'
  });
  
  // Save the transaction (which will also update the inventory item quantity)
  await transaction.save();
  
  return transaction;
};

// Create compound indexes for common queries
InventoryTransactionSchema.index({ item: 1, createdAt: -1 });
InventoryTransactionSchema.index({ transactionType: 1, createdAt: -1 });
InventoryTransactionSchema.index({ patient: 1, createdAt: -1 });
InventoryTransactionSchema.index({ performedBy: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryTransaction', InventoryTransactionSchema); 
