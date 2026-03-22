const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
    index: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true,
  },
  amountPaid: {
    type: Number,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['Cash', 'Card', 'MobileMoney', 'Insurance', 'BankTransfer', 'OnlineGateway', 'Other'],
  },
  transactionDate: {
    type: Date,
    default: Date.now,
  },
  paymentGatewayId: { // For online payments
    type: String,
    trim: true,
  },
  referenceNumber: { // For card, bank, mobile money, cheque etc.
    type: String,
    trim: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['completed', 'pending', 'failed', 'refunded', 'partially_refunded'],
    default: 'completed',
    index: true,
  },
  notes: {
    type: String,
    trim: true,
  },
  processedBy: { // User ID of the staff who processed the payment
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  currency: {
    type: String,
    default: 'KES', // Consider making this configurable
  },
  relatedTransactionId: { // For refunds, to link to the original payment transaction
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentTransaction',
    default: null,
  }
}, { timestamps: true });

paymentTransactionSchema.index({ invoiceId: 1, status: 1 });
paymentTransactionSchema.index({ patientId: 1, transactionDate: -1 });

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);

module.exports = PaymentTransaction; 
