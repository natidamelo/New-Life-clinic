/**
 * Payment Status Normalizer
 * 
 * Ensures consistent payment status values across the entire system
 * This prevents the "invoice paid but nurse task unpaid" issue
 */

class PaymentStatusNormalizer {
  // Standard payment status values used throughout the system
  static STATUS = {
    UNPAID: 'unpaid',
    PARTIAL: 'partial', 
    FULLY_PAID: 'fully_paid',
    PAYMENT_REQUIRED: 'payment_required'
  };

  // Legacy status mappings for backward compatibility
  static LEGACY_MAPPINGS = {
    'paid': 'fully_paid',
    'partially_paid': 'partial',
    'pending': 'unpaid',
    'complete': 'fully_paid'
  };

  /**
   * Normalize payment status to standard values
   */
  static normalize(status) {
    if (!status) return this.STATUS.UNPAID;
    
    const normalized = status.toLowerCase().trim();
    
    // Check if it's already a standard status
    if (Object.values(this.STATUS).includes(normalized)) {
      return normalized;
    }
    
    // Check legacy mappings
    if (this.LEGACY_MAPPINGS[normalized]) {
      return this.LEGACY_MAPPINGS[normalized];
    }
    
    // Default to unpaid for unknown statuses
    console.warn(`⚠️ [PAYMENT NORMALIZER] Unknown payment status: ${status}, defaulting to unpaid`);
    return this.STATUS.UNPAID;
  }

  /**
   * Check if a payment status indicates payment has been made
   */
  static isPaid(status) {
    const normalized = this.normalize(status);
    return normalized === this.STATUS.FULLY_PAID || normalized === this.STATUS.PARTIAL;
  }

  /**
   * Check if a payment status indicates full payment
   */
  static isFullyPaid(status) {
    return this.normalize(status) === this.STATUS.FULLY_PAID;
  }

  /**
   * Check if a payment status indicates partial payment
   */
  static isPartial(status) {
    return this.normalize(status) === this.STATUS.PARTIAL;
  }

  /**
   * Check if a payment status indicates no payment
   */
  static isUnpaid(status) {
    return this.normalize(status) === this.STATUS.UNPAID;
  }

  /**
   * Get the appropriate payment status based on amount paid vs total
   */
  static calculateStatus(amountPaid, totalAmount) {
    if (!amountPaid || amountPaid <= 0) {
      return this.STATUS.UNPAID;
    }
    
    if (amountPaid >= totalAmount || Math.abs(amountPaid - totalAmount) < 0.01) {
      return this.STATUS.FULLY_PAID;
    }
    
    return this.STATUS.PARTIAL;
  }

  /**
   * Validate that a payment status is valid
   */
  static isValid(status) {
    return Object.values(this.STATUS).includes(this.normalize(status));
  }
}

module.exports = PaymentStatusNormalizer;
