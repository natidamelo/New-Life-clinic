const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalInvoice',
    required: true,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'card', 'insurance', 'bank_transfer', 'other', 'Cash', 'Card', 'Insurance', 'Bank Transfer', 'Other'],
  },
  transactionId: {
    type: String,
    trim: true,
    sparse: true, // Allows nulls, but unique if present
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Payment', PaymentSchema); 

// TODO: Add post-save hook if needed to update Invoice status/amountPaid
// This is often handled in the service layer (billingService.js) instead
// to keep models focused on data structure.
// PaymentSchema.post('save', async function(doc, next) {
//   try {
//     const Invoice = mongoose.model('Invoice');
//     const invoice = await Invoice.findById(doc.invoice);
//     if (invoice) {
//       // Recalculate amountPaid on the invoice
//       // Update status if fully paid
//       // await invoice.save();
//     }
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

module.exports = mongoose.model('Payment', PaymentSchema); 

// TODO: Add post-save hook if needed to update Invoice status/amountPaid
// This is often handled in the service layer (billingService.js) instead
// to keep models focused on data structure.
// PaymentSchema.post('save', async function(doc, next) {
//   try {
//     const Invoice = mongoose.model('Invoice');
//     const invoice = await Invoice.findById(doc.invoice);
//     if (invoice) {
//       // Recalculate amountPaid on the invoice
//       // Update status if fully paid
//       // await invoice.save();
//     }
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

module.exports = mongoose.model('Payment', PaymentSchema); 

// TODO: Add post-save hook if needed to update Invoice status/amountPaid
// This is often handled in the service layer (billingService.js) instead
// to keep models focused on data structure.
// PaymentSchema.post('save', async function(doc, next) {
//   try {
//     const Invoice = mongoose.model('Invoice');
//     const invoice = await Invoice.findById(doc.invoice);
//     if (invoice) {
//       // Recalculate amountPaid on the invoice
//       // Update status if fully paid
//       // await invoice.save();
//     }
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

module.exports = mongoose.model('Payment', PaymentSchema); 
