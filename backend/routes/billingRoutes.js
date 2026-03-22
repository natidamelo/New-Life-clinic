const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator'); // Added validationResult

// Import controllers (you'll need to create these)
const billingController = require('../controllers/billingController');
const adminController = require('../controllers/adminController');

// Dashboard stats route
router.get('/stats', auth, checkRole('admin', 'finance'), billingController.getBillingStats);

// Financial summary routes
router.get('/financial-summary', auth, checkRole('admin', 'finance'), billingController.getFinancialSummary);
router.get('/aging-report', auth, checkRole('admin', 'finance'), billingController.getAgingReport);
router.get('/monthly-data', auth, checkRole('admin', 'finance'), billingController.getMonthlyData);
router.get('/revenue-by-service', auth, checkRole('admin', 'finance'), billingController.getRevenueByService);
router.get('/payment-methods', auth, checkRole('admin', 'finance'), billingController.getPaymentMethods);

// Unpaid card payments
router.get('/unpaid-card-payments', auth, checkRole('admin', 'finance', 'reception'), billingController.getUnpaidCardPayments);

// Get invoice by ID
router.get('/invoices/:invoiceId', auth, checkRole('admin', 'finance', 'reception'), async (req, res) => {
  try {
    const MedicalInvoice = require('../models/MedicalInvoice');
    const invoice = await MedicalInvoice.findById(req.params.invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch invoice',
      error: error.message 
    });
  }
});

// Payment processing route for invoices
router.post('/invoices/:invoiceId/payments',
  auth,
  checkRole('admin', 'reception', 'finance'),
  (req, res, next) => {
    console.log('🔍 [DEBUG] Payment route hit - invoiceId:', req.params.invoiceId);
    console.log('🔍 [DEBUG] Backend received payment request body:', JSON.stringify(req.body, null, 2));

    // Manual validation before express-validator
    const { amount, method, paymentMethod } = req.body;

    // Validate amount
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      console.log('🔍 [DEBUG] Amount validation failed:', { amount, type: typeof amount });
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be a positive number',
        errors: [{ field: 'amount', message: 'Payment amount must be a positive number' }],
        receivedData: req.body
      });
    }

    // Validate payment method
    const paymentMethodValue = method || paymentMethod;
    if (!paymentMethodValue || typeof paymentMethodValue !== 'string') {
      console.log('🔍 [DEBUG] Payment method validation failed:', { method, paymentMethod });
      return res.status(400).json({
        success: false,
        message: 'Payment method is required',
        errors: [{ field: 'paymentMethod', message: 'Payment method is required' }],
        receivedData: req.body
      });
    }

    // Normalize and validate payment method
    const validPaymentMethods = ['cash', 'card', 'bank_transfer', 'insurance', 'other'];
    const normalizedMethod = paymentMethodValue.toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
    const methodMap = {
      cash: 'cash',
      card: 'card',
      credit_card: 'card',
      debit_card: 'card',
      bank_transfer: 'bank_transfer',
      bank: 'bank_transfer',
      insurance: 'insurance',
      other: 'other'
    };

    const finalMethod = methodMap[normalizedMethod] || 'cash';

    if (!validPaymentMethods.includes(finalMethod)) {
      console.log('🔍 [DEBUG] Invalid payment method:', { original: paymentMethodValue, normalized: normalizedMethod, final: finalMethod });
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`,
        errors: [{ field: 'paymentMethod', message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}` }],
        receivedData: req.body
      });
    }

    // Set normalized values for controller
    req.body.paymentMethod = finalMethod;
    req.body.method = finalMethod;

    console.log('🔍 [DEBUG] Validation passed, calling controller with:', JSON.stringify(req.body, null, 2));
    next();
  },
  (req, res, next) => {
    // Call the controller
    billingController.addPaymentToInvoice(req, res, next);
  }
);

// Lab payment processing route
router.post('/process-lab-payment', 
  auth, 
  checkRole('admin', 'reception', 'finance'),
  (req, res, next) => {
    // Custom validation to handle frontend data variations
    const { labOrderIds, labOrderId, amount, amountPaid, paymentMethod, directPayment } = req.body;
    
    // Normalize lab order IDs
    let normalizedLabOrderIds = labOrderIds;
    if (!normalizedLabOrderIds && labOrderId) {
      normalizedLabOrderIds = Array.isArray(labOrderId) ? labOrderId : [labOrderId];
    }
    
    // Normalize amount
    const normalizedAmount = amount || amountPaid;
    
    // Validate required fields
    // For direct payments, lab order IDs are optional
    if (!directPayment && (!normalizedLabOrderIds || !Array.isArray(normalizedLabOrderIds) || normalizedLabOrderIds.length === 0)) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one lab order ID is required for non-direct payments' 
      });
    }
    
    if (!normalizedAmount || isNaN(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment amount must be a positive number' 
      });
    }
    
    if (!paymentMethod || typeof paymentMethod !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment method is required' 
      });
    }
    
    // Normalize the request body for the controller
    req.body.labOrderIds = normalizedLabOrderIds || [];
    req.body.amount = normalizedAmount;
    
    console.log('🔍 [billingRoutes] Calling processLabPayment with normalized data:', {
      labOrderIds: req.body.labOrderIds,
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod,
      directPayment: req.body.directPayment
    });
    
    // Set a timeout for the response
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        console.error('❌ [billingRoutes] Request timeout after 15 seconds');
        return res.status(408).json({
          success: false,
          message: 'Request timeout - payment processing took too long'
        });
      }
    }, 15000);
    
    try {
      billingController.processLabPayment(req, res, (err) => {
        clearTimeout(timeout);
        if (err) {
          console.error('❌ [billingRoutes] Error in processLabPayment:', err);
          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              message: 'Internal server error in payment processing',
              error: err.message
            });
          }
        }
        next(err);
      });
    } catch (error) {
      clearTimeout(timeout);
      console.error('❌ [billingRoutes] Error in processLabPayment:', error);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Internal server error in payment processing',
          error: error.message
        });
      }
    }
  }
);

module.exports = router; 
