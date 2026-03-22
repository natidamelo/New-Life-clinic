const mongoose = require('mongoose');

const billingInvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  dateIssued: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'partial', 'overdue', 'cancelled'],
    default: 'pending'
  },
  items: [{
    service: {
      type: String,
      required: true
    },
    description: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  payments: [{
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    method: {
      type: String,
      enum: ['cash', 'credit', 'debit', 'insurance', 'other'],
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    reference: String,
    notes: String
  }],
  notes: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Virtual for balance due
billingInvoiceSchema.virtual('balanceDue').get(function() {
  const totalPayments = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return this.total - totalPayments;
});

// Add method to add a payment
billingInvoiceSchema.methods.addPayment = function(paymentData) {
  this.payments.push(paymentData);
  
  // Update status based on payment
  const totalPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  if (totalPaid >= this.total) {
    this.status = 'paid';
  } else if (totalPaid > 0) {
    this.status = 'partial';
  }
  
  return this.save();
};

const BillingInvoice = mongoose.model('BillingInvoice', billingInvoiceSchema);

module.exports = BillingInvoice; 
