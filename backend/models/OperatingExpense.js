const mongoose = require('mongoose');

const OperatingExpenseSchema = new mongoose.Schema({
  clinicId: { type: String, required: true, default: 'default' },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['rent', 'salary', 'overtime', 'utilities', 'maintenance', 'inventory-loss', 'other'],
    default: 'other'
  },
  amount: { type: Number, required: true, min: 0 },
  expenseDate: { type: Date, default: Date.now },
  /** If true, this expense is applied every month in report period (e.g. rent, salary). One entry covers all months. */
  recurring: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Inventory loss traceability fields (only populated when category = 'inventory-loss')
  inventoryItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
  adjustmentType: { type: String, enum: ['damaged', 'expired', 'broken', 'lost', 'correction', 'return', 'count-discrepancy', 'other'] },
  inventoryTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryTransaction' }
}, { timestamps: true });

OperatingExpenseSchema.index({ clinicId: 1 });
OperatingExpenseSchema.index({ expenseDate: -1 });
OperatingExpenseSchema.index({ recurring: 1, expenseDate: -1 });

module.exports = mongoose.model('OperatingExpense', OperatingExpenseSchema); 
