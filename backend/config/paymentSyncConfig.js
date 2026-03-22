// Payment Synchronization Configuration
// This ensures all payments are automatically synchronized

module.exports = {
  // Enable automatic payment synchronization
  ENABLE_PAYMENT_SYNC: true,
  
  // Sync payment status between:
  SYNC_INVOICE_TO_PRESCRIPTION: true,
  SYNC_PRESCRIPTION_TO_NURSE_TASK: true,
  
  // Payment statuses that allow medication administration
  ALLOW_ADMINISTRATION_STATUSES: ['fully_paid', 'partial'],
  
  // Minimum payment percentage to allow partial administration
  MIN_PAYMENT_PERCENTAGE: 0.1, // 10%
  
  // Auto-sync existing payments on system startup
  SYNC_EXISTING_ON_STARTUP: true,
  
  // Log all payment sync operations
  LOG_PAYMENT_SYNC: true
};
