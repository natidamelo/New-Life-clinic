/**
 * Medication Pricing Middleware
 * 
 * This middleware automatically validates medication pricing and prevents
 * hardcoded prices from being used in the system.
 */

const MedicationPricingService = require('../utils/medicationPricingService');

/**
 * Middleware to validate medication pricing before processing
 */
const validateMedicationPricing = async (req, res, next) => {
  try {
    const { medicationName, unitPrice } = req.body;
    
    // Skip validation if no medication data
    if (!medicationName) {
      return next();
    }
    
    // Validate that the medication has proper pricing
    const validation = await MedicationPricingService.validateMedicationPricing(medicationName);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Medication pricing validation failed',
        error: validation.error,
        medicationName,
        requiredAction: 'Add this medication to BillableItems or Inventory with proper pricing'
      });
    }
    
    // If a unitPrice is provided in the request, validate it matches the database
    if (unitPrice && unitPrice !== validation.price) {
      console.warn(`⚠️ [PRICING MIDDLEWARE] Price mismatch for ${medicationName}: Requested ${unitPrice}, Database ${validation.price}`);
      
      // Auto-correct the price to match the database
      req.body.unitPrice = validation.price;
      req.body.priceSource = validation.source;
      
      console.log(`✅ [PRICING MIDDLEWARE] Auto-corrected price for ${medicationName}: ${unitPrice} → ${validation.price}`);
    }
    
    // Add pricing info to request for logging
    req.medicationPricing = {
      name: medicationName,
      price: validation.price,
      source: validation.source
    };
    
    next();
  } catch (error) {
    console.error('❌ [PRICING MIDDLEWARE] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Medication pricing validation error',
      error: error.message
    });
  }
};

/**
 * Middleware to log medication pricing usage
 */
const logMedicationPricing = (req, res, next) => {
  if (req.medicationPricing) {
    console.log(`💰 [PRICING LOG] ${req.medicationPricing.name}: ETB ${req.medicationPricing.price} (${req.medicationPricing.source})`);
  }
  next();
};

/**
 * Middleware to ensure BillableItems exist for medications
 */
const ensureBillableItemsExist = async (req, res, next) => {
  try {
    const { medicationName, unitPrice } = req.body;
    
    if (medicationName && unitPrice) {
      // Ensure BillableItem exists for this medication
      await MedicationPricingService.ensureBillableItemExists(medicationName, unitPrice);
      console.log(`✅ [PRICING MIDDLEWARE] Ensured BillableItem exists for ${medicationName}`);
    }
    
    next();
  } catch (error) {
    console.error('❌ [PRICING MIDDLEWARE] Error ensuring BillableItem:', error);
    next(); // Don't block the request, just log the error
  }
};

module.exports = {
  validateMedicationPricing,
  logMedicationPricing,
  ensureBillableItemsExist
};

