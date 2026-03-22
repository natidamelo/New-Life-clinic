const mongoose = require('mongoose');

const OperatingExpenseSchema = new mongoose.Schema({
  description: { type: String, required: true },
  category: {
    type: String,
    enum: ['rent', 'salary', 'overtime', 'utilities', 'maintenance', 'other'],
    default: 'other'
  },
  amount: { type: Number, required: true, min: 0 },
  expenseDate: { type: Date, default: Date.now },
  /** If true, this expense is applied every month in report period (e.g. rent, salary). One entry covers all months. */
  recurring: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('OperatingExpense', OperatingExpenseSchema); 
