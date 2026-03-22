const express = require('express');
const router = express.Router();
const {
  recordPayment,
  getPaymentsByInvoice,
  getPaymentsByPatient
} = require('../controllers/paymentController');

const { auth, checkRole } = require('../middleware/auth');
const protect = auth;

// Record a new payment
router.post('/', 
  (req, res, next) => {
    console.log('DEBUG: paymentRoutes.js - POST / - typeof protect:', typeof protect);
    if (typeof protect !== 'function') {
      console.error('CRITICAL: protect is not a function before route execution!');
      return res.status(500).json({ error: "Server middleware configuration error" });
    }
    next();
  },
  protect, 
  checkRole('admin', 'finance', 'reception'), 
  recordPayment
);

// Get all payments for a specific invoice
router.get('/invoice/:invoiceId', protect, checkRole('admin', 'finance', 'reception', 'doctor'), getPaymentsByInvoice);

// Get all payments for a specific patient
router.get('/patient/:patientId', protect, checkRole('admin', 'finance', 'reception', 'doctor', 'patient'), getPaymentsByPatient);

// TODO:
// router.get('/:id', protect, authorize([...]), getPaymentById);
// router.put('/:id', protect, authorize([...]), updatePayment);
// router.post('/refund', protect, authorize([...]), processRefund);

module.exports = router; 
