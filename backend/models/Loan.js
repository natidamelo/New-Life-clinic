const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  lender: { type: String, trim: true },
  principal: { type: Number, required: true, min: 0 },
  interestRate: { type: Number, required: true, min: 0 }, // Annual %
  monthlyPayment: { type: Number, required: true, min: 0 },
  remainingBalance: { type: Number, required: true, min: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  status: { type: String, enum: ['active', 'paid_off', 'defaulted'], default: 'active', index: true },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

loanSchema.index({ status: 1, startDate: -1 });

module.exports = mongoose.model('Loan', loanSchema);
