const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  clinicId:       { type: String, required: true, default: 'new-life', index: true },
  name:           { type: String, required: true, trim: true },          // Lender / Purpose
  principal:      { type: Number, required: true, min: 0 },
  annualRate:     { type: Number, required: true, min: 0 },              // Annual interest %
  termMonths:     { type: Number, required: true, min: 1 },              // Total term in months
  monthlyPayment: { type: Number, required: true, min: 0 },
  totalRepayment: { type: Number, required: true, min: 0 },
  totalInterest:  { type: Number, required: true, min: 0 },
  startDate:      { type: Date,   required: true, default: Date.now },
  paidMonths:     { type: Number, default: 0, min: 0 },
  isActive:       { type: Boolean, default: true, index: true },
}, { timestamps: true });

loanSchema.index({ clinicId: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Loan', loanSchema);
