const { body, validationResult } = require('express-validator');

/**
 * Invoice Validation Middleware
 * Prevents zero pricing and ensures proper medication pricing from inventory
 */

// Validation rules for invoice creation
const invoiceValidationRules = [
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.unitPrice').isFloat({ min: 0.01 }).withMessage('Unit price must be greater than 0'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.total').isFloat({ min: 0.01 }).withMessage('Item total must be greater than 0'),
  body('total').isFloat({ min: 0.01 }).withMessage('Invoice total must be greater than 0'),
  body('patientId').notEmpty().withMessage('Patient ID is required'),
  body('invoiceNumber').notEmpty().withMessage('Invoice number is required')
];

// Validation rules for medication invoices specifically
const medicationInvoiceValidationRules = [
  ...invoiceValidationRules,
  body('items.*.description').notEmpty().withMessage('Item description is required'),
  body('items.*.serviceName').notEmpty().withMessage('Service name is required for medication items')
];

/**
 * Validate invoice data and ensure proper pricing
 */
const validateInvoiceData = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Invoice validation failed',
        errors: errors.array() 
      });
    }

    const { items, total } = req.body;

    // Additional validation for zero pricing
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice must contain at least one item'
      });
    }

    // Check for zero pricing issues
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (!item.unitPrice || item.unitPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1} has invalid unit price: ${item.unitPrice}. Unit price must be greater than 0.`,
          itemIndex: i,
          itemDescription: item.description
        });
      }

      if (!item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1} has invalid quantity: ${item.quantity}. Quantity must be greater than 0.`,
          itemIndex: i,
          itemDescription: item.description
        });
      }

      if (!item.total || item.total <= 0) {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1} has invalid total: ${item.total}. Item total must be greater than 0.`,
          itemIndex: i,
          itemDescription: item.description
        });
      }

      // Verify item total matches unit price × quantity
      const expectedTotal = item.unitPrice * item.quantity;
      if (Math.abs(item.total - expectedTotal) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Item ${i + 1} total mismatch. Expected: ${expectedTotal}, Got: ${item.total}`,
          itemIndex: i,
          itemDescription: item.description,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          expectedTotal,
          actualTotal: item.total
        });
      }
    }

    // Verify invoice total matches sum of items
    const calculatedTotal = items.reduce((sum, item) => sum + item.total, 0);
    if (Math.abs(total - calculatedTotal) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Invoice total mismatch. Expected: ${calculatedTotal}, Got: ${total}`,
        calculatedTotal,
        providedTotal: total
      });
    }

    next();
  } catch (error) {
    console.error('Invoice validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Invoice validation failed due to server error'
    });
  }
};

/**
 * Validate medication pricing against inventory
 */
const validateMedicationPricing = async (req, res, next) => {
  try {
    const { items } = req.body;
    
    if (!items || items.length === 0) {
      return next();
    }

    const db = req.app.locals.db || require('../config/database');
    const inventoryItemsCollection = db.collection('inventoryitems');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Check if this is a medication item
      if (item.itemType === 'medication' || 
          (item.description && item.description.toLowerCase().includes('medication')) ||
          (item.serviceName && item.serviceName.toLowerCase().includes('medication'))) {
        
        // Extract medication name from description or service name
        const medicationName = item.serviceName || 
                             item.description?.replace('Medication: ', '') ||
                             item.name;
        
        if (medicationName) {
          // Check inventory for this medication
          const inventoryItem = await inventoryItemsCollection.findOne({
            name: { $regex: new RegExp(medicationName, 'i') }
          });

          if (inventoryItem) {
            // Compare pricing
            if (Math.abs(item.unitPrice - inventoryItem.sellingPrice) > 0.01) {
              console.warn(`Pricing mismatch for ${medicationName}: Inventory price: ${inventoryItem.sellingPrice}, Invoice price: ${item.unitPrice}`);
              
              // Auto-correct the pricing
              item.unitPrice = inventoryItem.sellingPrice;
              item.total = item.unitPrice * item.quantity;
              item.totalPrice = item.total;
              
              console.log(`Auto-corrected pricing for ${medicationName} to ${inventoryItem.sellingPrice} ETB`);
            }
          } else {
            console.warn(`Medication ${medicationName} not found in inventory`);
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error('Medication pricing validation error:', error);
    // Don't fail the request, just log the error
    next();
  }
};

/**
 * Pre-save hook validation for MedicalInvoice model
 */
const validateInvoiceBeforeSave = async (invoice) => {
  const errors = [];

  // Validate items
  if (!invoice.items || invoice.items.length === 0) {
    errors.push('Invoice must contain at least one item');
  } else {
    invoice.items.forEach((item, index) => {
      if (!item.unitPrice || item.unitPrice <= 0) {
        errors.push(`Item ${index + 1} has invalid unit price: ${item.unitPrice}`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1} has invalid quantity: ${item.quantity}`);
      }
      if (!item.total || item.total <= 0) {
        errors.push(`Item ${index + 1} has invalid total: ${item.total}`);
      }
    });
  }

  // Validate invoice total
  if (!invoice.total || invoice.total <= 0) {
    errors.push(`Invoice total must be greater than 0, got: ${invoice.total}`);
  }

  if (errors.length > 0) {
    throw new Error(`Invoice validation failed: ${errors.join(', ')}`);
  }

  return true;
};

module.exports = {
  invoiceValidationRules,
  medicationInvoiceValidationRules,
  validateInvoiceData,
  validateMedicationPricing,
  validateInvoiceBeforeSave
};
