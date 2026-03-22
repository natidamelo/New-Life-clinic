/**
 * Payment Status Utility
 * 
 * Centralized utility for managing payment statuses across the system
 * to ensure consistency and prevent enum mismatches.
 */

class PaymentStatusUtils {
  
  // Standard payment status values
  static STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    PARTIAL: 'partial',
    CANCELLED: 'cancelled',
    OVERDUE: 'overdue',
    DISPUTED: 'disputed'
  };
  
  // Standard payment authorization status values
  static PAYMENT_AUTH_STATUS = {
    UNPAID: 'unpaid',
    PARTIAL: 'partial',
    FULLY_PAID: 'fully_paid',
    OVERPAID: 'overpaid'
  };
  
  // Standard transaction status values
  static TRANSACTION_STATUS = {
    COMPLETED: 'completed',
    PENDING: 'pending',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    PARTIALLY_REFUNDED: 'partially_refunded'
  };
  
  /**
   * Determine invoice status based on balance and amount paid
   * @param {number} balance - Current balance
   * @param {number} amountPaid - Amount paid
   * @param {Date} dueDate - Due date (optional)
   * @returns {string} Standardized status
   */
  static determineInvoiceStatus(balance, amountPaid, dueDate = null) {
    if (balance <= 0 && amountPaid > 0) {
      return this.STATUS.PAID;
    } else if (amountPaid > 0 && balance > 0) {
      return this.STATUS.PARTIAL;
    } else if (balance > 0 && dueDate && new Date() > dueDate) {
      return this.STATUS.OVERDUE;
    } else {
      return this.STATUS.PENDING;
    }
  }
  
  /**
   * Determine payment authorization status based on amount paid and total cost
   * @param {number} amountPaid - Amount paid
   * @param {number} totalCost - Total cost
   * @returns {string} Standardized payment authorization status
   */
  static determinePaymentAuthStatus(amountPaid, totalCost) {
    if (amountPaid <= 0) {
      return this.PAYMENT_AUTH_STATUS.UNPAID;
    } else if (amountPaid >= totalCost) {
      return this.PAYMENT_AUTH_STATUS.FULLY_PAID;
    } else {
      return this.PAYMENT_AUTH_STATUS.PARTIAL;
    }
  }
  
  /**
   * Normalize status value to standard enum
   * @param {string} status - Status to normalize
   * @param {string} type - Type of status ('invoice', 'payment', 'transaction')
   * @returns {string} Normalized status
   */
  static normalizeStatus(status, type = 'invoice') {
    if (!status) return this.STATUS.PENDING;
    
    const normalizedStatus = status.toLowerCase().trim();
    
    switch (type) {
      case 'invoice':
        // Map old values to new standard values
        const invoiceMapping = {
          'partially_paid': this.STATUS.PARTIAL,
          'fully_paid': this.STATUS.PAID,
          'unpaid': this.STATUS.PENDING
        };
        return invoiceMapping[normalizedStatus] || normalizedStatus;
        
      case 'payment':
        // Map old values to new standard values
        const paymentMapping = {
          'partially_paid': this.PAYMENT_AUTH_STATUS.PARTIAL,
          'fully_paid': this.PAYMENT_AUTH_STATUS.FULLY_PAID,
          'unpaid': this.PAYMENT_AUTH_STATUS.UNPAID
        };
        return paymentMapping[normalizedStatus] || normalizedStatus;
        
      case 'transaction':
        // Map old values to new standard values
        const transactionMapping = {
          'completed': this.TRANSACTION_STATUS.COMPLETED,
          'pending': this.TRANSACTION_STATUS.PENDING,
          'failed': this.TRANSACTION_STATUS.FAILED,
          'refunded': this.TRANSACTION_STATUS.REFUNDED,
          'partiallyrefunded': this.TRANSACTION_STATUS.PARTIALLY_REFUNDED
        };
        return transactionMapping[normalizedStatus] || normalizedStatus;
        
      default:
        return normalizedStatus;
    }
  }
  
  /**
   * Validate status value against allowed enum
   * @param {string} status - Status to validate
   * @param {string} type - Type of status ('invoice', 'payment', 'transaction')
   * @returns {boolean} Whether status is valid
   */
  static isValidStatus(status, type = 'invoice') {
    if (!status) return false;
    
    const normalizedStatus = this.normalizeStatus(status, type);
    
    switch (type) {
      case 'invoice':
        return Object.values(this.STATUS).includes(normalizedStatus);
      case 'payment':
        return Object.values(this.PAYMENT_AUTH_STATUS).includes(normalizedStatus);
      case 'transaction':
        return Object.values(this.TRANSACTION_STATUS).includes(normalizedStatus);
      default:
        return false;
    }
  }
  
  /**
   * Get payment percentage
   * @param {number} amountPaid - Amount paid
   * @param {number} totalCost - Total cost
   * @returns {number} Payment percentage (0-100)
   */
  static getPaymentPercentage(amountPaid, totalCost) {
    if (totalCost <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((amountPaid / totalCost) * 100)));
  }
}

module.exports = PaymentStatusUtils;
