const { body, query, param, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Middleware to handle validation results
 * Returns 400 with validation errors if validation fails
 */
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
      value: err.value,
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages,
    });
  }
  
  next();
};

/**
 * Validation rules for creating a new complaint
 */
const createComplaintValidation = [
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters')
    .escape(), // Sanitize to prevent XSS
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[\d\s-]{10,15}$/)
    .withMessage('Please provide a valid phone number (10-15 digits)'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters')
    .escape(),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('latitude')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('longitude')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters')
    .escape(),
  
  body('source')
    .optional()
    .isIn(['web', 'mobile', 'whatsapp', 'voice'])
    .withMessage('Invalid source. Must be one of: web, mobile, whatsapp, voice'),
  
  handleValidation,
];

/**
 * Validation rules for fetching complaints with filters
 */
const getComplaintsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  
  query('category')
    .optional()
    .isIn(['Roads', 'Water', 'Garbage', 'Electricity', 'Others'])
    .withMessage('Invalid category'),
  
  query('status')
    .optional()
    .isIn(['reported', 'acknowledged', 'in_progress', 'resolved', 'closed', 'rejected'])
    .withMessage('Invalid status'),
  
  query('area')
    .optional()
    .trim()
    .escape(),
  
  query('ward')
    .optional()
    .trim()
    .escape(),
  
  query('severity_min')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Severity min must be between 1 and 10')
    .toInt(),
  
  query('severity_max')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Severity max must be between 1 and 10')
    .toInt(),
  
  query('date_from')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format. Use ISO 8601 format')
    .toDate(),
  
  query('date_to')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format. Use ISO 8601 format')
    .toDate(),
  
  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90')
    .toFloat(),
  
  query('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
    .toFloat(),
  
  query('radius')
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage('Radius must be between 100 and 50000 meters')
    .toInt(),
  
  query('sort_by')
    .optional()
    .isIn(['createdAt', 'severity', 'status'])
    .withMessage('Invalid sort field'),
  
  query('sort_order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  handleValidation,
];

/**
 * Validation rules for getting a single complaint by ID
 */
const getComplaintByIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Complaint ID is required')
    .custom((value) => {
      // Accept either MongoDB ObjectId or our custom complaintId format
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(value);
      const isComplaintId = /^CL-\d{8}-\d{5}$/.test(value);
      if (!isObjectId && !isComplaintId) {
        throw new Error('Invalid complaint ID format');
      }
      return true;
    }),
  
  handleValidation,
];

/**
 * Validation rules for updating complaint status
 */
const updateStatusValidation = [
  param('id')
    .notEmpty()
    .withMessage('Complaint ID is required'),
  
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['acknowledged', 'in_progress', 'resolved', 'closed', 'rejected'])
    .withMessage('Invalid status'),
  
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks cannot exceed 500 characters')
    .escape(),
  
  handleValidation,
];

/**
 * Validation rules for stats/heatmap queries
 */
const statsValidation = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
    .toInt(),
  
  query('category')
    .optional()
    .isIn(['Roads', 'Water', 'Garbage', 'Electricity', 'Others'])
    .withMessage('Invalid category'),
  
  handleValidation,
];

module.exports = {
  handleValidation,
  createComplaintValidation,
  getComplaintsValidation,
  getComplaintByIdValidation,
  updateStatusValidation,
  statsValidation,
};
