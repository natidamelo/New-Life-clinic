const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  createReferral,
  getReferrals,
  getReferralById,
  updateReferral,
  deleteReferral,
  getPatientReferrals,
  getDoctorReferrals,
  getReferralStats,
  generatePrintableReferral
} = require('../controllers/referralController');
const { auth } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(auth);

// Validation rules
const createReferralValidation = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('patientName').notEmpty().trim().withMessage('Patient name is required'),
  body('patientAge').isInt({ min: 0 }).withMessage('Valid patient age is required'),
  body('patientGender').isIn(['Male', 'Female', 'Other']).withMessage('Valid gender is required'),
  body('referredToDoctorName').notEmpty().trim().withMessage('Referred to doctor name is required'),
  body('referredToClinic').notEmpty().trim().withMessage('Referred to clinic is required'),
  body('chiefComplaint').notEmpty().trim().withMessage('Chief complaint is required'),
  body('diagnosis').notEmpty().trim().withMessage('Diagnosis is required'),
  body('reasonForReferral').notEmpty().trim().withMessage('Reason for referral is required'),
  body('urgency').optional().isIn(['routine', 'urgent', 'emergency']).withMessage('Valid urgency level is required')
];

const updateReferralValidation = [
  param('id').isMongoId().withMessage('Valid referral ID is required')
];

// Routes

/**
 * @route   GET /api/referrals
 * @desc    Get all referrals with pagination and filtering
 * @access  Private
 */
router.get('/', getReferrals);

/**
 * @route   GET /api/referrals/stats
 * @desc    Get referral statistics
 * @access  Private
 */
router.get('/stats', getReferralStats);

/**
 * @route   GET /api/referrals/patient/:patientId
 * @desc    Get referrals for a specific patient
 * @access  Private
 */
router.get('/patient/:patientId', [
  param('patientId').isMongoId().withMessage('Valid patient ID is required')
], getPatientReferrals);

/**
 * @route   GET /api/referrals/doctor/:doctorId
 * @desc    Get referrals by doctor
 * @access  Private
 */
router.get('/doctor/:doctorId', [
  param('doctorId').isMongoId().withMessage('Valid doctor ID is required')
], getDoctorReferrals);

/**
 * @route   GET /api/referrals/:id
 * @desc    Get a single referral by ID
 * @access  Private
 */
router.get('/:id', [
  param('id').isMongoId().withMessage('Valid referral ID is required')
], getReferralById);

/**
 * @route   GET /api/referrals/:id/print
 * @desc    Generate printable referral data
 * @access  Private
 */
router.get('/:id/print', [
  param('id').isMongoId().withMessage('Valid referral ID is required')
], generatePrintableReferral);

/**
 * @route   POST /api/referrals
 * @desc    Create a new referral
 * @access  Private
 */
router.post('/', createReferralValidation, createReferral);

/**
 * @route   PUT /api/referrals/:id
 * @desc    Update a referral
 * @access  Private
 */
router.put('/:id', updateReferralValidation, updateReferral);

/**
 * @route   DELETE /api/referrals/:id
 * @desc    Delete (cancel) a referral
 * @access  Private
 */
router.delete('/:id', [
  param('id').isMongoId().withMessage('Valid referral ID is required')
], deleteReferral);

module.exports = router;

