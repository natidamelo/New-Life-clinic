const { body, validationResult, param, query } = require('express-validator');
const { ApiError } = require('./errorHandler');

/**
 * Process validation results and format errors
 */
const processValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (errors.isEmpty()) {
    return next();
  }
  
  // Format validation errors
  const formattedErrors = errors.array().map(error => ({
    field: error.param,
    message: error.msg,
    value: error.value
  }));
  
  // Create and pass ApiError to error handler middleware
  const errorMessage = 'Validation failed';
  const apiError = new ApiError(400, errorMessage);
  apiError.errors = formattedErrors;
  
  next(apiError);
};

/**
 * Common validation rules for reuse
 */
const validationRules = {
  // User validation
  username: body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
    
  email: body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
    
  role: body('role')
    .isIn(['admin', 'reception', 'nurse', 'lab', 'imaging', 'doctor', 'billing', 'inventory'])
    .withMessage('Invalid role specified'),
    
  // ID validation
  id: param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
    
  patientId: param('patientId')
    .isMongoId()
    .withMessage('Invalid patient ID format'),
    
  // Patient validation  
  firstName: body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
    
  lastName: body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
    
  phone: body('phone')
    .optional()
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage('Please provide a valid phone number'),
    
  // Date validation
  date: body('date')
    .isISO8601()
    .withMessage('Please provide a valid date in ISO format (YYYY-MM-DD)'),
    
  // Pagination
  page: query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
    
  limit: query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
    
  // Medical Record validation
  patientIdBody: body('patient')
    .isMongoId()
    .withMessage('Valid patient ID is required'),
    
  visitId: body('visit')
    .optional()
    .isMongoId()
    .withMessage('Visit ID must be a valid MongoDB ObjectId if provided'),
    
  chiefComplaint: [
    body('chiefComplaint.description')
      .notEmpty()
      .withMessage('Chief complaint description is required')
      .trim(),
    body('chiefComplaint.duration')
      .optional()
      .trim(),
    body('chiefComplaint.severity')
      .optional()
      .isIn(['Mild', 'Moderate', 'Severe', 'Very Severe'])
      .withMessage('Invalid severity level'),
    body('chiefComplaint.onsetPattern')
      .optional()
      .isIn(['Acute', 'Subacute', 'Chronic', 'Gradual', 'Sudden'])
      .withMessage('Invalid onset pattern'),
    body('chiefComplaint.progression')
      .optional()
      .isIn(['Improving', 'Stable', 'Worsening', 'Fluctuating'])
      .withMessage('Invalid progression status'),
    body('chiefComplaint.location')
      .optional()
      .trim(),
    body('chiefComplaint.aggravatingFactors')
      .optional()
      .isArray()
      .withMessage('Aggravating factors must be an array'),
    body('chiefComplaint.relievingFactors')
      .optional()
      .isArray()
      .withMessage('Relieving factors must be an array'),
    body('chiefComplaint.associatedSymptoms')
      .optional()
      .isArray()
      .withMessage('Associated symptoms must be an array'),
    body('chiefComplaint.impactOnDailyLife')
      .optional()
      .isIn(['None', 'Mild', 'Moderate', 'Severe', ''])
      .withMessage('Invalid impact level'),
    body('chiefComplaint.previousEpisodes')
      .optional()
      .isBoolean()
      .withMessage('Previous episodes must be a boolean'),
    body('chiefComplaint.previousEpisodesDetails')
      .optional()
      .trim()
  ],
  
  diagnosis: body('diagnosis')
    .optional()
    .isString()
    .withMessage('Diagnosis must be a string'),
    
  vitalSigns: body('vitalSigns')
    .optional()
    .isObject()
    .withMessage('Vital signs must be an object'),
    
  plan: body('plan')
    .optional()
    .isString()
    .withMessage('Plan must be a string')
    .trim(),
    
  notes: body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .trim()
};

/**
 * Validation chains for common operations
 */
const validate = {
  user: {
    create: [
      validationRules.username,
      validationRules.email,
      validationRules.password,
      validationRules.role,
      validationRules.firstName,
      validationRules.lastName,
      processValidationErrors
    ],
    
    update: [
      validationRules.id,
      body('username').optional().trim().isLength({ min: 3, max: 30 }),
      body('email').optional().trim().isEmail().normalizeEmail(),
      body('password').optional().isLength({ min: 6 }),
      body('role').optional().isIn(['admin', 'reception', 'nurse', 'lab', 'imaging', 'doctor', 'billing', 'inventory']),
      body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
      body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
      body('photo').optional().isString().isLength({ max: 10000000 }).withMessage('Photo must be a valid URL or base64 string (max 10MB)'),
      processValidationErrors
    ],
    
    // Profile update validation (no ID parameter required)
    updateProfile: [
      body('username').optional().trim().isLength({ min: 3, max: 30 }),
      body('email').optional().trim().isEmail().normalizeEmail(),
      body('password').optional().isLength({ min: 6 }),
      body('role').optional().isIn(['admin', 'reception', 'nurse', 'lab', 'imaging', 'doctor', 'billing', 'inventory']),
      body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
      body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
      body('photo').optional().isString().isLength({ max: 10000000 }).withMessage('Photo must be a valid URL or base64 string (max 10MB)'),
      body('currentPassword').optional().isString().withMessage('Current password is required for password changes'),
      body('newPassword').optional().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
      processValidationErrors
    ],
    
    login: [
      body('identifier').trim().notEmpty().withMessage('Email or username is required'),
      body('password').notEmpty().withMessage('Password is required'),
      processValidationErrors
    ]
  },
  
  patient: {
    create: [
      validationRules.firstName,
      validationRules.lastName,
      body('age').isInt({ min: 0, max: 120 }).withMessage('Please provide a valid age between 0 and 120'),
      body('gender').isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
      validationRules.phone,
      body('email').optional({ checkFalsy: true }).isEmail().withMessage('Please provide a valid email'),
      body('address').optional().isString().withMessage('Address must be a string'),
      processValidationErrors
    ],
    
    update: [
      validationRules.id,
      body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
      body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
      body('age').optional().isInt({ min: 0, max: 120 }),
      body('gender').optional().isIn(['male', 'female', 'other']),
      body('phone').optional().matches(/^\+?[0-9]{10,15}$/),
      body('email').optional().isEmail(),
      body('address').optional().isString(),
      processValidationErrors
    ]
  },
  
  appointment: {
    create: [
      body('patientId').isMongoId().withMessage('Valid patient ID is required'),
      body('doctorId').isMongoId().withMessage('Valid doctor ID is required'),
      body('date').isISO8601().withMessage('Please provide a valid date'),
      body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Time must be in HH:MM format'),
      body('duration').isInt({ min: 5 }).withMessage('Duration must be at least 5 minutes'),
      body('service').isString().notEmpty().withMessage('Service is required'),
      body('notes').optional().isString(),
      processValidationErrors
    ],
    
    update: [
      validationRules.id,
      body('patientId').optional().isMongoId(),
      body('doctorId').optional().isMongoId(),
      body('date').optional().isISO8601(),
      body('time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      body('duration').optional().isInt({ min: 5 }),
      body('status').optional().isIn(['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show']),
      body('notes').optional().isString(),
      processValidationErrors
    ]
  },
  
  medicalRecord: {
    create: [
      validationRules.patientIdBody,
      validationRules.visitId,
      // Record type validation
      body('recordType')
        .optional()
        .isIn(['consultation', 'regular', 'emergency', 'follow-up'])
        .withMessage('Record type must be one of: consultation, regular, emergency, follow-up'),
      // Relaxed chief complaint validation for creation
      body('chiefComplaint.description')
        .notEmpty()
        .withMessage('Chief complaint description is required')
        .trim(),
      body('chiefComplaint.duration').optional().trim(),
      body('chiefComplaint.severity').optional().isIn(['Mild', 'Moderate', 'Severe', 'Very Severe']),
      body('chiefComplaint.onsetPattern').optional().isIn(['Acute', 'Subacute', 'Chronic', 'Gradual', 'Sudden']),
      body('chiefComplaint.progression').optional().isIn(['Improving', 'Stable', 'Worsening', 'Fluctuating']),
      body('chiefComplaint.location').optional().trim(),
      body('chiefComplaint.aggravatingFactors').optional().isArray(),
      body('chiefComplaint.relievingFactors').optional().isArray(),
      body('chiefComplaint.associatedSymptoms').optional().isArray(),
      body('chiefComplaint.impactOnDailyLife').optional().isIn(['None', 'Mild', 'Moderate', 'Severe', '']),
      body('chiefComplaint.previousEpisodes').optional().isBoolean(),
      body('chiefComplaint.previousEpisodesDetails').optional().trim(),
      body('diagnosis').optional().isString().withMessage('Diagnosis must be a string'),
      validationRules.vitalSigns,
      validationRules.plan,
      validationRules.notes,
      processValidationErrors
    ],
    
    update: [
      validationRules.id,
      body('patient').optional().isMongoId(),
      body('visit').optional().isMongoId(),
      body('chiefComplaint.description').optional().notEmpty().trim(),
      body('diagnosis').optional().isString(),
      body('vitalSigns').optional().isObject(),
      body('plan').optional().isString().trim(),
      body('notes').optional().isString().trim(),
      processValidationErrors
    ],
    
    getById: [
      validationRules.id,
      processValidationErrors
    ],
    
    getByPatient: [
      validationRules.patientId,
      validationRules.page,
      validationRules.limit,
      processValidationErrors
    ]
  },
  
  // Generic ID validation (for GET, DELETE operations)
  id: [
    validationRules.id,
    processValidationErrors
  ],
  
  // Pagination validation
  pagination: [
    validationRules.page,
    validationRules.limit,
    processValidationErrors
  ]
};

module.exports = {
  validate,
  validationRules,
  processValidationErrors
}; 
