const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const multer = require('multer');
const {
  createMedicalCertificate,
  getMedicalCertificates,
  getMedicalCertificateById,
  updateMedicalCertificate,
  deleteMedicalCertificate,
  getPatientCertificates,
  getDoctorCertificates,
  getCertificateStats,
  generatePrintableCertificate
} = require('../controllers/medicalCertificateController');
const { auth } = require('../middleware/auth');

// Configure multer for signature uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/signatures';
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const path = require('path');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'signature-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for signatures'), false);
    }
  }
});

// Apply authentication middleware to all routes
router.use(auth);

// Validation rules
const createCertificateValidation = [
  body('patientId').isMongoId().withMessage('Valid patient ID is required'),
  body('patientName').notEmpty().withMessage('Patient name is required'),
  body('patientAge').isInt({ min: 0, max: 150 }).withMessage('Valid patient age is required'),
  body('patientGender').isIn(['Male', 'Female', 'Other']).withMessage('Valid gender is required'),
  body('patientAddress').notEmpty().withMessage('Patient address is required'),
  body('diagnosis').notEmpty().withMessage('Diagnosis is required'),
  body('certificateType').optional().isIn(['Medical Certificate', 'Sick Leave Certificate', 'Fitness Certificate', 'Treatment Certificate']),
  body('validFrom').optional().isISO8601().withMessage('Valid from date must be in ISO format'),
  body('validUntil').optional().isISO8601().withMessage('Valid until date must be in ISO format'),
  body('followUpDate').optional().isISO8601().withMessage('Follow-up date must be in ISO format')
];

const updateCertificateValidation = [
  param('id').isMongoId().withMessage('Valid certificate ID is required'),
  body('patientName').optional().notEmpty().withMessage('Patient name cannot be empty'),
  body('patientAge').optional().isInt({ min: 0, max: 150 }).withMessage('Valid patient age is required'),
  body('patientGender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Valid gender is required'),
  body('diagnosis').optional().notEmpty().withMessage('Diagnosis cannot be empty'),
  body('certificateType').optional().isIn(['Medical Certificate', 'Sick Leave Certificate', 'Fitness Certificate', 'Treatment Certificate']),
  body('validFrom').optional().isISO8601().withMessage('Valid from date must be in ISO format'),
  body('validUntil').optional().isISO8601().withMessage('Valid until date must be in ISO format'),
  body('followUpDate').optional().isISO8601().withMessage('Follow-up date must be in ISO format')
];

const idValidation = [
  param('id').isMongoId().withMessage('Valid certificate ID is required')
];

const patientIdValidation = [
  param('patientId').isMongoId().withMessage('Valid patient ID is required')
];

const doctorIdValidation = [
  param('doctorId').isMongoId().withMessage('Valid doctor ID is required')
];

// Routes

/**
 * @route   POST /api/medical-certificates
 * @desc    Create a new medical certificate
 * @access  Private (Doctor)
 */
router.post('/', upload.single('digitalSignature'), createCertificateValidation, createMedicalCertificate);

/**
 * @route   GET /api/medical-certificates
 * @desc    Get all medical certificates with pagination and filtering
 * @access  Private (Doctor/Admin)
 */
router.get('/', getMedicalCertificates);

/**
 * @route   GET /api/medical-certificates/stats
 * @desc    Get medical certificate statistics
 * @access  Private (Doctor/Admin)
 */
router.get('/stats', getCertificateStats);

/**
 * @route   GET /api/medical-certificates/print/:id
 * @desc    Generate printable certificate data
 * @access  Private (Doctor)
 */
router.get('/print/:id', idValidation, generatePrintableCertificate);

/**
 * @route   GET /api/medical-certificates/:id
 * @desc    Get a single medical certificate by ID
 * @access  Private (Doctor)
 */
router.get('/:id', idValidation, getMedicalCertificateById);

/**
 * @route   PUT /api/medical-certificates/:id
 * @desc    Update a medical certificate
 * @access  Private (Doctor)
 */
router.put('/:id', updateCertificateValidation, updateMedicalCertificate);

/**
 * @route   DELETE /api/medical-certificates/:id
 * @desc    Delete (cancel) a medical certificate
 * @access  Private (Doctor)
 */
router.delete('/:id', idValidation, deleteMedicalCertificate);

/**
 * @route   GET /api/medical-certificates/patient/:patientId
 * @desc    Get medical certificates for a specific patient
 * @access  Private (Doctor)
 */
router.get('/patient/:patientId', patientIdValidation, getPatientCertificates);

/**
 * @route   GET /api/medical-certificates/doctor/:doctorId
 * @desc    Get medical certificates by a specific doctor
 * @access  Private (Doctor/Admin)
 */
router.get('/doctor/:doctorId', doctorIdValidation, getDoctorCertificates);

module.exports = router;
