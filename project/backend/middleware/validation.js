const { body, validationResult } = require('express-validator');

// Validation middleware to check for errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUser = [
  body('mobile')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please enter a valid 10-digit mobile number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('role')
    .isIn(['admin', 'salesman', 'customer'])
    .withMessage('Role must be admin, salesman, or customer'),
  handleValidationErrors
];

// Customer validation rules
const validateCustomer = [
  body('address')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Address must be between 10 and 500 characters'),
  body('gstNumber')
    .optional()
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .withMessage('Please enter a valid GST number'),
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),
  handleValidationErrors
];

// Product validation rules
const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  body('companyId')
    .isMongoId()
    .withMessage('Please provide a valid company ID'),
  body('mrp')
    .isFloat({ min: 0 })
    .withMessage('MRP must be a positive number'),
  body('saleRate')
    .isFloat({ min: 0 })
    .withMessage('Sale rate must be a positive number'),
  body('gstRate')
    .isFloat({ min: 0, max: 100 })
    .withMessage('GST rate must be between 0 and 100'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('unit')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Unit must be between 1 and 50 characters'),
  handleValidationErrors
];

// Order validation rules
const validateOrder = [
  body('customerId')
    .isMongoId()
    .withMessage('Please provide a valid customer ID'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.productId')
    .isMongoId()
    .withMessage('Please provide valid product IDs'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('items.*.rate')
    .isFloat({ min: 0 })
    .withMessage('Rate must be a positive number'),
  handleValidationErrors
];

// Collection validation rules
const validateCollection = [
  body('customerId')
    .isMongoId()
    .withMessage('Please provide a valid customer ID'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('paymentMode')
    .isIn(['cash', 'cheque', 'upi', 'bank_transfer', 'card'])
    .withMessage('Invalid payment mode'),
  handleValidationErrors
];

module.exports = {
  validateUser,
  validateCustomer,
  validateProduct,
  validateOrder,
  validateCollection,
  handleValidationErrors
};