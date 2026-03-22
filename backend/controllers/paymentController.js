const PaymentTransaction = require('../models/PaymentTransaction');
const MedicalInvoice = require('../models/MedicalInvoice');
const mongoose = require('mongoose');

// @desc    Record a new payment for an invoice
// @route   POST /api/payments
// @access  Private (Finance, Reception)
exports.recordPayment = async (req, res) => {
  console.log('🎯 [PaymentController] Payment request received');
  console.log('📦 [PaymentController] Request body:', req.body);
  console.log('👤 [PaymentController] User:', req.user);
  
  try {
    const {
      invoiceId,
      patientId,
      amountPaid,
      paymentMethod,
      transactionDate,
      paymentGatewayId,
      referenceNumber,
      notes,
      currency
    } = req.body;

    const processedBy = req.user?.id || req.user?._id; // Handle both id and _id
    console.log('🔑 [PaymentController] ProcessedBy:', processedBy);

    if (!invoiceId || !patientId || !amountPaid || !paymentMethod || !processedBy) {
      return res.status(400).json({ message: 'Missing required payment details.' });
    }

    const invoice = await MedicalInvoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    // Basic check for overpayment - more sophisticated checks can be added
    if (invoice.amountPaid + parseFloat(amountPaid) > invoice.totalAmount + 0.001) { // Add a small tolerance for float precision
        // Allow overpayment but flag it or handle as per business logic.
        // For now, we'll proceed but one might want to create a credit note or alert.
        console.warn(`Overpayment attempt on invoice ${invoiceId}. Total: ${invoice.totalAmount}, Paid: ${invoice.amountPaid}, Current Payment: ${amountPaid}`);
    }

    // Rule: Card payments must be for the full amount
    if (paymentMethod === 'card' || paymentMethod === 'credit_card' || paymentMethod === 'debit_card') {
      if (parseFloat(amountPaid) < invoice.totalAmount - invoice.amountPaid - 0.001) {
        return res.status(400).json({ message: 'Card payments must be for the full outstanding amount.' });
      }
    }

    const paymentTransaction = new PaymentTransaction({
      invoiceId,
      patientId,
      amountPaid: parseFloat(amountPaid),
      paymentMethod,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      paymentGatewayId,
      referenceNumber,
      notes,
      processedBy,
      currency: currency || invoice.currency || 'KES',
      status: 'Completed', // Default to completed, can be adjusted based on paymentMethod (e.g. 'Pending' for Insurance)
    });

    await paymentTransaction.save();

    // Update invoice
    invoice.amountPaid += parseFloat(amountPaid);

    // The pre-save hook in Invoice.js will now handle balance and status updates correctly.
    // We just need to ensure amountPaid is set.
    // if (invoice.amountPaid >= invoice.totalAmount - 0.001) { 
    //   invoice.status = 'Paid'; // Corrected from paymentStatus to status
    // } else if (invoice.amountPaid > 0) {
    //   invoice.status = 'PartiallyPaid'; // Corrected from paymentStatus to status
    // } else {
    //   invoice.status = 'Unpaid'; // Corrected from paymentStatus to status
    // }
    
    await invoice.save();

    res.status(201).json({
      message: 'Payment recorded successfully.',
      paymentTransaction,
      updatedInvoice: invoice
    });

  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ message: 'Failed to record payment.', error: error.message });
  }
};

// @desc    Get all payments for a specific invoice
// @route   GET /api/payments/invoice/:invoiceId
// @access  Private
exports.getPaymentsByInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        return res.status(400).json({ message: 'Invalid invoice ID format.' });
    }

    const payments = await PaymentTransaction.find({ invoiceId }).populate('processedBy', 'firstName lastName');
    
    if (!payments) {
      return res.status(404).json({ message: 'No payments found for this invoice.' });
    }
    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching payments by invoice:', error);
    res.status(500).json({ message: 'Failed to fetch payments.', error: error.message });
  }
};

// @desc    Get all payments for a specific patient
// @route   GET /api/payments/patient/:patientId
// @access  Private
exports.getPaymentsByPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
     if (!mongoose.Types.ObjectId.isValid(patientId)) {
        return res.status(400).json({ message: 'Invalid patient ID format.' });
    }

    const payments = await PaymentTransaction.find({ patientId })
      .populate('processedBy', 'firstName lastName')
      .populate('invoiceId', 'invoiceNumber totalAmount paymentStatus') // Populate some invoice details
      .sort({ transactionDate: -1 });
    
    if (!payments) {
      return res.status(404).json({ message: 'No payments found for this patient.' });
    }
    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching payments by patient:', error);
    res.status(500).json({ message: 'Failed to fetch payments.', error: error.message });
  }
};

// TODO:
// - Get a single payment transaction by ID
// - Update a payment transaction (e.g., status for pending insurance)
// - Handle refunds (create a 'Refunded' transaction linked to the original) 
