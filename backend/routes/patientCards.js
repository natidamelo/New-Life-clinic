const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const patientCardController = require('../controllers/patientCardController');
const Patient = require('../models/Patient');
const { auth, checkRole, checkPermission } = require('../middleware/auth');
const asyncHandler = require('../middleware/async');
const { body, validationResult } = require('express-validator');

// Resolve patient: accept MongoDB _id or patientId string (e.g. P74286-4286)
const resolvePatientId = async (req, res, next) => {
  const raw = req.body.patient;
  if (!raw) return next();
  const isMongoId = mongoose.Types.ObjectId.isValid(raw) && String(new mongoose.Types.ObjectId(raw)) === raw;
  if (isMongoId) return next();
  const doc = await Patient.findOne({ patientId: String(raw) }).select('_id').lean();
  if (!doc) {
    return res.status(400).json({ errors: [{ msg: 'Patient not found by ID or patientId', param: 'patient', location: 'body' }] });
  }
  req.body.patient = doc._id.toString();
  next();
};

// Normalize card type from API (e.g. "basic", "Standard", "Gold") to PatientCard enum
const normalizeCardType = (value) => {
  if (!value || typeof value !== 'string') return 'Basic';
  const v = value.trim().toLowerCase();
  const map = { basic: 'Basic', standard: 'Basic', premium: 'Premium', vip: 'VIP', family: 'Family', gold: 'Premium' };
  return map[v] || 'Basic';
};

// Validation middleware for create patient card
const validatePatientCard = [
  body('patient').isMongoId().withMessage('Valid patient ID is required'),
  body('type')
    .trim()
    .customSanitizer(normalizeCardType)
    .isIn(['Basic', 'Premium', 'VIP', 'Family'])
    .withMessage('Invalid card type; use Basic, Premium, VIP, or Family'),
  body('amountPaid').optional().toFloat(),
  body('amount').optional().toFloat(),
  body('paymentMethod').isIn(['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Insurance', 'Mobile Money']).withMessage('Invalid payment method'),
  (req, res, next) => {
    // Allow either amount or amountPaid for create (frontend may send either)
    const amount = req.body.amountPaid ?? req.body.amount;
    if (amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ errors: [{ msg: 'Amount paid is required', param: 'amountPaid', location: 'body' }] });
    }
    const num = Number(amount);
    if (Number.isNaN(num) || num < 0) {
      return res.status(400).json({ errors: [{ msg: 'Amount paid must be a positive number', param: 'amountPaid', location: 'body' }] });
    }
    req.body.amountPaid = num;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Get all patient cards
router.get('/', auth, asyncHandler(patientCardController.getPatientCards));

// Get patient card by ID
router.get('/:id', auth, asyncHandler(patientCardController.getPatientCardById));

// Create new patient card (reception + finance allowed via checkPermission bypass)
router.post(
  '/',
  auth,
  checkPermission('manageBilling'),
  asyncHandler(resolvePatientId),
  ...validatePatientCard,
  asyncHandler(patientCardController.createPatientCard)
);

// Renew patient card: creates PENDING invoice only; payment is processed in Billing, then card activates.
router.post(
  '/:id/renew',
  auth,
  checkPermission('manageBilling'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('amountPaid').optional().isFloat({ min: 0 }).withMessage('Amount paid must be a positive number'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!req.body.amount && !req.body.amountPaid) {
      errors.errors.push({ param: 'amount', msg: 'Either amount or amountPaid must be provided', location: 'body' });
    }
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  asyncHandler(patientCardController.renewPatientCard)
);

// Cancel patient card (reception + finance allowed via checkPermission bypass)
router.post(
  '/:id/cancel',
  auth,
  checkPermission('manageBilling'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  asyncHandler(patientCardController.cancelPatientCard)
);

// Check all cards for expiry (typically run by scheduled job)
router.post(
  '/check-expiry',
  auth,
  checkRole('admin'),
  asyncHandler(patientCardController.checkAllCardsExpiry)
);

// Process card payment from notification (ROOT CAUSE FIX)
router.post(
  '/process-payment/:notificationId',
  auth,
  body('amountPaid').isFloat({ min: 0 }).withMessage('Amount paid must be a positive number'),
  body('paymentMethod').isIn(['cash', 'credit_card', 'debit_card', 'insurance', 'bank_transfer']).withMessage('Invalid payment method'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  asyncHandler(patientCardController.processCardPayment)
);

module.exports = router; 
